import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText, User, HardDrive, Hash, Flame, Download, Zap, Clock } from 'lucide-react'
import { formatBytes } from '../utils/format'

function TransferReceipt({ code, files, senderDevice, totalSize, burnAfterDownload, receipt, onDownloadSingle, onDownloadAll }) {
  const hasMultipleFiles = Array.isArray(files) && files.length > 1

  const metaItems = [
    { icon: Hash,      label: 'Transfer code', value: code },
    { icon: User,      label: 'Sent by',        value: senderDevice || 'Unknown device' },
    { icon: HardDrive, label: 'Total size',     value: formatBytes(totalSize || 0) },
    receipt?.speed ? { icon: Zap,   label: 'Download speed', value: receipt.speed } : null,
    receipt?.duration ? { icon: Clock, label: 'Time taken',  value: receipt.duration } : null,
  ].filter(Boolean)

  return (
    <motion.div
      className="surface-card p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
        <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
          Transfer complete
        </h3>
      </div>

      {/* Meta stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        {metaItems.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2 min-w-0">
            <Icon size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--text-4)' }} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>{label}</p>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-2)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-file list */}
      {Array.isArray(files) && files.length > 0 && (
        <div className="space-y-1.5 mb-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>
            <FileText size={10} className="inline mr-1" />
            Files ({files.length})
          </p>
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{f.name || f.originalName || `File ${i + 1}`}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs" style={{ color: 'var(--text-4)' }}>{formatBytes(f.size || f.fileSize || 0)}</span>
                {onDownloadSingle && (
                  <button
                    className="btn-ghost !py-0.5 !px-2 text-xs gap-1"
                    onClick={() => onDownloadSingle(i)}
                    title={`Download ${f.name || f.originalName}`}
                  >
                    <Download size={11} /> Save
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Burn notice */}
      {burnAfterDownload && (
        <div
          className="p-2.5 rounded-lg flex items-center justify-center gap-2 mb-3"
          style={{ background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.20)' }}
          role="status"
        >
          <Flame size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} aria-hidden="true" />
          <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
            Burn session claimed — files will self-destruct when you leave this page
          </p>
        </div>
      )}

      {/* Re-download button (non-burn only) */}
      {onDownloadAll && (
        <button
          className="btn-secondary w-full text-sm gap-2 mt-1"
          onClick={onDownloadAll}
        >
          <Download size={14} />
          {hasMultipleFiles ? 'Download all again' : 'Download again'}
        </button>
      )}
    </motion.div>
  )
}

export default memo(TransferReceipt)
