import React from 'react'

export default function Bars({
  data = [],
  maxHeight = 220,
  labelKey = '_id',
  valueKey = 'count',
  formatValue = (v) => v.toLocaleString(),
  barColor = 'var(--accent)',
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: maxHeight }}
        className="flex items-center justify-center text-xs text-[var(--text-3)] border border-dashed border-[var(--border)] rounded-xl"
      >
        No items recorded
      </div>
    )
  }

  const values = data.map((d) => d[valueKey] || 0)
  const max = Math.max(...values, 1)

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {data.map((item, idx) => {
        const val = item[valueKey] || 0
        const pct = Math.max(2, Math.round((val / max) * 100))
        const label = item[labelKey] || 'Unknown'

        return (
          <div key={idx} className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-center text-[var(--text-2)] font-medium">
              <span className="truncate max-w-[200px]" title={label}>
                {label}
              </span>
              <span className="font-mono text-[var(--text)] font-semibold">{formatValue(val)}</span>
            </div>
            <div className="w-full h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
