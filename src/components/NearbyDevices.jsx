import React, { useEffect, useState, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, Download, Clock, Send, RefreshCw, WifiOff, AlertCircle } from 'lucide-react'
import { formatBytes, formatRelativeExpiry } from '../utils/format'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSocket } from '../context/SocketContext'
import { getNearbyDevices } from '../services/api'

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

// In-memory module cache to eliminate page navigation flickering
let globalNearbyCache = {
  devices: [],
  timestamp: 0,
}

function getStoredCache() {
  if (globalNearbyCache.devices.length > 0 && Date.now() - globalNearbyCache.timestamp < 120000) {
    return globalNearbyCache.devices
  }
  try {
    const raw = sessionStorage.getItem('swiftshare:nearby-cache')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.devices) && Date.now() - parsed.timestamp < 120000) {
        globalNearbyCache = parsed
        return parsed.devices
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return []
}

function saveCache(devices) {
  const safeList = Array.isArray(devices) ? devices : []
  globalNearbyCache = {
    devices: safeList,
    timestamp: Date.now(),
  }
  try {
    sessionStorage.setItem('swiftshare:nearby-cache', JSON.stringify(globalNearbyCache))
  } catch {
    // Ignore storage quota errors
  }
}

function dedupeDevices(list, selfSocketId, currentTransferCode) {
  const seenCodes = new Set()
  const seenSockets = new Set()
  const selfCode = normalizeCode(currentTransferCode)

  return (Array.isArray(list) ? list : [])
    .filter(Boolean)
    .filter((device) => {
      const code = normalizeCode(device.code)
      // Hide current transfer if viewing on that transfer's page
      if (selfCode && code === selfCode) return false

      // Filter out our own socket ID
      const candidateSocketId = String(device.socketId || '').trim()
      if (selfSocketId && candidateSocketId && candidateSocketId === selfSocketId) return false

      // Primary dedup: by transfer code
      if (code) {
        if (seenCodes.has(code)) return false
        seenCodes.add(code)
        return true
      }

      // Fallback dedup: by socketId (for devices without code)
      if (candidateSocketId) {
        if (seenSockets.has(candidateSocketId)) return false
        seenSockets.add(candidateSocketId)
        return true
      }

      return false
    })
}

const POLL_INTERVAL = 60000 // 60s periodic refresh
const MIN_REFRESH_INTERVAL = 1200 // 1.2s debounce for manual refresh

// Memoized device item component
const DeviceItem = memo(({ device, index, isSenderMode, onDeviceClick }) => {
  const displayName = device.title || device.filename || (device.fileCount > 1 ? `${device.fileCount} files` : device.code)
  const subtitle = `${device.deviceName ? `${device.deviceName} · ` : ''}${device.fileCount} file${device.fileCount !== 1 ? 's' : ''} · ${formatBytes(device.totalSize)}`

  return (
    <motion.button
      type="button"
      className="w-full surface-card-flat p-3 flex items-center gap-3 text-left hover:border-[var(--accent)] transition-colors cursor-pointer group"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onDeviceClick(device)}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{ background: 'var(--success-soft)' }}>
        {isSenderMode
          ? <Send size={16} style={{ color: 'var(--success)' }} />
          : <Download size={16} style={{ color: 'var(--success)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {displayName}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-4)' }}>
          {isSenderMode ? 'Available to receive' : subtitle}
        </p>
      </div>
      <div className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: 'var(--text-4)' }}>
        <Clock size={10} />
        {formatRelativeExpiry(device.expiresAt)}
      </div>
    </motion.button>
  )
})

DeviceItem.displayName = 'DeviceItem'

