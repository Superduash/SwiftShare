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

  // Priority 1: In local development, use same-origin (Vite proxy handles routing)
  if (typeof window !== 'undefined' && isLocalRuntimeHost(runtimeHost)) {
    const url = window.location.origin
    console.log('[SocketContext] Using same-origin for local dev (Vite proxy):', url)
    return url
  }

  // Priority 2: VITE_SOCKET_URL or VITE_API_URL for production
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL
  const envApiUrl = import.meta.env.VITE_API_URL
  
  const envUrl = envSocketUrl || envApiUrl
  
  if (envUrl && envUrl.trim()) {
    const candidate = normalizeUrl(envUrl)
    const rewrittenLanUrl = rewriteLoopbackUrlForLanRuntime(candidate)
    if (rewrittenLanUrl) {
      console.log('[SocketContext] Using LAN-rewritten URL:', rewrittenLanUrl)
      return rewrittenLanUrl
    }
    console.log('[SocketContext] Using env URL:', candidate)
    return candidate
  }

  // Priority 3: Same-origin fallback
  if (typeof window !== 'undefined') {
    console.log('[SocketContext] Using same-origin fallback:', window.location.origin)
    return window.location.origin
  }

  console.warn('[SocketContext] No valid socket URL found, returning empty string')
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
    // No initializedRef guard. StrictMode's mount→cleanup→mount cycle is intentional;
    // the cleanup below cleanly disconnects the dev-only first socket, and the remount
    // builds a fresh one. The old guard kept the disconnected socket forever in dev,
    // leaving the banner stuck on "Syncing...".
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

    // Track whether this is the very first connect. iOS aggressively suspends
    // WebSocket connections when the screen locks. When the user unlocks, Socket.io
    // may fire 'connect' (with a brand-new socket.id) instead of 'reconnect',
    // because the transport was fully destroyed. Without dispatching the
    // reconnect event on these subsequent 'connect' fires, pages never re-fetch
    // transfer state and the sender sees a stale UI forever.
    let hasConnectedBefore = false

    s.on('connect', () => {
      setIsConnected(true)
      setSocketId(s.id)

      if (hasConnectedBefore && typeof window !== 'undefined') {
        // This is a RE-connect (not the initial connect). Dispatch the same
        // event that 'reconnect' fires so pages reconcile missed events.
        window.dispatchEvent(new CustomEvent('swiftshare:socket-reconnected', {
          detail: { socketId: s.id, timestamp: Date.now() }
        }))
      }
      hasConnectedBefore = true
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
      // Dispatch a custom event so active pages (SenderPage, DownloadPage) can
      // silently re-fetch their transfer state to reconcile any missed events
      // while the socket was offline. Each page listens for this and calls its
      // own refresh logic — no polling, no duplicate socket events.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('swiftshare:socket-reconnected', {
          detail: { socketId: s.id, timestamp: Date.now() }
        }))
      }
    })

    // Passive return-to-foreground: if the socket happened to drop while we were
    // hidden (iOS suspending the tab, OS sleep, network handoff), reconnect on
    // return. We DO NOT proactively disconnect on hide — that breaks desktop
    // where the connection would otherwise survive a tab switch unscathed.
    // Socket.IO's pingTimeout (60s) handles genuinely-stale connections.
    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'visible' && !s.connected) {
        try { s.connect() } catch {}
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
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
