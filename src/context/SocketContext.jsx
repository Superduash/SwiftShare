import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react'
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

function getSocketUrl() {
  const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : ''
  const runtimeIsLocal = isLocalRuntimeHost(runtimeHost)

  // Priority 1: VITE_API_URL
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl && envApiUrl.trim()) {
    const candidate = normalizeUrl(envApiUrl)
    const rewrittenLanUrl = rewriteLoopbackUrlForLanRuntime(candidate)
    if (rewrittenLanUrl) return rewrittenLanUrl
    if (!runtimeIsLocal && targetsLoopback(candidate)) {
      // localhost URL won't work from deployed frontend — fall through
    } else {
      return candidate
    }
  }

  // Priority 3: Runtime detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (isLocalRuntimeHost(hostname)) {
      return `${window.location.protocol}//${hostname}:3001`
    }
    return window.location.origin
  }

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
    let socketUrl = getSocketUrl()

    // Rewrite http:// → https:// for non-local URLs to avoid mixed-content blocks
    // on HTTPS-hosted frontends (Netlify, Vercel, etc.)
    try {
      if (typeof window !== 'undefined' && socketUrl.startsWith('http://') && !targetsLoopback(socketUrl)) {
        socketUrl = socketUrl.replace(/^http:/i, 'https:')
      }
    } catch {}

    const s = io(socketUrl, {
      path: '/socket.io',
      // Always start with polling, then upgrade to WebSocket.
      // This is the Socket.IO recommended production order — polling works
      // through every proxy/CDN/firewall, and the upgrade to WebSocket is
      // attempted transparently once the HTTP channel is established.
      transports: ['polling', 'websocket'],
      upgrade: true,
      withCredentials: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      randomizationFactor: 0.3,
      timeout: 20000,
      pingTimeout: 60000,
      pingInterval: 25000,
      reconnectionAttempts: Infinity,
    })

    socketRef.current = s
    setSocket(s)

    s.on('connect', () => {
      setIsConnected(true)
      setSocketId(s.id)
    })

    s.on('disconnect', () => {
      setIsConnected(false)
    })

    s.on('connect_error', () => {
      setIsConnected(false)
    })

    s.on('reconnect', () => {
      setIsConnected(true)
      setSocketId(s.id)
    })

    return () => {
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

  const registerSender = useCallback((code, ownershipToken) => {
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode || !ownershipToken) return
    socketRef.current?.emit('register-sender', { code: normalizedCode, ownershipToken })
  }, [])

  const rejoinRoom = useCallback((code) => {
    const normalizedCode = normalizeCode(code)
    if (!normalizedCode) return Promise.resolve(null)
    return new Promise((resolve) => {
      socketRef.current?.emit('rejoin-room', { code: normalizedCode }, (response) => {
        resolve(response || null)
      })
    })
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    socket, isConnected, socketId, joinRoom, leaveRoom, registerSender, rejoinRoom
  }), [socket, isConnected, socketId, joinRoom, leaveRoom, registerSender, rejoinRoom])

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext) || {}
}
