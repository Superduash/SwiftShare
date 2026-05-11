import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { formatSpeed } from '../utils/format'
import Spinner from './Spinner'

// Plain CSS-driven width transition. framer-motion was creating a fresh
// width animation on every progress prop change, which on fast uploads
// (10+ updates/sec) produced visible jitter as animations interrupted each
// other. A linear CSS transition is GPU-cheap and renders smoothly even
// on low-end mobile.
function ProgressBarBase({
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
        <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-2)' }}>
          {indeterminate && <Spinner size={12} style={{ color: 'var(--accent)' }} />}
          {label}
        </span>
        {!indeterminate && (
          <span className="text-xs font-mono font-medium tabular-nums" style={{ color: 'var(--accent)' }}>
            {Math.round(pct)}%
          </span>
        )}
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden relative"
        style={{ background: 'var(--progress-track)' }}
      >
        {indeterminate ? (
          // Finalizing: full-width bar that pulses opacity — communicates
          // "almost done, server is finishing up" without the jitter of a
          // bouncing indicator. Feels premium and intentional on mobile.
          <motion.div
            className="h-full rounded-full w-full"
            style={{
              background: 'var(--progress-fill)',
              boxShadow: '0 0 8px var(--progress-glow)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <div
            className="h-full rounded-full will-change-[width]"
            style={{
              width: `${pct}%`,
              background: 'var(--progress-fill)',
              boxShadow: '0 0 8px var(--progress-glow)',
              transition: 'width 250ms linear',
            }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        )}
      </div>
      {showSpeed && speed > 0 && !indeterminate && (
        <p className="text-[11px] mt-1 text-right tabular-nums" style={{ color: 'var(--text-4)' }}>
          {formatSpeed(speed)}
        </p>
      )}
    </div>
  )
}

// Memoized: ProgressBar is rendered inside parents that re-render on every
// state tick. Without memo it re-renders even when percent didn't actually
// change (e.g. when sibling state updates).
export default memo(ProgressBarBase, (prev, next) => (
  Math.round(prev.percent) === Math.round(next.percent)
  && prev.speed === next.speed
  && prev.label === next.label
  && prev.indeterminate === next.indeterminate
  && prev.showSpeed === next.showSpeed
))
