import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { pingServer, markBackendReachable } from '../services/api'
import { useSocket } from './SocketContext'

const ConnectionHealthContext = createContext(null)

// States: 'connected' | 'reconnecting' | 'waking' | 'offline'
//
// Design principles:
//   1. Start optimistic ('connected'). No banner flash on first paint.
//   2. If the socket is connected, we are connected. Period.
//   3. Only flip to 'reconnecting'/'waking' after MIN_FAILURES consecutive
//      ping failures *and* the socket is not connected, AND the initial
//      grace window has elapsed (covers Render cold-start on mobile).
//   4. When connection is restored (socket connects OR ping succeeds),
//      immediately clear the banner.
//   5. On visibility-change back to the page, ALWAYS reset optimistically
//      first — this is what prevents the banner from getting permanently
//      stuck after the phone wakes the tab from background suspension.
//   6. Transport errors during the grace window are IGNORED — they are
//      expected noise from cold-start polling timeouts and must not count
//      toward the banner threshold.

const BACKOFF_SCHEDULE = [2000, 4000, 8000, 12000, 15000]
const MIN_FAILURES_BEFORE_BANNER = 3

// 45 s covers Render free-tier worst-case cold start (30–60 s).
// During this window NO banner is shown regardless of failures.
const INITIAL_GRACE_MS = 45000

// Hard ceiling: after this long in 'waking' with no activity, auto-reset
// to try again — prevents the banner from being stuck literally forever.
const MAX_WAKING_MS = 90000

