import React, { useState } from 'react'

export default function Donut({
  data = [],
  size = 180,
  strokeWidth = 24,
  labelKey = 'label',
  valueKey = 'value',
  colorKey = 'color',
  formatValue = (v) => v.toLocaleString(),
}) {
  const [hovered, setHovered] = useState(null)

  const defaultColors = [
    'var(--accent)',
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EC4899',
    '#8B5CF6',
    '#06B6D4',
  ]

  const total = data.reduce((acc, d) => acc + (d[valueKey] || 0), 0)

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        style={{ height: size, width: size }}
        className="flex items-center justify-center text-xs text-[var(--text-3)] border border-dashed border-[var(--border)] rounded-full mx-auto"
      >
        No data
      </div>
    )
  }

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let accumulatedAngle = 0

  const slices = data.map((item, idx) => {
    const val = item[valueKey] || 0
    const fraction = val / total
    const strokeDasharray = `${fraction * circumference} ${circumference}`
    const strokeDashoffset = -accumulatedAngle * circumference
    accumulatedAngle += fraction

    const color = item[colorKey] || defaultColors[idx % defaultColors.length]
    return {
      ...item,
      val,
      fraction,
      color,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--surface-hover)"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={hovered === idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-[var(--text-3)] font-medium">
            {hovered !== null ? slices[hovered]?.[labelKey] : 'Total'}
          </span>
          <span className="text-base font-bold font-mono text-[var(--text)]">
            {hovered !== null
              ? `${Math.round((slices[hovered].val / total) * 100)}%`
              : formatValue(total)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-[140px]">
        {slices.map((slice, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between text-xs gap-3 p-1 rounded transition-colors cursor-pointer ${
              hovered === idx ? 'bg-[var(--surface-hover)]' : ''
            }`}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-[var(--text-2)] truncate">{slice[labelKey]}</span>
            </div>
            <span className="font-mono font-semibold text-[var(--text)]">
              {formatValue(slice.val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
