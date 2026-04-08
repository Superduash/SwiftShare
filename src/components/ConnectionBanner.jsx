import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, WifiOff, Zap } from 'lucide-react'
import { useConnectionHealth } from '../context/ConnectionHealthContext'

const STATUS_CONFIG = {
  waking: {
    icon: Zap,
    text: 'Waking up server...',
    sub: 'Free tier servers sleep after inactivity. Hang tight!',
    bg: 'linear-gradient(135deg, rgba(232,99,74,0.12), rgba(255,154,92,0.08))',
    border: 'rgba(232,99,74,0.2)',
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
    text: 'You\'re offline',
    sub: 'Check your internet connection.',
    bg: 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(220,38,38,0.05))',
    border: 'rgba(220,38,38,0.2)',
    color: 'var(--danger)',
    showSpinner: false,
  },
}

export default function ConnectionBanner() {
  const { status } = useConnectionHealth()

  const config = STATUS_CONFIG[status]
  const show = status !== 'connected' && config

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ overflow: 'hidden', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
        >
          <div
            style={{
              background: config.bg,
              borderBottom: `1px solid ${config.border}`,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            {config.showSpinner ? (
              <Loader2 size={16} className="animate-spin" style={{ color: config.color }} />
            ) : (
              <config.icon size={16} style={{ color: config.color }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: config.color }}>
                {config.text}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                {config.sub}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
