import React from 'react'
import { motion } from 'framer-motion'
import { History, Upload, Download, Eye, Trash2, Clock, Smartphone } from 'lucide-react'
import { timeAgo } from '../utils/format'

const EVENT_ICONS = {
  uploaded: { icon: Upload, color: 'var(--success)' },
  downloaded: { icon: Download, color: 'var(--info)' },
  viewed: { icon: Eye, color: 'var(--accent)' },
  expired: { icon: Clock, color: 'var(--warning)' },
  deleted: { icon: Trash2, color: 'var(--danger)' },
}

function getEventStyle(event) {
  const key = (event || '').toLowerCase()
  for (const [k, v] of Object.entries(EVENT_ICONS)) {
    if (key.includes(k)) return v
  }
  return { icon: Smartphone, color: 'var(--text-3)' }
}

export default function ActivityLog({ activity = [] }) {
  if (!activity.length) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History size={14} style={{ color: 'var(--text-3)' }} />
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Activity</h3>
      </div>

      <div className="space-y-1.5">
        {activity.slice(0, 8).map((item, idx) => {
          const { icon: Icon, color } = getEventStyle(item.event)
          return (
            <motion.div
              key={idx}
              className="surface-card-flat px-3 py-2.5 flex items-center gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-2)' }}>
                  {item.message || item.event || 'Event'}
                </p>
                {item.device && (
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-4)' }}>{item.device}</p>
                )}
              </div>
              <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-4)' }}>
                {timeAgo(item.timestamp || item.createdAt)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
