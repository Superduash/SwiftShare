import React, { memo } from 'react'
import { motion } from 'framer-motion'

// ── Unified inline status banner ────────────────────────────────────────────
//
// Use this for any inline page banner that conveys a status (cancelled,
// expired, burn mode active, retrying, etc.).  Visual + animation behaviour
// is centralised here so every banner across the app matches.
//
// Props:
//   tone      — 'info' | 'success' | 'warning' | 'danger' | 'accent'  (default 'info')
//   icon      — optional Lucide icon component (rendered at 16px)
//   title     — main short message
//   description — optional secondary line
//   action    — optional ReactNode (usually a button) shown on the right
//   align     — 'left' | 'center' (default 'center' when no action, 'left' otherwise)
//   className — extra classes for outer wrapper (e.g. 'mb-4')

const TONE_VARS = {
  info:    { bg: 'var(--info-soft)',    border: 'rgba(8,145,178,0.20)',  fg: 'var(--info)'    },
  success: { bg: 'var(--success-soft)', border: 'rgba(22,163,74,0.20)',  fg: 'var(--success)' },
  warning: { bg: 'var(--warning-soft)', border: 'rgba(217,119,6,0.20)',  fg: 'var(--warning)' },
  danger:  { bg: 'var(--danger-soft)',  border: 'rgba(220,38,38,0.20)',  fg: 'var(--danger)'  },
  accent:  { bg: 'var(--accent-soft)',  border: 'var(--accent-medium)',  fg: 'var(--accent)'  },
}

function StatusBanner({
  tone = 'info',
  icon: Icon,
  title,
  description,
  action,
  align,
  className = '',
}) {
  const styles = TONE_VARS[tone] || TONE_VARS.info
  const effectiveAlign = align || (action ? 'left' : 'center')

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className={`p-3 rounded-xl ${className}`}
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        className={`flex items-center gap-2.5 ${
          effectiveAlign === 'center' ? 'justify-center text-center' : 'justify-between'
        }`}
      >
        <div className={`flex items-center gap-2 min-w-0 ${effectiveAlign === 'center' ? 'justify-center' : ''}`}>
          {Icon && <Icon size={16} style={{ color: styles.fg, flexShrink: 0 }} aria-hidden="true" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: styles.fg }}>
              {title}
            </p>
            {description && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </motion.div>
  )
}

export default memo(StatusBanner)
