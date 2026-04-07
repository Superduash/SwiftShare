import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState(null)

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
    const socket = io(url, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setSocketId(socket.id)
    })
    socket.on('disconnect', () => setIsConnected(false))

    return () => { socket.disconnect() }
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
      value={{ socket: socketRef.current, isConnected, socketId, joinRoom, leaveRoom, registerSender, rejoinRoom }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext) || {}
}
