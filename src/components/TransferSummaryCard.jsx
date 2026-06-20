import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Shield, Link, Copy, Eye, EyeOff, Download, CheckCircle2, Check } from 'lucide-react'
import { formatBytes } from '../utils/format'

export default function TransferSummaryCard({ meta, url, onCopy }) {
  if (!meta) return null

  const [copied, setCopied] = useState(false)
  const [copiedPw, setCopiedPw] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const fileCount = Array.isArray(meta.files) ? meta.files.length : 0
  const isTextShare = fileCount === 1 && meta.files[0]?.name?.endsWith('.txt')
  const isExpired = meta?.status === 'EXPIRED'

  return (
    <motion.div
      className="surface-card p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>
            {isExpired ? 'Files Expired' : (isTextShare ? 'Text snippet shared' : 'Files ready to download')}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
            {fileCount} {fileCount === 1 ? 'item' : 'items'} · {formatBytes(meta.totalSize || 0)}
          </p>
        </div>
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center" 
          style={{ background: isExpired ? 'var(--danger-soft)' : 'var(--success-soft)' }}
        >
          {isExpired ? <Clock size={20} style={{ color: 'var(--danger)' }} /> : <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-sunken)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} style={{ color: 'var(--text-4)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Status</span>
          </div>
          <span className="text-xs font-medium" style={{ color: isExpired ? 'var(--danger)' : 'var(--text-2)' }}>
            {isExpired ? 'Expired' : (!meta.status || meta.status === 'ACTIVE' ? 'Available' : meta.status)}
          </span>
        </div>
        
        <div className="p-3 rounded-xl" style={{ background: 'var(--bg-sunken)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Shield size={12} style={{ color: 'var(--text-4)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Security</span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
            {meta.passwordProtected ? 'Password required' : meta.burnAfterDownload ? 'Burns after download' : 'Standard'}
          </span>
        </div>
      </div>

      {meta.passwordProtected && meta.plaintextPassword && (
        <div className="mb-5 p-3 rounded-xl border border-dashed flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-4)' }}>Transfer Password</div>
            <div className="text-sm font-mono" style={{ color: 'var(--text)' }}>
              {showPassword ? meta.plaintextPassword : '••••••••'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} style={{ color: 'var(--text-3)' }} /> : <Eye size={16} style={{ color: 'var(--text-3)' }} />}
            </button>
            <button
              onClick={() => {
                import('../utils/clipboard').then(({ copyToClipboard }) => {
                  copyToClipboard(meta.plaintextPassword).then(success => {
                    if (success) {
                      setCopiedPw(true)
                      setTimeout(() => setCopiedPw(false), 2000)
                    }
                  })
                })
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Copy password"
            >
              {copiedPw ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} style={{ color: 'var(--text-3)' }} />}
            </button>
          </div>
        </div>
      )}

      <div className="relative group">
        <div 
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isExpired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
          onClick={() => {
            if (isExpired) return
            import('../utils/clipboard').then(({ copyToClipboard }) => {
              copyToClipboard(url).then(success => {
                if (success) {
                  setCopied(true)
                  if (onCopy) onCopy()
                  setTimeout(() => setCopied(false), 2000)
                }
              })
            })
          }}
        >
          <Link size={16} style={{ color: 'var(--accent)' }} />
          <div className="flex-1 truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
            {url.replace(/^https?:\/\//, '')}
          </div>
          {copied ? (
            <Check size={16} style={{ color: 'var(--success)' }} />
          ) : (
            !isExpired && <Copy size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-3)' }} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
