import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Wifi, FileText, ChevronRight } from 'lucide-react'
import { getNearbyDevices } from '../services/api'

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function getCatClass(category) {
  const map = {
    Notes: 'cat-notes', Assignment: 'cat-assignment', Invoice: 'cat-invoice',
    Code: 'cat-code', Image: 'cat-image', Video: 'cat-video', Other: 'cat-other',
  }
  return map[category] || 'cat-other'
}

function timeLeft(expiresAt) {
  if (!expiresAt) return ''
  const s = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function NearbyDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchDevices = async () => {
    try {
      const data = await getNearbyDevices()
      setDevices(data?.devices || [])
    } catch {
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi size={15} className="text-accent-cyan" />
          <h3 className="text-text-primary font-bold text-sm">Nearby Transfers</h3>
        </div>
        {devices.length > 0 && (
          <span className="badge cat-notes">{devices.length} found</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div key={i} className="h-12 skeleton rounded-xl" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border-color flex items-center justify-center mx-auto mb-2">
            <Wifi size={16} className="text-text-dim" />
          </div>
          <p className="text-text-dim text-xs">No nearby devices</p>
          <p className="text-text-dim text-xs mt-0.5">Share your WiFi to discover transfers</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {devices.map((device, i) => (
              <motion.button
                key={device.code}
                className="w-full glass-card-elevated p-3 flex items-center gap-3 text-left hover:border-accent-cyan/30 transition-all group"
                style={{ borderRadius: '10px' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/join?code=${device.code}`)}
              >
                <div className="w-8 h-8 rounded-lg bg-bg-primary border border-border-color flex items-center justify-center flex-shrink-0">
                  <FileText size={13} className="text-accent-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-xs font-semibold truncate">{device.deviceName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-text-dim text-xs">{device.fileCount} file{device.fileCount !== 1 ? 's' : ''}</span>
                    <span className="text-text-dim text-xs">·</span>
                    <span className="text-text-dim text-xs">{formatBytes(device.totalSize)}</span>
                    {device.category && (
                      <>
                        <span className="text-text-dim text-xs">·</span>
                        <span className={`badge text-xs ${getCatClass(device.category)}`} style={{ padding: '1px 6px', fontSize: '9px' }}>{device.category}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-text-dim text-xs font-mono">{timeLeft(device.expiresAt)}</span>
                  <ChevronRight size={12} className="text-text-dim group-hover:text-accent-cyan transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
