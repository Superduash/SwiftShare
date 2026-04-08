import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT-AWARE SOCKET URL RESOLUTION (PRODUCTION SAFE)
// ═══════════════════════════════════════════════════════════════════════════

function getSocketUrl() {
  // Priority 1: Explicit VITE_SOCKET_URL
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL
  if (envSocketUrl && envSocketUrl.trim()) {
    return envSocketUrl.trim().replace(/\/+$/, '')
  }
  
  // Priority 2: Use VITE_API_URL
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl && envApiUrl.trim()) {
    return envApiUrl.trim().replace(/\/+$/, '')
  }
  
  // Priority 3: Runtime detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001'
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
    console.log('[Socket] Connecting to:', url)
    
    const s = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    })
    
    socketRef.current = s
    setSocket(s)

    s.on('connect', () => {
      console.log('[Socket] Connected:', s.id)
      setIsConnected(true)
      setSocketId(s.id)
    })

    s.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      setIsConnected(false)
    })

    s.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
      setIsConnected(false)
    })

    s.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message)
      setIsConnected(false)
    })

    s.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
      setSocketId(s.id)
    })

    s.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber)
    })

    return () => { 
      console.log('[Socket] Disconnecting')
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
