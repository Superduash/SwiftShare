import React from 'react'
import { motion } from 'framer-motion'

export default function ProgressBar({
  percent = 0,
  label = '',
  speed = null,
  color = '#22D3EE',
  className = '',
}) {
  const safePercent = Math.max(0, Math.min(100, percent))

  return (
    <div className={`w-full ${className}`}>
      {(label || speed !== null) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-muted text-xs font-medium">{label}</span>
          <div className="flex items-center gap-3">
            {speed !== null && (
              <span className="text-text-dim text-xs font-mono">{speed}</span>
            )}
            <span className="text-xs font-bold" style={{ color }}>
              {safePercent}%
            </span>
          </div>
        </div>
      )}
      <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden border border-border-color">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}60`,
            width: `${safePercent}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${safePercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
