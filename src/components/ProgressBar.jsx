import React from 'react'
import { motion } from 'framer-motion'
import { formatSpeed } from '../utils/format'

export default function ProgressBar({
  percent = 0,
  speed = 0,
  label = 'Uploading',
  showSpeed = true,
  indeterminate = false,
}) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0))

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
        {!indeterminate && (
          <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>
            {Math.round(pct)}%
          </span>
        )}
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden relative"
        style={{ background: 'var(--progress-track)' }}
      >
        {indeterminate ? (
          <motion.div
            className="h-full rounded-full absolute"
            style={{
              width: '40%',
              background: 'var(--progress-fill)',
              boxShadow: '0 0 8px rgba(232,99,74,0.3)',
            }}
            animate={{ left: ['-40%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'var(--progress-fill)',
              boxShadow: '0 0 8px rgba(232,99,74,0.3)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </div>
      {showSpeed && speed > 0 && !indeterminate && (
        <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--text-4)' }}>
          {formatSpeed(speed)}
        </p>
      )}
    </div>
  )
}
