import React, { useState } from 'react'

export default function Heatmap({ grid = [], timezone = 'Asia/Kolkata' }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  let max = 1
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const val = grid[d]?.[h] || 0
      if (val > max) max = val
    }
  }

  return (
    <div className="w-full flex flex-col gap-2 select-none overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hours Header */}
        <div className="flex text-[10px] text-[var(--text-3)] font-mono mb-1 pl-8">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        {days.map((day, dIdx) => (
          <div key={day} className="flex items-center gap-1.5 mb-1.5">
            <span className="w-7 text-[11px] font-medium text-[var(--text-3)] text-right flex-shrink-0">
              {day}
            </span>
            <div className="flex flex-1 gap-1">
              {hours.map((hour) => {
                const val = grid[dIdx]?.[hour] || 0
                const intensity = val === 0 ? 0 : Math.max(0.12, val / max)

                return (
                  <div
                    key={hour}
                    className="flex-1 h-5 rounded-sm cursor-pointer transition-transform hover:scale-110 relative"
                    style={{
                      backgroundColor:
                        val === 0
                          ? 'var(--surface-hover)'
                          : `rgba(234, 88, 12, ${intensity})`,
                    }}
                    onMouseEnter={() => setHoveredCell({ day, hour, val })}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Hover Information */}
      <div className="h-6 flex items-center justify-between text-xs text-[var(--text-3)] px-1 mt-1 border-t border-[var(--border)]/40 pt-2">
        <span>Timezone: {timezone}</span>
        {hoveredCell ? (
          <span className="font-mono text-[var(--text)] font-semibold">
            {hoveredCell.day} at {hoveredCell.hour.toString().padStart(2, '0')}:00 —{' '}
            <span className="text-[var(--accent)]">{hoveredCell.val} view(s)</span>
          </span>
        ) : (
          <span>Hover over cells to see traffic breakdown</span>
        )}
      </div>
    </div>
  )
}
