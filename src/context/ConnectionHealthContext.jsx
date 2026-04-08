import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { pingServer } from '../services/api'

const ConnectionHealthContext = createContext(null)

// States: 'connected' | 'reconnecting' | 'waking' | 'offline'
// 'waking' = first connection attempt (cold start), 'reconnecting' = was connected, lost it

const BACKOFF_SCHEDULE = [1000, 2000, 4000, 8000, 12000, 15000] // max ~15s between retries

export function ConnectionHealthProvider({ children }) {
  const [status, setStatus] = useState('reconnecting') // start optimistic but uncertain
  const [lastOk, setLastOk] = useState(null)
  const everConnectedRef = useRef(false)
  const intervalRef = useRef(null)
  const retryCountRef = useRef(0)
  const mountedRef = useRef(true)
  const checkingRef = useRef(false)

  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true

    try {
      const result = await pingServer()

      if (!mountedRef.current) return

      if (result.ok) {
        everConnectedRef.current = true
        retryCountRef.current = 0
        setStatus('connected')
        setLastOk(Date.now())
      } else {
        retryCountRef.current += 1
        setStatus(everConnectedRef.current ? 'reconnecting' : 'waking')
      }
    } catch {
      if (!mountedRef.current) return
      retryCountRef.current += 1
      setStatus(everConnectedRef.current ? 'reconnecting' : 'waking')
    } finally {
      checkingRef.current = false
    }
  }, [])

  // Initial check + adaptive polling
  useEffect(() => {
    mountedRef.current = true
    void checkHealth()

    function scheduleNext() {
      if (intervalRef.current) clearTimeout(intervalRef.current)

      // When connected: poll every 45s (lightweight keepalive check)
      // When not connected: use backoff schedule
      let delay
      if (everConnectedRef.current && retryCountRef.current === 0) {
        delay = 45000
      } else {
        const idx = Math.min(retryCountRef.current, BACKOFF_SCHEDULE.length - 1)
        delay = BACKOFF_SCHEDULE[idx]
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

  // When tab becomes visible again, check immediately
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void checkHealth()
      }
    }

    // When browser comes back online, check immediately
    function onOnline() {
      void checkHealth()
    }

    function onOffline() {
      setStatus('offline')
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
    retryCountRef.current = 0
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
