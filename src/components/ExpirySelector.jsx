import React from 'react'
import { Clock } from 'lucide-react'

const OPTIONS = [
  { value: 10, label: '10 min', desc: 'Quick share' },
  { value: 60, label: '1 hour', desc: 'Standard' },
  { value: 300, label: '5 hours', desc: 'Extended' },
]

export default function ExpirySelector({ value = 60, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
        <Clock size={12} />
        Auto-delete after
      </label>
      <div className="flex gap-2">
        {OPTIONS.map(opt => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              className="flex-1 py-2.5 px-3 rounded-xl text-center transition-all"
              style={{
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-3)',
                border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                fontWeight: active ? 600 : 500,
              }}
              onClick={() => onChange(opt.value)}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