export function ConnectionHealthProvider({ children }) {
  const [status, setStatus] = useState('connected')
  const [lastOk, setLastOk] = useState(null)
  const everConnectedRef = useRef(false)
  const intervalRef = useRef(null)
  const failureCountRef = useRef(0)
  const mountedRef = useRef(true)
  const checkingRef = useRef(false)
  const socketConnectedRef = useRef(false)
  const mountedAtRef = useRef(Date.now())
  // Tracks when we entered 'waking' state so the hard ceiling can fire
  const wakingStartRef = useRef(null)

  const { socket, isConnected: socketConnected } = useSocket()

  // ── Socket state → health state ────────────────────────────────────────
  // Socket connection is the strongest "we have a working link" signal.
  // Always clear the banner the moment the socket connects.
  useEffect(() => {
    socketConnectedRef.current = Boolean(socketConnected)
    if (socketConnected) {
      everConnectedRef.current = true
      failureCountRef.current = 0
      wakingStartRef.current = null
      markBackendReachable()
      setStatus('connected')
      setLastOk(Date.now())
    }
  }, [socketConnected])

  // ── Low-level Engine.IO events ──────────────────────────────────────────
  // A successful polling handshake or any transport-level "open" means the
  // backend is reachable even if the axios /api/ping is still in-flight.
  // This is the event that clears the banner on mobile after cold-start.
  useEffect(() => {
    if (!socket) return undefined

    const onActivity = () => {
      everConnectedRef.current = true
      failureCountRef.current = 0
      wakingStartRef.current = null
      markBackendReachable()
      if (mountedRef.current) {
        setStatus('connected')
        setLastOk(Date.now())
      }
    }

    const onTransportError = () => {
      // CRITICAL: ignore errors that happen inside the initial grace window.
      // These are expected cold-start polling timeouts and must NOT push the
      // failure count past the banner threshold.
      if (Date.now() - mountedAtRef.current < INITIAL_GRACE_MS) return
      failureCountRef.current = Math.min(
        failureCountRef.current + 1,
        MIN_FAILURES_BEFORE_BANNER + 2,
      )
    }

    socket.on('connect', onActivity)
    socket.on('reconnect', onActivity)
    socket.io?.on?.('reconnect', onActivity)
    socket.io?.on?.('open', onActivity)
    socket.io?.on?.('error', onTransportError)
    socket.on('connect_error', onTransportError)

    return () => {
      socket.off('connect', onActivity)
      socket.off('reconnect', onActivity)
      socket.io?.off?.('reconnect', onActivity)
      socket.io?.off?.('open', onActivity)
      socket.io?.off?.('error', onTransportError)
      socket.off('connect_error', onTransportError)
    }
  }, [socket])

  // ── Ping-based health check ─────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true

    try {
      const result = await pingServer()

      if (!mountedRef.current) return

      if (result.ok) {
        everConnectedRef.current = true
        failureCountRef.current = 0
        wakingStartRef.current = null
        setStatus('connected')
        setLastOk(Date.now())
      } else {
        failureCountRef.current += 1
        // Suppress banner when socket is alive — that link is the source of truth.
        if (socketConnectedRef.current) return
        if (failureCountRef.current < MIN_FAILURES_BEFORE_BANNER) return
        // Hold banner during the initial grace window.
        if (Date.now() - mountedAtRef.current < INITIAL_GRACE_MS) return
        const nextStatus = everConnectedRef.current ? 'reconnecting' : 'waking'
        if (nextStatus === 'waking' && wakingStartRef.current === null) {
          wakingStartRef.current = Date.now()
        }
        setStatus(nextStatus)
      }
    } catch {
      if (!mountedRef.current) return
      failureCountRef.current += 1
      if (socketConnectedRef.current) return
      if (failureCountRef.current < MIN_FAILURES_BEFORE_BANNER) return
      if (Date.now() - mountedAtRef.current < INITIAL_GRACE_MS) return
      const nextStatus = everConnectedRef.current ? 'reconnecting' : 'waking'
      if (nextStatus === 'waking' && wakingStartRef.current === null) {
        wakingStartRef.current = Date.now()
      }
      setStatus(nextStatus)
    } finally {
      checkingRef.current = false
    }
  }, [])

  // ── Scheduling loop ─────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    void checkHealth()

    function scheduleNext() {
      if (intervalRef.current) clearTimeout(intervalRef.current)

      let delay
      if (everConnectedRef.current && failureCountRef.current === 0) {
        delay = 25000
      } else {
        const idx = Math.min(failureCountRef.current, BACKOFF_SCHEDULE.length - 1)
        delay = BACKOFF_SCHEDULE[idx] || 15000
      }

      intervalRef.current = setTimeout(async () => {
        if (!mountedRef.current) return

        // Hard ceiling: if we've been stuck in 'waking' for MAX_WAKING_MS,
        // reset the failure count so the next successful ping clears cleanly.
        if (
          wakingStartRef.current !== null &&
          Date.now() - wakingStartRef.current > MAX_WAKING_MS
        ) {
          failureCountRef.current = 0
          wakingStartRef.current = null
          // Optimistically clear so user isn't permanently stuck
          setStatus('connected')
        }

        await checkHealth()
        scheduleNext()
      }, delay)
    }

    scheduleNext()

    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [checkHealth])

  // ── Browser events ──────────────────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // KEY FIX: Always reset optimistically when the user focuses the tab.
        //
        // Without this, if the phone suspended the tab while the banner was
        // showing 'waking', the banner is permanently stuck because checkHealth
        // alone won't clear it until it succeeds — but by then the user has
        // already given up.
        //
        // With this: focusing the tab immediately clears the banner and
        // checkHealth() re-shows it within a few seconds only if the server
        // is genuinely unreachable. If the server is up (the common case after
        // PC has already woken it), the banner stays clear.
        failureCountRef.current = 0
        wakingStartRef.current = null
        setStatus('connected')
        void checkHealth()
      }
    }

    function onOnline() {
      // Browser says we're back online — immediately reset and verify
      failureCountRef.current = 0
      wakingStartRef.current = null
      setStatus('connected')
      void checkHealth()
    }

    function onOffline() {
      // Only trust the browser's offline event if the socket also looks dead —
      // some mobile browsers fire false offline events on screen lock.
      if (!socketConnectedRef.current) {
        setStatus('offline')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [checkHealth])

  const forceCheck = useCallback(() => {
    failureCountRef.current = 0
    wakingStartRef.current = null
    setStatus('connected')
    void checkHealth()
  }, [checkHealth])

  return (
    <ConnectionHealthContext.Provider value={{ status, lastOk, forceCheck }}>
      {children}
    </ConnectionHealthContext.Provider>
  )
}

export function useConnectionHealth() {
  return useContext(ConnectionHealthContext) || { status: 'connected', lastOk: null, forceCheck: () => {} }
}

