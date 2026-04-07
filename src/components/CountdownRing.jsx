import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

export default function CountdownRing({ secondsRemaining = 0, totalSeconds = 600, size = 120 }) {
  const radius = 80
  const svgSize = 180
  const center = svgSize / 2
  const circumference = 2 * Math.PI * radius
  const safeTotal = Math.max(1, totalSeconds)
  const safeRemaining = Math.max(0, Math.min(secondsRemaining, safeTotal))
  const dashOffset = circumference * (1 - safeRemaining / safeTotal)

  const color = useMemo(() => {
    if (secondsRemaining > 120) return '#22D3EE'
    if (secondsRemaining >= 60) return '#FACC15'
    return '#EF4444'
  }, [secondsRemaining])

  const glowColor = useMemo(() => {
    if (secondsRemaining > 120) return 'rgba(34,211,238,0.3)'
    if (secondsRemaining >= 60) return 'rgba(250,204,21,0.3)'
    return 'rgba(239,68,68,0.4)'
  }, [secondsRemaining])

  const minutes = Math.floor(secondsRemaining / 60)
  const secs = secondsRemaining % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isUrgent = secondsRemaining <= 30

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className="relative"
        animate={isUrgent ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(30,45,69,0.8)"
            strokeWidth={6}
          />
          {/* Progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold text-lg leading-none"
            style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {timeStr}
          </span>
          <span className="text-text-dim text-xs mt-0.5">left</span>
        </div>
      </motion.div>
    </div>
  )
}
