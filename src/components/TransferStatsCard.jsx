import React from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, Activity } from 'lucide-react'

export default function TransferStatsCard({ downloadCount, viewCount = 0 }) {
  return (
    <motion.div
      className="surface-card p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} style={{ color: 'var(--text)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Transfer Activity
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <Download size={14} style={{ color: 'var(--text-3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Downloads</span>
          </div>
          <span className="text-2xl font-display font-bold" style={{ color: 'var(--text)' }}>
            {downloadCount || 0}
          </span>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye size={14} style={{ color: 'var(--text-3)' }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Views</span>
          </div>
          <span className="text-2xl font-display font-bold" style={{ color: 'var(--text)' }}>
            {viewCount || 0}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