// States: 'connected' | 'reconnecting' | 'waking' | 'offline'
//
// Design principles:
//   1. Start optimistic ('connected'). No banner flash on first paint.
//   2. If the socket is connected, we are connected. Period.
//   3. Only flip to 'reconnecting'/'waking' after MIN_FAILURES consecutive
//      ping failures *and* the socket is not connected, AND the initial
//      grace window has elapsed (covers Render cold-start on mobile).
//   4. When connection is restored (socket connects OR ping succeeds),
//      immediately clear the banner.
//   5. On visibility-change back to the page, ALWAYS reset optimistically
//      first — this is what prevents the banner from getting permanently
//      stuck after the phone wakes the tab from background suspension.
//   6. Transport errors during the grace window are IGNORED — they are
//      expected noise from cold-start polling timeouts and must not count
//      toward the banner threshold.

const BACKOFF_SCHEDULE = [2000, 4000, 8000, 12000, 15000]
const MIN_FAILURES_BEFORE_BANNER = 3

// 45 s covers Render free-tier worst-case cold start (30–60 s).
// During this window NO banner is shown regardless of failures.
const INITIAL_GRACE_MS = 45000

// Hard ceiling: after this long in 'waking' with no activity, auto-reset
// to try again — prevents the banner from being stuck literally forever.
const MAX_WAKING_MS = 90000

