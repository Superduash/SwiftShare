import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { pingServer, markBackendReachable } from '../services/api'
import { useSocket } from './SocketContext'

const ConnectionHealthContext = createContext(null)

// ── Connection state machine ────────────────────────────────────────────────
//
// Single source of truth for "is the app actually live?"
//
//   connected    — socket connected (real-time channel up, fully live)
//   syncing      — ping OK but socket not yet connected (link establishing)
//   waking       — server cold-starting, no successful contact yet
//   reconnecting — had a working link before, now lost it
//   offline      — browser/OS reports we're offline
//
// Truth rules:
//   1. Socket connected ⇒ connected.  Period.
//   2. Browser reports offline ⇒ offline.
//   3. Otherwise consult ping result + history:
//        - ping OK but socket not up           → syncing
//        - ping failing, never reached server  → waking
//        - ping failing, was connected before  → reconnecting

const BACKOFF_SCHEDULE = [1000, 2000, 3000, 5000, 8000] // Faster initial retries for localhost
const HEALTHY_POLL_MS = 30000 // 30s when healthy and connected (reduced from 60s)

// Hard ceiling: after this long stuck non-connected with the same status,
// reset failure counters so the next successful event clears cleanly.
const MAX_STUCK_MS = 30000 // Reduced from 60s for faster recovery

export function ConnectionHealthProvider({ children }) {
  const { socket, isConnected: socketConnected } = useSocket()

  // Status starts at 'syncing' — we don't know yet, and we're trying.
  // It will flip to 'connected' the moment the socket connects, or to
  // 'waking'/'offline' if ping calls keep failing.
  const [status, setStatus] = useState('syncing')
  const [lastOk, setLastOk] = useState(null)

  const everConnectedRef = useRef(false)
  const intervalRef = useRef(null)
  const failureCountRef = useRef(0)
  const mountedRef = useRef(true)
  const checkingRef = useRef(false)
  const socketConnectedRef = useRef(false)
  const pingOkRef = useRef(false)
  const stuckStartRef = useRef(null)

  // Centralised state update. Always derive the new status from the latest
  // socket + ping + browser-online signals so the FSM never disagrees with
  // itself across handlers.
  const recomputeStatus = useCallback(() => {
    if (!mountedRef.current) return

    // Browser-level offline trumps everything except a live socket
    // (some mobile browsers fire false offline events on screen lock).
    if (typeof navigator !== 'undefined' && navigator.onLine === false && !socketConnectedRef.current) {
      setStatus('offline')
      return
    }

    if (socketConnectedRef.current) {
      setStatus('connected')
      return
    }

    if (pingOkRef.current) {
      // Ping works, socket doesn't yet → syncing
      setStatus('syncing')
      return
    }

    // No successful link at the moment.
    if (everConnectedRef.current) {
      setStatus('reconnecting')
    } else {
      setStatus('waking')
    }
  }, [])

  // ── Socket state → FSM ────────────────────────────────────────────────────
  useEffect(() => {
    socketConnectedRef.current = Boolean(socketConnected)
    if (socketConnected) {
      everConnectedRef.current = true
      failureCountRef.current = 0
      stuckStartRef.current = null
      pingOkRef.current = true
      markBackendReachable()
      setLastOk(Date.now())
    }
    recomputeStatus()
  }, [socketConnected, recomputeStatus])

  // ── Engine.IO low-level signals ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return undefined

    const onActivity = () => {
      everConnectedRef.current = true
      failureCountRef.current = 0
      stuckStartRef.current = null
      pingOkRef.current = true
      markBackendReachable()
      setLastOk(Date.now())
      recomputeStatus()
    }

    socket.io?.on?.('open', onActivity)

    return () => {
      socket.io?.off?.('open', onActivity)
    }
  }, [socket, recomputeStatus])

  // ── Ping-based health check ───────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return
    
    // Skip ping if tab is hidden - no point pinging when user isn't looking
    if (typeof document !== 'undefined' && document.hidden) {
      return
    }
    
    // Skip ping if socket is already connected and healthy - socket.io handles its own heartbeat
    if (socketConnectedRef.current && pingOkRef.current && failureCountRef.current === 0) {
      return
    }
    
    checkingRef.current = true

    try {
      const result = await pingServer()
      if (!mountedRef.current) return

      if (result.ok) {
        pingOkRef.current = true
        failureCountRef.current = 0
        stuckStartRef.current = null
        markBackendReachable()
        setLastOk(Date.now())
      } else {
        pingOkRef.current = false
        failureCountRef.current += 1
        if (stuckStartRef.current === null) {
          stuckStartRef.current = Date.now()
        }
      }
    } catch {
      if (!mountedRef.current) return
      pingOkRef.current = false
      failureCountRef.current += 1
      if (stuckStartRef.current === null) {
        stuckStartRef.current = Date.now()
      }
    } finally {
      checkingRef.current = false
      recomputeStatus()
    }
  }, [recomputeStatus])

  // ── Polling loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    void checkHealth()

    function scheduleNext() {
      if (intervalRef.current) clearTimeout(intervalRef.current)

      let delay
      if (socketConnectedRef.current && pingOkRef.current && failureCountRef.current === 0) {
        delay = HEALTHY_POLL_MS
      } else {
        const idx = Math.min(failureCountRef.current, BACKOFF_SCHEDULE.length - 1)
        delay = BACKOFF_SCHEDULE[idx] || 15000
      }

      intervalRef.current = setTimeout(async () => {
        if (!mountedRef.current) return

        // Hard ceiling: if we've been stuck non-connected for too long,
        // reset failure counters so the next successful event clears cleanly.
        if (
          stuckStartRef.current !== null &&
          Date.now() - stuckStartRef.current > MAX_STUCK_MS
        ) {
          failureCountRef.current = 0
          stuckStartRef.current = null
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

  // ── Browser events ────────────────────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        // On tab focus, reset failure state and recompute status.
        // The polling loop will handle the next ping check automatically.
        failureCountRef.current = 0
        stuckStartRef.current = null
        recomputeStatus()
        // Only ping if socket is NOT connected (otherwise socket.io handles it)
        if (!socketConnectedRef.current) {
          void checkHealth()
        }
      }
    }

    function onOnline() {
      // Browser came back online - reset failure state
      failureCountRef.current = 0
      stuckStartRef.current = null
      recomputeStatus()
      // Only ping if socket is NOT connected
      if (!socketConnectedRef.current) {
        void checkHealth()
      }
    }

    function onOffline() {
      // Only trust if the socket is also dead.
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
  }, [checkHealth, recomputeStatus])

  const forceCheck = useCallback(() => {
    failureCountRef.current = 0
    stuckStartRef.current = null
    recomputeStatus()
    void checkHealth()
  }, [checkHealth, recomputeStatus])

  return (
    <ConnectionHealthContext.Provider value={{ status, lastOk, forceCheck }}>
      {children}
    </ConnectionHealthContext.Provider>
  )
}

export function useConnectionHealth() {
  return useContext(ConnectionHealthContext) || { status: 'connected', lastOk: null, forceCheck: () => {} }
}
