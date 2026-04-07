import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [socketId, setSocketId] = useState(null)

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setSocketId(socket.id)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setSocketId(null)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const joinRoom = useCallback((code) => {
    if (socketRef.current && code) {
      socketRef.current.emit('join-room', { code })
    }
  }, [])

  const leaveRoom = useCallback((code) => {
    if (socketRef.current && code) {
      socketRef.current.emit('leave-room', { code })
    }
  }, [])

  const registerSender = useCallback((code) => {
    if (socketRef.current && code) {
      socketRef.current.emit('register-sender', { code })
    }
  }, [])

  const rejoinRoom = useCallback((code) => {
    if (socketRef.current && code) {
      socketRef.current.emit('rejoin-room', { code })
    }
  }, [])

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      socketId,
      joinRoom,
      leaveRoom,
      registerSender,
      rejoinRoom,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider')
  return ctx
}

export default SocketContext
