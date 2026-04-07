import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, Download, Clock } from 'lucide-react'
import { getNearbyDevices } from '../services/api'
import { formatBytes, formatRelativeExpiry } from '../utils/format'
import { useNavigate } from 'react-router-dom'

export default function NearbyDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function fetch() {
      try {
        const data = await getNearbyDevices()
        if (mounted && data?.devices?.length) setDevices(data.devices)
      } catch {}
      if (mounted) setLoading(false)
    }
    fetch()
    const iv = setInterval(fetch, 10000)
    return () => { mounted = false; clearInterval(iv) }
  }, [])

  if (loading || !devices.length) return null

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
              key={dev.code}
              className="w-full surface-card-flat p-3 flex items-center gap-3 text-left hover:border-[var(--accent)] transition-colors"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(`/download/${dev.code}`)}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--success-soft)' }}>
                <Download size={16} style={{ color: 'var(--success)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                  {dev.deviceName || dev.code}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                  {dev.fileCount} file{dev.fileCount !== 1 ? 's' : ''} · {formatBytes(dev.totalSize)}
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
