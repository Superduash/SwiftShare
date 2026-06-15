import React from 'react'
import { motion } from 'framer-motion'

/**
 * FinalizingIndicator — shown when file bytes are fully uploaded
 * but the server is still processing (QR gen, bcrypt hash, DB write).
 *
 * Uses GPU-composited transform/opacity ONLY — no layout properties.
 * Respects all CSS theme variables: --accent, --progress-fill, --bg, --text.
 * Accessible via aria-live="polite" for screen readers.
 */
export default function FinalizingIndicator({ label = 'Finalizing Transfer...' }) {
  return (
    <div
      className="w-full"
      role="status"
      aria-label={label}
    >
      {/* Screen-reader live announcement */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {label} Please wait.
      </span>

      {/* Label row */}
      <div className="flex justify-between items-end mb-2">
        <motion.span
          className="text-sm font-medium tracking-wide"
          style={{ color: 'var(--text)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.span>
        <motion.span
          className="text-xs tabular-nums"
          style={{ color: 'var(--text-3)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          Processing...
        </motion.span>
      </div>

      {/* Indeterminate progress track */}
      <div
        className="h-2 w-full rounded-full relative overflow-hidden"
        style={{
          background: 'var(--border)',
          transform: 'translateZ(0)', // GPU layer
        }}
        aria-hidden="true"
      >
        {/* Indeterminate sweep bar — uses transform only, never width/left */}
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            background: 'var(--progress-fill, var(--accent))',
            width: '40%',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
          animate={{ x: ['-120%', '320%'] }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: 'easeInOut',
          }}
        />

        {/* Shimmer overlay */}
        <motion.div
          className="absolute top-0 bottom-0 left-0 pointer-events-none mix-blend-overlay"
          style={{
            width: '100%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
