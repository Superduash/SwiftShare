import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, WifiOff, Zap, CheckCircle2, RefreshCw } from 'lucide-react'
import { useConnectionHealth } from '../context/ConnectionHealthContext'

// ── Visual config per status ────────────────────────────────────────────────
// Keep copy short and direct. The user already saw the navbar pill change colour;
// the banner exists to *explain why* and reassure that the app is working on it.

const STATUS_CONFIG = {
  waking: {
    icon: Zap,
    iconSpins: false,
    text: 'Waking up server...',
    sub: 'The backend is starting up. This usually takes a few seconds.',
    tone: 'accent',
  },
  syncing: {
    icon: Loader2,
    iconSpins: true,
    text: 'Syncing...',
    sub: 'Establishing the real-time link.',
    tone: 'info',
  },
  reconnecting: {
    icon: RefreshCw,
    iconSpins: true,
    text: 'Reconnecting...',
    sub: 'Connection dropped briefly. Retrying in the background.',
    tone: 'info',
  },
  offline: {
    icon: WifiOff,
    iconSpins: false,
    text: "You're offline",
    sub: 'Check your internet connection.',
    tone: 'danger',
  },
  restored: {
    icon: CheckCircle2,
    iconSpins: false,
    text: 'Back online',
    sub: 'Connection restored.',
    tone: 'success',
  },
}

const TONE_STYLES = {
  accent:  { bg: 'linear-gradient(135deg, var(--accent-soft), var(--accent-medium))', border: 'var(--accent-medium)',     color: 'var(--accent)'  },
  info:    { bg: 'linear-gradient(135deg, rgba(8,145,178,0.10), rgba(8,145,178,0.04))', border: 'rgba(8,145,178,0.20)',    color: 'var(--info)'    },
  danger:  { bg: 'linear-gradient(135deg, rgba(220,38,38,0.10), rgba(220,38,38,0.04))', border: 'rgba(220,38,38,0.20)',    color: 'var(--danger)'  },
  success: { bg: 'linear-gradient(135deg, rgba(22,163,74,0.10), rgba(22,163,74,0.04))', border: 'rgba(22,163,74,0.20)',    color: 'var(--success)' },
}

// "Syncing" is the normal state during page load while the socket completes its
// handshake. Don't flash the banner for it unless it persists past this grace
// window — keeps the UI quiet on every fresh page load.
const SYNCING_GRACE_MS = 2500

// "Restored" success flash duration after a real outage is fixed.
const RESTORED_FLASH_MS = 1600

// Statuses that count as a real outage (used to decide whether to flash "restored").
const OUTAGE_STATES = new Set(['offline', 'reconnecting', 'waking'])

export default function ConnectionBanner() {
  const { status } = useConnectionHealth()

  // displayStatus is what we actually render. It can lag the FSM state for two
  // reasons: (1) syncing has a grace window, (2) we briefly show 'restored'
  // after a real outage clears.
  const [displayStatus, setDisplayStatus] = useState('connected')

  const prevStatusRef = useRef(status)
  const syncingTimerRef = useRef(null)
  const restoredTimerRef = useRef(null)
  const everShownOutageRef = useRef(false)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    // Always clear any pending timers on transition.
    if (syncingTimerRef.current) { clearTimeout(syncingTimerRef.current); syncingTimerRef.current = null }
    if (restoredTimerRef.current) { clearTimeout(restoredTimerRef.current); restoredTimerRef.current = null }

    // Track whether we've ever been in a real outage state — used to suppress
    // the "Back online" flash on first-ever connection (which is just normal
    // page load, not a recovery).
    if (OUTAGE_STATES.has(status)) {
      everShownOutageRef.current = true
    }

    if (status === 'connected') {
      const wasOutage = OUTAGE_STATES.has(prev) && everShownOutageRef.current
      if (wasOutage) {
        setDisplayStatus('restored')
        restoredTimerRef.current = setTimeout(() => {
          setDisplayStatus('connected')
          restoredTimerRef.current = null
        }, RESTORED_FLASH_MS)
      } else {
        // Normal startup path or transient syncing → connected. No flash.
        setDisplayStatus('connected')
      }
      return
    }

    if (status === 'syncing') {
      // Grace window: don't flash the banner for short transient syncing.
      // If syncing persists past the grace, show the banner.
      syncingTimerRef.current = setTimeout(() => {
        setDisplayStatus('syncing')
        syncingTimerRef.current = null
      }, SYNCING_GRACE_MS)
      return
    }

    // waking / reconnecting / offline — show immediately, no grace.
    setDisplayStatus(status)
  }, [status])

  useEffect(() => {
    return () => {
      if (syncingTimerRef.current) clearTimeout(syncingTimerRef.current)
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current)
    }
  }, [])

  const config = STATUS_CONFIG[displayStatus]
  const show = displayStatus !== 'connected' && Boolean(config)

  // Drive the global CSS variable so the navbar / page content reflows
  // smoothly when the banner appears or disappears.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('connection-banner-visible', Boolean(show))
    return () => root.classList.remove('connection-banner-visible')
  }, [show])

  const tone = config ? (TONE_STYLES[config.tone] || TONE_STYLES.info) : TONE_STYLES.info
  const Icon = config?.icon || Loader2

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={displayStatus}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={config.text}
        >
          <div
            className="connection-banner-inner"
            style={{
              background: tone.bg,
              borderBottom: `1px solid ${tone.border}`,
              minHeight: 'var(--connection-banner-height)',
              padding: '10px 16px',
              paddingTop: 'calc(10px + var(--safe-top))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Icon
              size={16}
              className={config.iconSpins ? 'animate-spin' : ''}
              style={{ color: tone.color, flexShrink: 0 }}
              aria-hidden="true"
            />
            <div className="connection-banner-copy" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="connection-banner-title" style={{ fontSize: '13px', fontWeight: 600, color: tone.color }}>
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
