import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, WifiOff, Zap, CheckCircle2 } from 'lucide-react'
import { useConnectionHealth } from '../context/ConnectionHealthContext'

const STATUS_CONFIG = {
  waking: {
    icon: Zap,
    text: 'Waking up server...',
    sub: 'Free tier servers sleep after inactivity. Hang tight!',
    bg: 'linear-gradient(135deg, var(--accent-soft), var(--accent-medium))',
    border: 'var(--accent-medium)',
    color: 'var(--accent)',
    showSpinner: true,
  },
  reconnecting: {
    icon: Loader2,
    text: 'Reconnecting...',
    sub: 'Connection dropped briefly. Retrying in background.',
    bg: 'linear-gradient(135deg, rgba(8,145,178,0.1), rgba(8,145,178,0.05))',
    border: 'rgba(8,145,178,0.2)',
    color: 'var(--info)',
    showSpinner: true,
  },
  offline: {
    icon: WifiOff,
    text: "You're offline",
    sub: 'Check your internet connection.',
    bg: 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(220,38,38,0.05))',
    border: 'rgba(220,38,38,0.2)',
    color: 'var(--danger)',
    showSpinner: false,
  },
  // Transient "back online" flash shown for 2s after reconnecting
  restored: {
    icon: CheckCircle2,
    text: 'Back online',
    sub: 'Connection restored.',
    bg: 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05))',
    border: 'rgba(22,163,74,0.2)',
    color: 'var(--success)',
    showSpinner: false,
  },
}

const RESTORED_FLASH_MS = 2000

export default function ConnectionBanner() {
  const { status } = useConnectionHealth()
  const prevStatusRef = useRef(status)
  const [displayStatus, setDisplayStatus] = useState(status)
  const restoredTimerRef = useRef(null)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    // Clear any pending restored timer
    if (restoredTimerRef.current) {
      clearTimeout(restoredTimerRef.current)
      restoredTimerRef.current = null
    }

    if (status === 'connected') {
      // Only flash "restored" if we were previously in a bad state
      const wasBad = prev === 'offline' || prev === 'reconnecting' || prev === 'waking'
      if (wasBad) {
        setDisplayStatus('restored')
        restoredTimerRef.current = setTimeout(() => {
          setDisplayStatus('connected')
          restoredTimerRef.current = null
        }, RESTORED_FLASH_MS)
      } else {
        setDisplayStatus('connected')
      }
    } else {
      setDisplayStatus(status)
    }

    return () => {
      if (restoredTimerRef.current) {
        clearTimeout(restoredTimerRef.current)
      }
    }
  }, [status])

  const config = STATUS_CONFIG[displayStatus]
  const show = displayStatus !== 'connected' && config

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('connection-banner-visible', Boolean(show))

    return () => {
      root.classList.remove('connection-banner-visible')
    }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={displayStatus}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ overflow: 'hidden', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
          role="status"
          aria-live="polite"
          aria-label={config.text}
        >
          <div
            className="connection-banner-inner"
            style={{
              background: config.bg,
              borderBottom: `1px solid ${config.border}`,
              minHeight: 'var(--connection-banner-height)',
              padding: '10px 16px',
              paddingTop: 'calc(10px + var(--safe-top))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {config.showSpinner ? (
              <Loader2 size={16} className="animate-spin" style={{ color: config.color }} aria-hidden="true" />
            ) : (
              <config.icon size={16} style={{ color: config.color }} aria-hidden="true" />
            )}
            <div className="connection-banner-copy" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="connection-banner-title" style={{ fontSize: '13px', fontWeight: 600, color: config.color }}>
                {config.text}
              </span>
              <span className="connection-banner-sub" style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                {config.sub}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
