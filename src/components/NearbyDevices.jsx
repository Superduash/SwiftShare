import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, Download, Clock, Send, RefreshCw, WifiOff, AlertCircle } from 'lucide-react'
import { formatBytes, formatRelativeExpiry } from '../utils/format'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSocket } from '../context/SocketContext'

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

function dedupeDevices(list, selfSocketId) {
  const seen = new Set()
  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .filter((device) => {
      const candidateSocketId = String(device.socketId || '').trim()
      if (!candidateSocketId) return true
      if (selfSocketId && candidateSocketId === selfSocketId) return false
      const key = candidateSocketId || normalizeCode(device.code)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const POLL_INTERVAL = 30000 // 30 seconds auto-refresh
const MIN_REFRESH_INTERVAL = 2000 // Minimum 2s between manual refreshes

export default function NearbyDevices({ currentTransferCode = '', currentFilename = '' }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const navigate = useNavigate()
  const { socket, socketId, isConnected } = useSocket()
  const normalizedTransferCode = normalizeCode(currentTransferCode)
  const isSenderShareMode = Boolean(normalizedTransferCode)
  const lastPingRef = useRef(0)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleShareToDevice = (targetSocketId) => {
    const safeTargetSocketId = String(targetSocketId || '').trim()
    if (!socket || !safeTargetSocketId || !normalizedTransferCode) return

    try {
      socket.emit('push-transfer-offer', {
        targetSocketId: safeTargetSocketId,
        code: normalizedTransferCode,
        filename: currentFilename || 'shared file',
      })
      toast.success('Share prompt sent!')
    } catch (err) {
      toast.error('Failed to send share prompt')
    }
  }

  // Manual refresh function
  const handleManualRefresh = () => {
    if (!socket || !isConnected) {
      toast.error('Not connected to server')
      return
    }

    const now = Date.now()
    if (now - lastPingRef.current < MIN_REFRESH_INTERVAL) {
      return // Debounce: prevent spam
    }

    setRefreshing(true)
    setError(null)
    lastPingRef.current = now

    try {
      socket.emit('nearby-ping', {})
      // Refreshing state will be cleared when nearby-devices event arrives
      setTimeout(() => {
        if (mountedRef.current) {
          setRefreshing(false)
        }
      }, 3000) // Max 3s refresh indicator
    } catch (err) {
      setRefreshing(false)
      setError('Failed to refresh')
      toast.error('Failed to refresh nearby devices')
    }
  }

  // Single unified polling via socket only (no duplicate API calls)
  useEffect(() => {
    if (!socket) {
      setLoading(false)
      setError('Socket not initialized')
      return
    }

    const onNearbyDevices = (payload = {}) => {
      if (!mountedRef.current) return
      
      try {
        const dedupedDevices = dedupeDevices(payload.devices, socketId)
        setDevices(dedupedDevices)
        setLoading(false)
        setRefreshing(false)
        setError(null)
        setLastUpdated(Date.now())
      } catch (err) {
        setError('Failed to process device list')
        setLoading(false)
        setRefreshing(false)
      }
    }

    const onNearbyDeviceAdded = (payload = {}) => {
      if (!mountedRef.current) return
      
      try {
        const { device, subnet } = payload
        if (!device || !subnet) return
        
        // Add new device to list (deduplication handled by dedupeDevices)
        setDevices((prev) => dedupeDevices([...prev, device], socketId))
        setLastUpdated(Date.now())
      } catch (err) {
        // Silently fail - not critical
      }
    }

    const onNearbyPong = () => {
      if (!mountedRef.current) return
      // Server acknowledged our ping - connection is healthy
      setError(null)
    }

    const requestNearby = () => {
      if (!mountedRef.current) return
      if (document.hidden) return
      if (!isConnected) return
      
      const now = Date.now()
      // Debounce: don't ping more than once every 5 seconds
      if (now - lastPingRef.current < 5000) return
      
      lastPingRef.current = now
      
      try {
        socket.emit('nearby-ping', {})
      } catch (err) {
        setError('Connection error')
      }
    }

    socket.on('nearby-devices', onNearbyDevices)
    socket.on('nearby-device-added', onNearbyDeviceAdded)
    socket.on('nearby-pong', onNearbyPong)
    socket.on('connect', requestNearby)

    // Initial request
    requestNearby()

    // Poll at reduced interval
    const iv = setInterval(requestNearby, POLL_INTERVAL)

    // Pause polling when tab is hidden
    const onVisibility = () => {
      if (!document.hidden && mountedRef.current) {
        requestNearby()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Refresh when browser comes back online (e.g. after WiFi reconnect)
    const onOnline = () => {
      if (mountedRef.current) {
        lastPingRef.current = 0 // reset debounce so we ping immediately
        requestNearby()
      }
    }
    window.addEventListener('online', onOnline)

    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      socket.off('connect', requestNearby)
      socket.off('nearby-devices', onNearbyDevices)
      socket.off('nearby-device-added', onNearbyDeviceAdded)
      socket.off('nearby-pong', onNearbyPong)
    }
  }, [socket, socketId, isConnected])

  // Show loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Wifi size={14} style={{ color: 'var(--text-4)' }} className="animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Nearby Devices</h3>
        </div>
        <div className="surface-card-flat p-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
            Searching for devices...
          </p>
        </div>
      </motion.div>
    )
  }

  // Show error state
  if (error && !isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <WifiOff size={14} style={{ color: 'var(--danger)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Nearby Devices</h3>
        </div>
        <div className="surface-card-flat p-4 text-center">
          <AlertCircle size={20} className="mx-auto mb-2" style={{ color: 'var(--danger)' }} />
          <p className="text-xs mb-2" style={{ color: 'var(--text-4)' }}>
            Not connected to server
          </p>
          <button 
            className="btn-ghost text-xs !py-1 !px-3"
            onClick={handleManualRefresh}
            disabled={!isConnected}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </motion.div>
    )
  }

  // Show empty state
  if (!devices.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wifi size={14} style={{ color: 'var(--text-4)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Nearby Devices</h3>
          </div>
          <button 
            className="btn-icon !w-6 !h-6"
            onClick={handleManualRefresh}
            disabled={refreshing || !isConnected}
            title="Refresh nearby devices"
            aria-label="Refresh nearby devices"
          >
            <RefreshCw 
              size={12} 
              className={refreshing ? 'animate-spin' : ''}
              style={{ color: 'var(--text-4)' }}
            />
          </button>
        </div>
        <div className="surface-card-flat p-4 text-center">
          <p className="text-xs mb-1" style={{ color: 'var(--text-4)' }}>
            No devices found on same WiFi
          </p>
          {lastUpdated && (
            <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>
              Last checked: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  // Show devices list
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wifi size={14} style={{ color: 'var(--success)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Nearby Devices
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            {devices.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px]" style={{ color: 'var(--text-5)' }}>
              {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button 
            className="btn-icon !w-6 !h-6"
            onClick={handleManualRefresh}
            disabled={refreshing || !isConnected}
            title="Refresh nearby devices"
            aria-label="Refresh nearby devices"
          >
            <RefreshCw 
              size={12} 
              className={refreshing ? 'animate-spin' : ''}
              style={{ color: refreshing ? 'var(--accent)' : 'var(--text-4)' }}
            />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence>
          {devices.map((dev, idx) => (
            <motion.button
              key={dev.socketId || dev.code}
              className="w-full surface-card-flat p-3 flex items-center gap-3 text-left hover:border-[var(--accent)] transition-colors"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => {
                if (isSenderShareMode) {
                  if (dev.socketId) {
                    handleShareToDevice(dev.socketId)
                  } else {
                    toast.error('This device is not ready for direct prompt sharing yet.')
                  }
                  return
                }

                const normalizedCode = normalizeCode(dev.code)
                if (!normalizedCode) return
                navigate(`/download/${normalizedCode}`)
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--success-soft)' }}>
                {isSenderShareMode
                  ? <Send size={16} style={{ color: 'var(--success)' }} />
                  : <Download size={16} style={{ color: 'var(--success)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                  {dev.deviceName || dev.code}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                  {isSenderShareMode
                    ? (dev.socketId ? 'Tap to send share prompt' : 'Direct prompt unavailable')
                    : `${dev.fileCount} file${dev.fileCount !== 1 ? 's' : ''} · ${formatBytes(dev.totalSize)}`}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: 'var(--text-4)' }}>
                <Clock size={10} />
                {formatRelativeExpiry(dev.expiresAt)}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
