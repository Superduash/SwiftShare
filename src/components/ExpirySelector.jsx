import React, { memo, useCallback } from 'react'
import { Clock } from 'lucide-react'

const OPTIONS = [
  { value: 10,  label: '10 min', desc: 'Quick share — link gone soon' },
  { value: 60,  label: '1 hour',  desc: 'Standard — plenty of time' },
  { value: 300, label: '5 hours', desc: 'Extended — for larger files' },
]

// Memoized option button to prevent re-renders
const ExpiryOption = memo(({ opt, active, onChange }) => {
  const handleClick = useCallback(() => onChange(opt.value), [opt.value, onChange])
  
  return (
    <button
      type="button"
      className="flex-1 py-2.5 px-3 rounded-xl text-center transition-all"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-3)',
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        fontWeight: active ? 600 : 500,
      }}
      onClick={handleClick}
    >
      <div className="text-sm font-semibold">{opt.label}</div>
      <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
    </button>
  )
})

ExpiryOption.displayName = 'ExpiryOption'

function ExpirySelector({ value = 60, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
        <Clock size={12} />
        Auto-delete after
      </label>
      <div className="flex gap-2">
        {OPTIONS.map(opt => (
          <ExpiryOption key={opt.value} opt={opt} active={value === opt.value} onChange={onChange} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={1} max={1440}
          placeholder="Custom (minutes)"
          className="surface-input flex-1 text-sm rounded-xl px-3 py-2"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text)' }}
          value={OPTIONS.some(o => o.value === value) ? '' : value}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v > 0 && v <= 1440) onChange(v)
          }}
        />
        <span className="text-xs" style={{ color: 'var(--text-4)' }}>min (max 24h)</span>
      </div>
    </div>
  )
}

// Memoize ExpirySelector - only re-render when value or onChange changes
export default memo(ExpirySelector, (prev, next) => (
  prev.value === next.value && prev.onChange === next.onChange
))
