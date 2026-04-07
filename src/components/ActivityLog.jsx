import React from 'react'
import { motion } from 'framer-motion'
import { Upload, Eye, Download, Clock, RefreshCw } from 'lucide-react'

function getEventConfig(event) {
  switch (event) {
    case 'uploaded': return { color: '#10B981', Icon: Upload, label: 'Uploaded' }
    case 'viewed': return { color: '#3B82F6', Icon: Eye, label: 'Viewed' }
    case 'downloaded': return { color: '#22D3EE', Icon: Download, label: 'Downloaded' }
    case 'expired': return { color: '#EF4444', Icon: Clock, label: 'Expired' }
    case 'extended': return { color: '#F59E0B', Icon: RefreshCw, label: 'Extended' }
    default: return { color: '#94A3B8', Icon: Clock, label: event }
  }
}

function timeAgo(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export default function ActivityLog({ activity = [] }) {
  if (!activity.length) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-text-primary font-bold text-sm mb-3">Activity</h3>
        <p className="text-text-dim text-xs text-center py-3">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-text-primary font-bold text-sm mb-4">Activity</h3>
      <div className="space-y-3">
        {[...activity].reverse().map((item, i) => {
          const { color, Icon, label } = getEventConfig(item.event)
          return (
            <motion.div
              key={i}
              className="flex items-start gap-3"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className="event-dot mt-1.5 flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                  <span className="text-text-dim text-xs flex-shrink-0">{timeAgo(item.timestamp)}</span>
                </div>
                {item.device && (
                  <p className="text-text-dim text-xs truncate mt-0.5">{item.device}</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