function NearbyDevices({ currentTransferCode = '', currentFilename = '' }) {
  const normalizedTransferCode = normalizeCode(currentTransferCode)
  const isSenderShareMode = Boolean(normalizedTransferCode)

  const [devices, setDevices] = useState(() => {
    const cached = getStoredCache()
    return dedupeDevices(cached, '', normalizedTransferCode)
  })
  const [loading, setLoading] = useState(() => {
    const cached = getStoredCache()
    return cached.length === 0
  })
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(() => globalNearbyCache.timestamp || null)

  const navigate = useNavigate()
  const { socket, socketId, isConnected } = useSocket()
  const lastPingRef = useRef(0)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleDeviceClick = useCallback((dev) => {
    if (isSenderShareMode) return

    const normalizedCode = normalizeCode(dev.code)
    if (!normalizedCode) return
    navigate(`/download/${normalizedCode}`)
  }, [isSenderShareMode, navigate])

  const applyDevices = useCallback((rawDevices) => {
    if (!mountedRef.current) return
    const deduped = dedupeDevices(rawDevices, socketId, normalizedTransferCode)
    setDevices(deduped)
    saveCache(deduped)
    setLoading(false)
    setRefreshing(false)
    setError(null)
    setLastUpdated(Date.now())
  }, [socketId, normalizedTransferCode])

  // Dual fetch: Request via Socket AND fallback REST API
  const fetchNearby = useCallback(async (isManual = false) => {
    if (!mountedRef.current) return

    const now = Date.now()
    if (!isManual && now - lastPingRef.current < MIN_REFRESH_INTERVAL) return
    lastPingRef.current = now

    if (isManual) {
      setRefreshing(true)
    }

    // 1. Emit via socket with force flag
    if (socket && (socket.connected || isConnected)) {
      try {
        socket.emit('nearby-ping', { code: normalizedTransferCode || undefined, force: isManual })
      } catch {
        // Fallback to REST
      }
    }

    // 2. Fallback REST API call to ensure we never miss responses
    try {
      const res = await getNearbyDevices(socketId)
      if (res && Array.isArray(res.devices)) {
        applyDevices(res.devices)
        if (isManual) {
          if (res.devices.length > 0) {
            toast.success(`Found ${res.devices.length} local transfer${res.devices.length > 1 ? 's' : ''}!`, { id: 'nearby-sync', duration: 1800 })
          } else {
            toast('No active local transfers found', { id: 'nearby-sync', icon: '📡', duration: 1600 })
          }
        }
      }
    } catch (err) {
      if (mountedRef.current && devices.length === 0) {
        setError('Could not reach network discovery')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [socket, isConnected, socketId, normalizedTransferCode, applyDevices, devices.length])

  const handleManualRefresh = useCallback(() => {
    fetchNearby(true)
  }, [fetchNearby])

  // Socket event listeners and periodic polling
  useEffect(() => {
    const onNearbyDevices = (payload = {}) => {
      if (!mountedRef.current) return
      applyDevices(payload.devices || [])
    }

    const onNearbyDeviceAdded = (payload = {}) => {
      if (!mountedRef.current) return
      const { device } = payload
      if (!device) return
      setDevices((prev) => {
        const next = dedupeDevices([...prev, device], socketId, normalizedTransferCode)
        saveCache(next)
        return next
      })
      setLastUpdated(Date.now())
    }

    const onNearbyRefreshNeeded = () => {
      fetchNearby(false)
    }

    const onNearbyPong = () => {
      if (!mountedRef.current) return
      setError(null)
    }

    if (socket) {
      socket.on('nearby-devices', onNearbyDevices)
      socket.on('nearby-device-added', onNearbyDeviceAdded)
      socket.on('nearby-refresh-needed', onNearbyRefreshNeeded)
      socket.on('nearby-pong', onNearbyPong)
      socket.on('connect', () => fetchNearby(false))
    }

    // Initial fetch
    fetchNearby(false)

    // Safety timeout: stop spinner after 3.5s even if slow network
    const timer = setTimeout(() => {
      if (mountedRef.current) setLoading(false)
    }, 3500)

    // Periodic poll
    const iv = setInterval(() => {
      if (!document.hidden && mountedRef.current) {
        fetchNearby(false)
      }
    }, POLL_INTERVAL)

    const onVisibility = () => {
      if (!document.hidden && mountedRef.current) {
        fetchNearby(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(timer)
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisibility)
      if (socket) {
        socket.off('nearby-devices', onNearbyDevices)
        socket.off('nearby-device-added', onNearbyDeviceAdded)
        socket.off('nearby-refresh-needed', onNearbyRefreshNeeded)
        socket.off('nearby-pong', onNearbyPong)
      }
    }
  }, [socket, socketId, applyDevices, fetchNearby, normalizedTransferCode])

  // Show loading state
  if (loading && devices.length === 0) {
    return (
      <motion.div initial={{ y: 6 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Wifi size={14} style={{ color: 'var(--accent)' }} className="animate-pulse" />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Transfers on Local Wi-Fi
          </h3>
        </div>
        <div className="surface-card-flat p-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
            Searching for active transfers on your local network...
          </p>
        </div>
      </motion.div>
    )
  }

  // Show error state
  if (error && !isConnected && devices.length === 0) {
    return (
      <motion.div initial={{ y: 6 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-2.5">
          <WifiOff size={14} style={{ color: 'var(--danger)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Transfers on Local Wi-Fi
          </h3>
        </div>
        <div className="surface-card-flat p-4 text-center">
          <AlertCircle size={20} className="mx-auto mb-2" style={{ color: 'var(--danger)' }} />
          <p className="text-xs mb-2" style={{ color: 'var(--text-4)' }}>
            Unable to connect to discovery service
          </p>
          <button 
            className="btn-ghost text-xs !py-1 !px-3"
            onClick={handleManualRefresh}
            disabled={!isConnected}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </motion.div>
    )
  }

  // Show empty state
  if (!devices.length) {
    return (
      <motion.div initial={{ y: 6 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Wifi size={14} style={{ color: 'var(--text-4)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Local Wi-Fi &amp; Hotspot Transfers
            </h3>
          </div>
          <button 
            className="btn-icon !w-6 !h-6 cursor-pointer"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Scan for local transfers"
            aria-label="Scan for local transfers"
          >
            <RefreshCw 
              size={12} 
              className={refreshing ? 'animate-spin' : ''}
              style={{ color: refreshing ? 'var(--accent)' : 'var(--text-4)' }}
            />
          </button>
        </div>
        <div className="surface-card-flat p-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-soft)' }}
            >
              <Wifi size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>No local transfers detected</p>
            <p className="text-[11px] leading-relaxed max-w-[300px]" style={{ color: 'var(--text-4)' }}>
              When a device on your Wi-Fi or mobile hotspot shares a file with nearby discovery enabled, it will appear here. Tap refresh anytime to scan.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Show devices list
  return (
    <motion.div initial={{ y: 6 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Wifi size={14} style={{ color: 'var(--success)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            Local Wi-Fi &amp; Hotspot Transfers
          </h3>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            {devices.length} available
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px]" style={{ color: 'var(--text-5)' }}>
              {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button 
            className="btn-icon !w-6 !h-6 cursor-pointer"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Refresh nearby transfers"
            aria-label="Refresh nearby transfers"
          >
            <RefreshCw 
              size={12} 
              className={refreshing ? 'animate-spin' : ''}
              style={{ color: refreshing ? 'var(--accent)' : 'var(--text-4)' }}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {devices.map((dev, idx) => (
            <DeviceItem
              key={dev.code || dev.socketId}
              device={dev}
              index={idx}
              isSenderMode={isSenderShareMode}
              onDeviceClick={handleDeviceClick}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default memo(NearbyDevices)

