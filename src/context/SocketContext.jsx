import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

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

    // Transport order: polling first for maximum compatibility across mobile
    // carriers, corporate proxies, and CDNs that block/stall WebSocket upgrades.
    // Engine.IO transparently upgrades to WebSocket once the upgrade probe
    // succeeds — this is the Socket.IO-recommended order for production.
    //
    // timeout: 45000 — Render free-tier cold-start can take up to 60s.
    // The old 10000ms value caused the socket to fire connect_error on every
    // cold-start attempt, accumulating failures that showed the 'waking' banner
    // and kept it stuck because each retry also timed out before the server
    // was ready to respond.  45s gives the server enough runway to wake.
    //
    // pingTimeout: 45000 — Once connected, tolerate a slow heartbeat response
    // during the server's warm-up phase (MongoDB connecting, etc.).  The server
    // already uses pingTimeout=60000; matching the client prevents the client
    // from self-disconnecting while the server is still initialising.
    // Allow forcing polling-only via localStorage (helps some mobile carriers)
    const forcePolling = typeof window !== 'undefined' && localStorage.getItem('socket_force_polling') === '1'
    const transports = forcePolling ? ['polling'] : ['websocket', 'polling']

    // If a non-localhost http URL is used, try switching to https to avoid mixed-content
    let socketUrl = url
    try {
      if (typeof window !== 'undefined' && socketUrl.startsWith('http://') && !targetsLoopback(socketUrl)) {
        console.warn('[Socket] Rewriting http:// to https:// for socket URL to avoid mixed content on HTTPS site')
        socketUrl = socketUrl.replace(/^http:/i, 'https:')
      }
    } catch {}

    const s = io(socketUrl, {
      path: '/socket.io',
      transports,
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
      debugLog('[Socket] Connected:', s.id)
      setIsConnected(true)
      setSocketId(s.id)
      try { localStorage.removeItem('socket_last_error') } catch {}
    })

    s.on('disconnect', (reason) => {
      debugLog('[Socket] Disconnected:', reason)
      setIsConnected(false)
    })

    s.on('connect_error', (error) => {
      debugError('[Socket] Connection error:', error)
      try {
        const payload = { time: Date.now(), type: 'connect_error', message: error?.message || String(error), stack: error?.stack || null }
        localStorage.setItem('socket_last_error', JSON.stringify(payload))
      } catch {}
      try { toast.error('Socket connection failed (check mobile network).') } catch {}
      setIsConnected(false)
    })

    s.on('reconnect_error', (error) => {
      debugError('[Socket] Reconnection error:', error)
      try {
        const payload = { time: Date.now(), type: 'reconnect_error', message: error?.message || String(error), stack: error?.stack || null }
        localStorage.setItem('socket_last_error', JSON.stringify(payload))
      } catch {}
      try { toast.error('Socket reconnection failed (mobile network).') } catch {}
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

    // Debug UI: floating buttons to show last socket error and toggle polling-only.
    let debugRoot = null
    if (typeof window !== 'undefined' && (import.meta.env.DEV || localStorage.getItem('socket_debug') === '1')) {
      try {
        debugRoot = document.createElement('div')
        debugRoot.style.position = 'fixed'
        debugRoot.style.right = '12px'
        debugRoot.style.bottom = '12px'
        debugRoot.style.zIndex = '9999'
        debugRoot.style.display = 'flex'
        debugRoot.style.flexDirection = 'column'
        debugRoot.style.gap = '6px'

        const showBtn = document.createElement('button')
        showBtn.textContent = 'Socket Err'
        showBtn.style.padding = '6px 8px'
        showBtn.style.background = '#111827'
        showBtn.style.color = '#fff'
        showBtn.style.border = 'none'
        showBtn.style.borderRadius = '6px'
        showBtn.style.fontSize = '12px'
        showBtn.style.cursor = 'pointer'
        showBtn.onclick = () => {
          try {
            const raw = localStorage.getItem('socket_last_error')
            const parsed = raw ? JSON.parse(raw) : null
            console.log('socket_last_error', parsed)
            if (parsed) {
              try { toast(JSON.stringify(parsed, null, 2), { duration: 8000 }) } catch {}
            } else {
              try { toast('No socket error recorded') } catch {}
            }
          } catch (e) { console.error(e) }
        }

        const toggleBtn = document.createElement('button')
        toggleBtn.textContent = localStorage.getItem('socket_force_polling') === '1' ? 'Polling: ON' : 'Polling: OFF'
        toggleBtn.style.padding = '6px 8px'
        toggleBtn.style.background = '#1f2937'
        toggleBtn.style.color = '#fff'
        toggleBtn.style.border = 'none'
        toggleBtn.style.borderRadius = '6px'
        toggleBtn.style.fontSize = '12px'
        toggleBtn.style.cursor = 'pointer'
        toggleBtn.onclick = () => {
          try {
            const cur = localStorage.getItem('socket_force_polling') === '1'
            localStorage.setItem('socket_force_polling', cur ? '0' : '1')
            toggleBtn.textContent = cur ? 'Polling: OFF' : 'Polling: ON'
            try { toast('Restart the app to apply polling change') } catch {}
          } catch (e) { console.error(e) }
        }

        debugRoot.appendChild(showBtn)
        debugRoot.appendChild(toggleBtn)
        document.body.appendChild(debugRoot)
      } catch (e) {
        debugError('[Socket] Failed to create debug UI', e)
      }
    }

    return () => {
      debugLog('[Socket] Disconnecting')
      s.disconnect()
      try {
        if (debugRoot && debugRoot.parentNode) debugRoot.parentNode.removeChild(debugRoot)
      } catch {}
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
    if (!normalizedCode) return Promise.resolve(null)
    return new Promise((resolve) => {
      socketRef.current?.emit('rejoin-room', { code: normalizedCode }, (response) => {
        resolve(response || null)
      })
    })
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
