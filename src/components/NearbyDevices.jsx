import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, Download, Clock, Send } from 'lucide-react'
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

const POLL_INTERVAL = 30000 // 30 seconds instead of 10

export default function NearbyDevices({ currentTransferCode = '', currentFilename = '' }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { socket, socketId } = useSocket()
  const normalizedTransferCode = normalizeCode(currentTransferCode)
  const isSenderShareMode = Boolean(normalizedTransferCode)
  const lastPingRef = useRef(0)

  const handleShareToDevice = (targetSocketId) => {
    const safeTargetSocketId = String(targetSocketId || '').trim()
    if (!socket || !safeTargetSocketId || !normalizedTransferCode) return

    socket.emit('push-transfer-offer', {
      targetSocketId: safeTargetSocketId,
      code: normalizedTransferCode,
      filename: currentFilename || 'shared file',
    })

    toast.success('Share prompt sent!')
  }

  // Single unified polling via socket only (no duplicate API calls)
  useEffect(() => {
    if (!socket) {
      setLoading(false)
      return
    }

    const onNearbyDevices = (payload = {}) => {
      setDevices(dedupeDevices(payload.devices, socketId))
      setLoading(false)
    }

    const requestNearby = () => {
      if (document.hidden) return
      const now = Date.now()
      // Debounce: don't ping more than once every 5 seconds
      if (now - lastPingRef.current < 5000) return
      lastPingRef.current = now
      socket.emit('nearby-ping', {})
    }

    socket.on('nearby-devices', onNearbyDevices)
    socket.on('connect', requestNearby)

    // Initial request
    requestNearby()

    // Poll at reduced interval
    const iv = setInterval(requestNearby, POLL_INTERVAL)

    // Pause polling when tab is hidden
    const onVisibility = () => {
      if (!document.hidden) requestNearby()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisibility)
      socket.off('connect', requestNearby)
      socket.off('nearby-devices', onNearbyDevices)
    }
  }, [socket, socketId])

  if (loading) return null

  if (!devices.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Wifi size={14} style={{ color: 'var(--text-4)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Nearby Devices</h3>
        </div>
        <div className="surface-card-flat p-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
            No devices found on same WiFi
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Wifi size={14} style={{ color: 'var(--success)' }} />
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Nearby Devices</h3>
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
