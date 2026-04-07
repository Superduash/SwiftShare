import React from 'react'

export default function ProgressBar({ percent = 0, label = 'Progress', speed = null, color = '#6366F1', className = '' }) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0))

  return (
    <div className={`card-elevated p-3 ${className}`.trim()}>
      <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-2)' }}>
        <span>{label}</span>
        <span>{safe.toFixed(0)}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: 'rgba(74,78,101,0.35)' }}>
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${safe}%`, background: color }}
        />
      </div>
      {speed ? (
        <div className="mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
          {speed}
        </div>
      ) : null}
    </div>
  )
}
