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
//      ping failures *and* the socket is not connected, AND a grace period
//      has elapsed (so cold-start on mobile doesn't show false 'waking').
//   4. When connection is restored (socket reconnects, polling handshake
//      succeeds, OR ping succeeds), immediately clear the banner.
//   5. Trust low-level Socket.IO events (`connect_error` w/ description,
//      reconnect_attempt) so the banner state matches what the transport
//      is actually doing on mobile carriers/NAT.

const BACKOFF_SCHEDULE = [2000, 4000, 8000, 12000, 15000]
const MIN_FAILURES_BEFORE_BANNER = 3
// Grace window before we'll show a banner on a fresh page load, so the
// initial socket handshake (often slow on mobile cold-start) gets a chance
// to land before we declare the server "waking".
const INITIAL_GRACE_MS = 8000

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

  const { socket, isConnected: socketConnected } = useSocket()

  // Socket connection is the strongest "we have a working link" signal.
  // Always clear the banner immediately when socket connects.
  useEffect(() => {
    socketConnectedRef.current = Boolean(socketConnected)
    if (socketConnected) {
      everConnectedRef.current = true
      failureCountRef.current = 0
      markBackendReachable()
      setStatus('connected')
      setLastOk(Date.now())
    }
  }, [socketConnected])

  // Listen to raw Engine.IO events. A successful polling handshake or a
  // reconnect_attempt landing means the backend is reachable even if our
  // axios /api/ping happens to be stuck behind a slow first request — this
  // is what was leaving phones glued to the "Waking up server" banner.
  useEffect(() => {
    if (!socket) return undefined

    const onActivity = () => {
      everConnectedRef.current = true
      failureCountRef.current = 0
      markBackendReachable()
      if (mountedRef.current) {
        setStatus('connected')
        setLastOk(Date.now())
      }
    }

    const onTransportError = () => {
      // Don't trigger banner directly — let the ping/grace logic decide.
      // We only count this so prolonged transport errors escalate quickly.
      failureCountRef.current = Math.min(failureCountRef.current + 1, MIN_FAILURES_BEFORE_BANNER + 2)
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

  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true

    try {
      const result = await pingServer()

      if (!mountedRef.current) return

      if (result.ok) {
        everConnectedRef.current = true
        failureCountRef.current = 0
        // Always set connected on successful ping — no conditional guard
        setStatus('connected')
        setLastOk(Date.now())
      } else {
        failureCountRef.current += 1
        // Suppress banner when socket is alive — that link is the source of truth.
        if (socketConnectedRef.current) return
        if (failureCountRef.current < MIN_FAILURES_BEFORE_BANNER) return
        // Hold banner during the initial grace window so a slow cold-start
        // handshake doesn't paint the phone yellow before the socket lands.
        if (!everConnectedRef.current && (Date.now() - mountedAtRef.current) < INITIAL_GRACE_MS) return
        setStatus(everConnectedRef.current ? 'reconnecting' : 'waking')
      }
    } catch {
      if (!mountedRef.current) return
      failureCountRef.current += 1
      if (socketConnectedRef.current) return
      if (failureCountRef.current < MIN_FAILURES_BEFORE_BANNER) return
      if (!everConnectedRef.current && (Date.now() - mountedAtRef.current) < INITIAL_GRACE_MS) return
      setStatus(everConnectedRef.current ? 'reconnecting' : 'waking')
    } finally {
      checkingRef.current = false
    }
  }, [])

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

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void checkHealth()
      }
    }

    function onOnline() {
      // Browser says we're back online — immediately reset and verify
      failureCountRef.current = 0
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
