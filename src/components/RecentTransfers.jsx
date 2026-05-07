import React, { useEffect, useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ArrowRight, Trash2, FileText, X, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getRecentTransfers,
  clearTransfers,
  removeTransfer,
  updateTransferStatus,
  getCachedTransfer,
  mergeTransferData,
} from '../utils/storage'
import { getTransferStatus } from '../services/api'
import { timeAgo } from '../utils/format'

const STATUS_STYLES = {
  ACTIVE: { bg: 'var(--success-soft)', color: 'var(--success)', label: 'Active' },
  CLAIMED: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Claimed' },
  EXPIRED: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Expired' },
  CANCELLED: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Cancelled' },
  DELETED: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Deleted' },
  unknown: { bg: 'var(--bg-sunken)', color: 'var(--text-4)', label: '...' },
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase()
}

function statusToExpiredReason(status) {
  if (status === 'CANCELLED') return 'cancelled'
  if (status === 'DELETED') return 'burned'
  if (status === 'EXPIRED') return 'expired'
  return 'expired'
}

function RecentTransfers() {
  const [transfers, setTransfers] = useState(() => {
    const list = getRecentTransfers()
    // Instantly calculate status based on the local clock so the UI doesn't wait for the backend.
    return list.map(t => {
      if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
        return { ...t, status: 'EXPIRED' }
      }
      return { ...t, status: t.status || 'ACTIVE' }
    })
  })
  const [confirmClear, setConfirmClear] = useState(false)
  const navigate = useNavigate()

  // Listen for storage changes (e.g., when SettingsPanel clears history)
  useEffect(() => {
    const handleStorageChange = () => {
      const list = getRecentTransfers()
      setTransfers(list.map(t => {
        if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
          return { ...t, status: 'EXPIRED' }
        }
        return { ...t, status: t.status || 'ACTIVE' }
      }))
    }

    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom event for same-tab updates
    window.addEventListener('transfersCleared', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('transfersCleared', handleStorageChange)
    }
  }, [])

  // Recalculate statuses locally from expiry time — no API spam
  useEffect(() => {
    const timer = setInterval(() => {
      setTransfers(prev => prev.map(t => {
        const status = normalizeStatus(t?.status)
        if (status === 'CANCELLED' || status === 'DELETED' || status === 'EXPIRED') return t
        if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()) {
          return { ...t, status: 'EXPIRED' }
        }
        return t
      }))
    }, 30000) // check every 30s
    return () => clearInterval(timer)
  }, [])

  if (!transfers.length) return null

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTransfers()
    setTransfers([])
    setConfirmClear(false)
  }, [confirmClear])

  const handleRemove = useCallback((e, code) => {
    e.stopPropagation()
    const normalizedCode = normalizeCode(code)
    removeTransfer(normalizedCode)
    setTransfers(prev => prev.filter(t => normalizeCode(t.code) !== normalizedCode))
  }, [])

  const handleClick = useCallback(async (t) => {
    const normalizedCode = normalizeCode(t.code)
    if (!normalizedCode) return

    let status = normalizeStatus(t?.status) || 'ACTIVE'

    if (!['EXPIRED', 'CANCELLED', 'DELETED'].includes(status)) {
      try {
        const live = await getTransferStatus(normalizedCode)
        const liveStatus = normalizeStatus(live?.status)
        if (liveStatus) {
          status = liveStatus
          if (liveStatus !== normalizeStatus(t?.status)) {
            updateTransferStatus(normalizedCode, liveStatus)
            setTransfers(prev => prev.map(item =>
              normalizeCode(item?.code) === normalizedCode
                ? { ...item, status: liveStatus }
                : item
            ))
          }
        }
      } catch {
        // Keep existing local status when status endpoint is unreachable.
      }
    }

    if (['EXPIRED', 'CANCELLED', 'DELETED'].includes(status)) {
      navigate(`/expired?reason=${statusToExpiredReason(status)}`)
      return
    }

    const transferData = {
      ...t,
      code: normalizedCode,
      status,
      files: Array.isArray(t?.files) && t.files.length
        ? t.files
        : (t?.filename ? [{ name: t.filename }] : []),
    }

    const cachedTransfer = getCachedTransfer(normalizedCode)
    const resolvedTransferData = mergeTransferData(cachedTransfer || t?.transfer, transferData) || transferData

    // Determine if this is a sender or receiver transfer
    // isSender === true means user sent this file (go to /sender)
    // isSender === false means user received this file (go to /download)
    const isSender = t.isSender === true || String(t?.role || '').toLowerCase() === 'sender'

    // Pass local transfer data so destination pages can render immediately.
    try {
      navigate(isSender ? `/sender/${normalizedCode}` : `/download/${normalizedCode}`, {
        state: { transferData: resolvedTransferData }
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[RecentTransfers] Navigation error:', err)
      }
      // Fallback: navigate without state
      navigate(isSender ? `/sender/${normalizedCode}` : `/download/${normalizedCode}`)
    }
  }, [navigate])

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
                    {timeAgo(t.savedAt)} · {t.isSender === true ? 'Sent' : 'Received'}
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

export default memo(RecentTransfers)
