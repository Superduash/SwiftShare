import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ArrowRight, Trash2, FileText, X, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRecentTransfers, clearTransfers, removeTransfer } from '../utils/storage'
import { getTransferStatus } from '../services/api'
import { timeAgo } from '../utils/format'

const STATUS_STYLES = {
  ACTIVE: { bg: 'var(--success-soft)', color: 'var(--success)', label: 'Active' },
  EXPIRED: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Expired' },
  CANCELLED: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Cancelled' },
  DELETED: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Deleted' },
  unknown: { bg: 'var(--bg-sunken)', color: 'var(--text-4)', label: '...' },
}

export default function RecentTransfers() {
  const [transfers, setTransfers] = useState([])
  const [confirmClear, setConfirmClear] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const list = getRecentTransfers()
    setTransfers(list.map(t => ({ ...t, status: t.status || 'unknown' })))

    // Check status for each
    list.forEach(async (t) => {
      try {
        const data = await getTransferStatus(t.code)
        const status = data?.status || (data?.secondsRemaining > 0 ? 'ACTIVE' : 'EXPIRED')
        setTransfers(prev => prev.map(p =>
          p.code === t.code ? { ...p, status } : p
        ))
      } catch {
        setTransfers(prev => prev.map(p =>
          p.code === t.code ? { ...p, status: 'EXPIRED' } : p
        ))
      }
    })
  }, [])

  if (!transfers.length) return null

  function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTransfers()
    setTransfers([])
    setConfirmClear(false)
  }

  function handleRemove(e, code) {
    e.stopPropagation()
    removeTransfer(code)
    setTransfers(prev => prev.filter(t => t.code !== code))
  }

  function handleClick(t) {
    // Role-based routing: sender → sender page, receiver → download page
    if (t.isSender) {
      navigate(`/sender/${t.code}`)
    } else {
      navigate(`/download/${t.code}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: 'var(--text-3)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Recent</h3>
        </div>
        <button
          className="btn-ghost text-[11px] !py-1 !px-2"
          onClick={handleClear}
          style={confirmClear ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
        >
          {confirmClear ? (
            <>
              <AlertTriangle size={11} />
              Clear forever?
            </>
          ) : (
            <>
              <Trash2 size={11} />
              Clear
            </>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] mb-1" style={{ color: 'var(--text-4)' }}>Clearing removes local history only</p>
        <AnimatePresence>
          {transfers.map((t, idx) => {
            const s = STATUS_STYLES[t.status] || STATUS_STYLES.unknown
            return (
              <motion.button
                key={t.code}
                className="w-full surface-card-flat p-3 flex items-center gap-3 text-left group"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => handleClick(t)}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--file-icon-bg)' }}>
                  <FileText size={16} style={{ color: 'var(--file-icon-color)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {t.filename || t.code}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-4)' }}>
                    {timeAgo(t.savedAt)} · {t.isSender ? 'Sent' : 'Received'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                  <button
                    className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity !w-6 !h-6"
                    onClick={(e) => handleRemove(e, t.code)}
                    aria-label="Remove from recents"
                    title="Remove from recents"
                  >
                    <X size={12} />
                  </button>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-4)' }} />
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
