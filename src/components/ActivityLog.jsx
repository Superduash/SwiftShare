import React from 'react'
import { History } from 'lucide-react'

function formatTimestamp(ts) {
  if (!ts) return 'just now'
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return 'just now'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLog({ activity = [] }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <History size={15} style={{ color: '#22D3EE' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Activity</h3>
      </div>

      {!activity.length ? (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>No activity yet.</p>
      ) : (
        <div className="space-y-2">
          {activity.slice(0, 8).map((item, idx) => (
            <div key={idx} className="card-elevated px-3 py-2 text-sm flex items-center justify-between gap-3">
              <span style={{ color: 'var(--text-2)' }}>{item.message || item.event || 'Event'}</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{formatTimestamp(item.timestamp || item.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
