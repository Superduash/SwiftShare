import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState(null)

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
    const s = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
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

    s.on('reconnect', () => {
      setIsConnected(true)
      setSocketId(s.id)
    })

    return () => { s.disconnect() }
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
