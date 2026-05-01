import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText, User, HardDrive, Hash, Flame } from 'lucide-react'
import { formatBytes } from '../utils/format'

export default function TransferReceipt({ code, files, senderDevice, totalSize, burnAfterDownload }) {
  const items = [
    { icon: Hash, label: 'Transfer code', value: code },
    { icon: FileText, label: 'Files', value: files?.length ? files.map(f => f.name).join(', ') : 'Unknown' },
    { icon: HardDrive, label: 'Total size', value: formatBytes(totalSize || 0) },
    { icon: User, label: 'Sender', value: senderDevice || 'Unknown device' },
  ]

  return (
    <motion.div
      className="surface-card p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
        <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>Transfer Receipt</h3>
      </div>

      <div className="space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-4)' }} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>{label}</p>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-2)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {burnAfterDownload && (
        <div
          className="mt-4 p-2.5 rounded-lg flex items-center justify-center gap-2"
          style={{ background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.20)' }}
          role="status"
        >
          <Flame size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} aria-hidden="true" />
          <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
            This file has been permanently deleted (burn after download)
          </p>
        </div>
      )}
    </motion.div>
  )
}
