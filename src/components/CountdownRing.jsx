import React from 'react'
import { formatTime } from '../utils/format'

export default function CountdownRing({ secondsRemaining = 0, totalSeconds = 600, size = 120, showLabel = true }) {
  const safe = Math.max(0, Number(secondsRemaining) || 0)
  const total = Math.max(1, Number(totalSeconds) || 600)
  const progress = Math.max(0, Math.min(1, safe / total))

  const stroke = size > 100 ? 8 : 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  // Color shifts: cyan → amber → red
  let color = '#0891B2' // info/cyan
  let glowColor = 'rgba(8,145,178,0.2)'
  const isWarning = safe < 120 && safe >= 30
  const isDanger = safe < 30 && safe > 0

  if (isDanger) {
    color = 'var(--danger)'
    glowColor = 'rgba(220,38,38,0.3)'
  } else if (isWarning) {
    color = 'var(--warning)'
    glowColor = 'rgba(217,119,6,0.2)'
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${isDanger ? 'countdown-pulse' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease',
            filter: `drop-shadow(0 0 ${isDanger ? '8px' : '4px'} ${glowColor})`,
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute text-center">
          <div
            className={`font-mono font-bold ${isDanger ? 'text-countdown-danger' : ''}`}
            style={{ color: isDanger ? 'var(--danger)' : 'var(--text)', fontSize: size > 100 ? 18 : 14 }}
          >
            {formatTime(safe)}
          </div>
          {size > 100 && (
            <div className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-4)' }}>remaining</div>
          )}
        </div>
      )}
    </div>
  )
}
