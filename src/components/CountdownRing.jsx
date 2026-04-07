import React from 'react'

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function CountdownRing({ secondsRemaining = 0, totalSeconds = 600, size = 120 }) {
  const safeRemaining = Math.max(0, Number(secondsRemaining) || 0)
  const safeTotal = Math.max(1, Number(totalSeconds) || 600)
  const progress = Math.max(0, Math.min(1, safeRemaining / safeTotal))

  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  const color = safeRemaining < 30 ? '#F87171' : safeRemaining < 120 ? '#FBBF24' : '#22D3EE'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(74,78,101,0.35)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-sm" style={{ color: 'var(--text)' }}>{formatTime(safeRemaining)}</div>
      </div>
    </div>
  )
}