export function ConnectionHealthProvider({ children }) {
  const [status, setStatus] = useState('connected')
  const [lastOk, setLastOk] = useState(null)
  const everConnectedRef = useRef(false)
  const intervalRef = useRef(null)
  const failureCountRef = useRef(0)
  const mountedRef = useRef(true)
  const checkingRef = useRef(false)
  const socketConnectedRef = useRef(false)
  const mountedAtRef = useRef(Date.now())
  // Tracks when we entered 'waking' state so the hard ceiling can fire
  const wakingStartRef = useRef(null)

  const { socket, isConnected: socketConnected } = useSocket()

  // ── Socket state → health state ──────────────────────────────────────
  // Socket connection is the strongest "we have a working link" signal.
  // Always clear the banner the moment the socket connects.
  useEffect(() => {
    socketConnectedRef.current = Boolean(socketConnected)
    if (socketConnected) {
      everConnectedRef.current = true
      failureCountRef.current = 0
      wakingStartRef.current = null
      markBackendReachable()
      setStatus('connected')
      setLastOk(Date.now())
    }
  }, [socketConnected])

  // ── Low-level Engine.IO events ──────────────────────────────────────────
  // A successful polling handshake or any transport-level "open" means the
  // backend is reachable even if the axios /api/ping is still in-flight.
  // This is the event that clears the banner on mobile after cold-start.
  useEffect(() => {
    if (!socket) return undefined

    const onActivity = () => {
      everConnectedRef.current = true
      failureCountRef.current = 0
      wakingStartRef.current = null
      markBackendReachable()
      if (mountedRef.current) {
        setStatus('connected')
        setLastOk(Date.now())
      }
    }

    const onTransportError = () => {
      // CRITICAL: ignore errors that happen inside the initial grace window.
      // These are expected cold-start polling timeouts and must NOT push the
      // failure count past the banner threshold.
      if (Date.now() - mountedAtRef.current < INITIAL_GRACE_MS) return
      failureCountRef.current = Math.min(
        failureCountRef.current + 1,
        MIN_FAILURES_BEFORE_BANNER + 2,
      )
    }

    socket.on('connect', onActivity)
    socket.on('reconnect', onActivity)
    socket.io?.on?.('reconnect', onActivity)
    socket.io?.on?.('open', onActivity)
    socket.io?.on?.('error', onTransportError)
    socket.on('connect_error', onTransportError)

    return () => {
      socket.off('connect', onActivity)
      socket.off('reconnect', onActivity)
      socket.io?.off?.('reconnect', onActivity)
      socket.io?.off?.('open', onActivity)
      socket.io?.off?.('error', onTransportError)
      socket.off('connect_error', onTransportError)
    }
  }, [socket])

  // ── Ping-based health check ─────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true

    try {
      const result = await pingServer()

      if (!mountedRef.current) return

      if (result.ok) {
        everConnectedRef.current = true
        failureCountRef.current = 0
        wakingStartRef.current = null
        setStatus('connected')
        setLastOk(Date.now())
      } else {
        failureCountRef.current += 1
        // Suppress banner when socket is alive — that link is the source of truth.
        if (socketConnectedRef.current) return
        if (failureCountRef.current < MIN_FAILURES_BEFORE_BANNER) return
        // Hold banner during the initial grace window.
        if (Date.now() - mountedAtRef.current < INITIAL_GRACE_MS) return
        const nextStatus = everConnectedRef.current ? 'reconnecting' : 'waking'
        if (nextStatus === 'waking' && wakingStartRef.current === null) {
          wakingStartRef.current = Date.now()
        }
        setStatus(nextStatus)
      }
    } catch {
      if (!mountedRef.current) return
      failureCountRef.current += 1
      if (socketConnectedRef.current) return
      if (failureCountRef.current < MIN_FAILURES_BEFORE_BANNER) return
      if (Date.now() - mountedAtRef.current < INITIAL_GRACE_MS) return
      const nextStatus = everConnectedRef.current ? 'reconnecting' : 'waking'
      if (nextStatus === 'waking' && wakingStartRef.current === null) {
        wakingStartRef.current = Date.now()
      }
      setStatus(nextStatus)
    } finally {
      checkingRef.current = false
    }
  }, [])

  // ── Scheduling loop ─────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    void checkHealth()

    function scheduleNext() {
      if (intervalRef.current) clearTimeout(intervalRef.current)

      let delay
      if (everConnectedRef.current && failureCountRef.current === 0) {
        delay = 25000
      } else {
        const idx = Math.min(failureCountRef.current, BACKOFF_SCHEDULE.length - 1)
        delay = BACKOFF_SCHEDULE[idx] || 15000
      }

      intervalRef.current = setTimeout(async () => {
        if (!mountedRef.current) return

        // Hard ceiling: if we've been stuck in 'waking' for MAX_WAKING_MS,
        // reset the failure count so the next successful ping clears cleanly.
        if (
          wakingStartRef.current !== null &&
          Date.now() - wakingStartRef.current > MAX_WAKING_MS
        ) {
          failureCountRef.current = 0
          wakingStartRef.current = null
          // Optimistically clear so user isn't permanently stuck
          setStatus('connected')
        }

        await checkHealth()
        scheduleNext()
      }, delay)
    }

    scheduleNext()

    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [checkHealth])

  // ── Browser events ──────────────────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // KEY FIX: Always reset optimistically when the user focuses the tab.
        //
        // Without this, if the phone suspended the tab while the banner was
        // showing 'waking', the banner is permanently stuck because checkHealth
        // alone won't clear it until it succeeds — but by then the user has
        // already given up.
        //
        // With this: focusing the tab immediately clears the banner and
        // checkHealth() re-shows it within a few seconds only if the server
        // is genuinely unreachable. If the server is up (the common case after
        // PC has already woken it), the banner stays clear.
        failureCountRef.current = 0
        wakingStartRef.current = null
        setStatus('connected')
        void checkHealth()
      }
    }

    function onOnline() {
      // Browser says we're back online — immediately reset and verify
      failureCountRef.current = 0
      wakingStartRef.current = null
      setStatus('connected')
      void checkHealth()
    }

    function onOffline() {
      // Only trust the browser's offline event if the socket also looks dead —
      // some mobile browsers fire false offline events on screen lock.
      if (!socketConnectedRef.current) {
        setStatus('offline')
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [checkHealth])

  const forceCheck = useCallback(() => {
    failureCountRef.current = 0
    wakingStartRef.current = null
    setStatus('connected')
    void checkHealth()
  }, [checkHealth])

  return (
    <ConnectionHealthContext.Provider value={{ status, lastOk, forceCheck }}>
      {children}
    </ConnectionHealthContext.Provider>
  )
}

export function useConnectionHealth() {
  return useContext(ConnectionHealthContext) || { status: 'connected', lastOk: null, forceCheck: () => {} }
}
