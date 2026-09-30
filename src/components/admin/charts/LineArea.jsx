import React, { useState, useId } from 'react'

export default function LineArea({
  data = [],
  height = 260,
  strokeColor = 'var(--accent)',
  fillColor = 'var(--accent)',
  formatValue = (v) => v.toLocaleString(),
  formatLabel = (t) => {
    try {
      const d = new Date(t)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return String(t)
    }
  },
  ariaLabel = 'Time series chart',
}) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const [showTable, setShowTable] = useState(false)
  const chartId = useId()

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs text-[var(--text-3)] border border-dashed border-[var(--border)] rounded-xl"
      >
        No data available for the selected range
      </div>
    )
  }

  const values = data.map((d) => (typeof d.v === 'number' ? d.v : 0))
  const maxVal = Math.max(...values, 1)
  const minVal = Math.min(...values, 0)
  const valRange = maxVal - minVal || 1

  const paddingLeft = 48
  const paddingRight = 16
  const paddingTop = 20
  const paddingBottom = 32

  const svgWidth = 800
  const plotWidth = svgWidth - paddingLeft - paddingRight
  const plotHeight = height - paddingTop - paddingBottom

  const points = data.map((d, idx) => {
    const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * plotWidth
    const y = paddingTop + plotHeight - ((d.v - minVal) / valRange) * plotHeight
    return { x, y, raw: d }
  })

  const pathD = points.length === 1
    ? `M ${points[0].x - 10},${points[0].y} L ${points[0].x + 10},${points[0].y}`
    : `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`

  const areaD = points.length === 1
    ? ''
    : `${pathD} L ${points[points.length - 1].x},${paddingTop + plotHeight} L ${points[0].x},${paddingTop + plotHeight} Z`

  // 4 Y-axis ticks
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
    const val = minVal + ratio * valRange
    const y = paddingTop + plotHeight - ratio * plotHeight
    return { val: Math.round(val), y }
  })

  // X-axis sample ticks
  const step = Math.max(1, Math.floor(data.length / 6))
  const xTicks = data.filter((_, idx) => idx % step === 0 || idx === data.length - 1)

  return (
    <div className="w-full">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="text-[11px] text-[var(--text-3)] hover:text-[var(--text)] transition-colors px-2 py-0.5 rounded border border-[var(--border)]"
        >
          {showTable ? 'Show Chart' : 'View Table'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto max-h-[260px] text-xs border border-[var(--border)] rounded-xl p-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-3)]">
                <th className="py-1 px-2 font-medium">Time</th>
                <th className="py-1 px-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b border-[var(--border)]/30 hover:bg-[var(--surface-hover)]">
                  <td className="py-1 px-2">{formatLabel(d.t)}</td>
                  <td className="py-1 px-2 text-right font-mono">{formatValue(d.v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${height}`}
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label={ariaLabel}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id={`area-grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillColor} stopOpacity="0.32" />
                <stop offset="95%" stopColor={fillColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={svgWidth - paddingRight}
                  y2={tick.y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeOpacity="0.6"
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="var(--text-3)"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {formatValue(tick.val)}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xTicks.map((d, i) => {
              const origIdx = data.indexOf(d)
              const x = paddingLeft + (origIdx / Math.max(data.length - 1, 1)) * plotWidth
              return (
                <text
                  key={i}
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="var(--text-3)"
                  fontSize="11"
                >
                  {formatLabel(d.t)}
                </text>
              )
            })}

            {/* Filled Area */}
            {areaD && <path d={areaD} fill={`url(#area-grad-${chartId})`} />}

            {/* Stroke Line */}
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive hover overlays */}
            {points.map((p, idx) => (
              <g key={idx}>
                <rect
                  x={p.x - (plotWidth / points.length) / 2}
                  y={paddingTop}
                  width={plotWidth / points.length}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
                {hoverIndex === idx && (
                  <>
                    <line
                      x1={p.x}
                      y1={paddingTop}
                      x2={p.x}
                      y2={paddingTop + plotHeight}
                      stroke="var(--text)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      strokeOpacity="0.4"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      fill="var(--surface)"
                      stroke={strokeColor}
                      strokeWidth="3"
                    />
                  </>
                )}
              </g>
            ))}
          </svg>

          {/* Floating Tooltip */}
          {hoverIndex !== null && points[hoverIndex] && (
            <div
              className="absolute pointer-events-none bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text)] px-3 py-1.5 rounded-lg shadow-xl text-xs z-20 backdrop-blur-md"
              style={{
                left: `${(points[hoverIndex].x / svgWidth) * 100}%`,
                top: `${Math.max(10, (points[hoverIndex].y / height) * 100 - 25)}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="font-semibold">{formatLabel(points[hoverIndex].raw.t)}</div>
              <div className="text-[var(--accent)] font-mono font-bold mt-0.5">
                {formatValue(points[hoverIndex].raw.v)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
