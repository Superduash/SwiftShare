import React from 'react'

export default function Sparkline({ data = [], color = 'var(--accent)', height = 36, width = 100 }) {
  if (!data || data.length < 2) {
    return <div style={{ height, width }} className="opacity-20" />
  }

  const values = data.map((d) => (typeof d === 'number' ? d : d.v || 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const padding = 2
  const effectiveWidth = width - padding * 2
  const effectiveHeight = height - padding * 2

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1)) * effectiveWidth
    const y = padding + effectiveHeight - ((val - min) / range) * effectiveHeight
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const pathD = `M ${points.join(' L ')}`
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`
  const gradId = `sparkline-grad-${Math.random().toString(36).substring(2, 8)}`

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
