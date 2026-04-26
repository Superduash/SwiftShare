import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isPrivateNetworkHost(hostname) {
  if (!hostname) return false
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true

  const match172 = /^172\.(\d{1,3})\./.exec(hostname)
  if (match172) {
    const second = Number(match172[1])
    return Number.isFinite(second) && second >= 16 && second <= 31
  }

  return false
}

function isLocalRuntimeHost(hostname) {
  return isLoopbackHost(hostname) || isPrivateNetworkHost(hostname)
}

function targetsLoopback(urlValue) {
  if (typeof urlValue !== 'string' || !urlValue.trim()) return false

  try {
    const parsed = new URL(urlValue)
    return isLoopbackHost(parsed.hostname)
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(urlValue.trim())
  }
}

function normalizeUrl(urlValue) {
  return String(urlValue || '').trim().replace(/\/+$/, '')
}

function rewriteLoopbackUrlForLanRuntime(urlValue) {
  if (typeof window === 'undefined') return null

  const runtimeHost = window.location.hostname
  if (!isLocalRuntimeHost(runtimeHost)) return null
  if (!targetsLoopback(urlValue)) return null

  try {
    const parsed = new URL(urlValue)
    parsed.hostname = runtimeHost
    return normalizeUrl(parsed.toString())
  } catch {
    return null
  }
}

function debugLog(...args) {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

function debugError(...args) {
  if (import.meta.env.DEV) {
    console.error(...args)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT-AWARE SOCKET URL RESOLUTION (PRODUCTION SAFE)
// ═══════════════════════════════════════════════════════════════════════════

function getSocketUrl() {
  const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : ''
  const runtimeIsLocal = isLocalRuntimeHost(runtimeHost)

  // Priority 1: Explicit VITE_SOCKET_URL
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL
  if (envSocketUrl && envSocketUrl.trim()) {
    const candidate = normalizeUrl(envSocketUrl)
    const rewrittenLanUrl = rewriteLoopbackUrlForLanRuntime(candidate)
    if (rewrittenLanUrl) {
      return rewrittenLanUrl
    }

    if (!runtimeIsLocal && targetsLoopback(candidate) && typeof window !== 'undefined') {
      console.warn('[Socket] Ignoring localhost VITE_SOCKET_URL in non-local runtime, using same-origin fallback')
    } else {
      return candidate
    }
  }
  
  // Priority 2: Use VITE_API_URL
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl && envApiUrl.trim()) {
    const candidate = normalizeUrl(envApiUrl)
    const rewrittenLanUrl = rewriteLoopbackUrlForLanRuntime(candidate)
    if (rewrittenLanUrl) {
      return rewrittenLanUrl
    }

    if (!runtimeIsLocal && targetsLoopback(candidate) && typeof window !== 'undefined') {
      console.warn('[Socket] Ignoring localhost VITE_API_URL for socket in non-local runtime')
    } else {
      return candidate
    }
  }
  
  // Priority 3: Runtime detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Local development
    if (isLocalRuntimeHost(hostname)) {
      return `${window.location.protocol}//${hostname}:3001`
    }
    
    // Production: same-origin
    return window.location.origin
  }
  
  // Fallback
  return ''
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState(null)

  useEffect(() => {
    const url = getSocketUrl()
    debugLog('[Socket] Connecting to:', url)
    
    // Transport order is intentionally polling-first.
    // Mobile carrier networks, corporate proxies, and some CDNs intermittently
    // block or stall WebSocket upgrade handshakes; starting with polling
    // guarantees a connection, and Engine.IO transparently upgrades to WS once
    // the upgrade probe succeeds. This is the order recommended by Socket.IO
    // for production reliability across hostile networks.
    const s = io(url, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      withCredentials: false,
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.3,
      reconnectionAttempts: Infinity,
      timeout: 45000,
    })
    
    socketRef.current = s
    setSocket(s)

    s.on('connect', () => {
      debugLog('[Socket] Connected:', s.id)
      setIsConnected(true)
      setSocketId(s.id)
    })

    s.on('disconnect', (reason) => {
      debugLog('[Socket] Disconnected:', reason)
      setIsConnected(false)
    })

    s.on('connect_error', (error) => {
      debugError('[Socket] Connection error:', error.message)
      setIsConnected(false)
    })

    s.on('reconnect_error', (error) => {
      debugError('[Socket] Reconnection error:', error.message)
      setIsConnected(false)
    })

    s.on('reconnect', (attemptNumber) => {
      debugLog('[Socket] Reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
      setSocketId(s.id)
    })

    s.on('reconnect_attempt', (attemptNumber) => {
      debugLog('[Socket] Reconnection attempt:', attemptNumber)
    })

    return () => { 
      debugLog('[Socket] Disconnecting')
      s.disconnect() 
    }
  }, [])

  const joinRoom = useCallback((code) => {
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode) return
    socketRef.current?.emit('join-room', { code: normalizedCode })
  }, [])

  const leaveRoom = useCallback((code) => {
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode) return
    socketRef.current?.emit('leave-room', { code: normalizedCode })
  }, [])

  const registerSender = useCallback((code) => {
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode) return
    socketRef.current?.emit('register-sender', { code: normalizedCode })
  }, [])

  const rejoinRoom = useCallback((code) => {
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode) return
    socketRef.current?.emit('rejoin-room', { code: normalizedCode })
  }, [])

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, socketId, joinRoom, leaveRoom, registerSender, rejoinRoom }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext) || {}
}
