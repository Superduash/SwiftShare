import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Archive, Files, Flame, Sparkles } from 'lucide-react'
import { formatBytes } from '../utils/format'

export default function DownloadChoiceModal({
  open,
  onClose,
  filesCount = 0,
  totalSize = 0,
  isBurnMode = false,
  onDownloadZip,
  onDownloadSeparate,
}) {
  // ESC to close
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.()
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-choice-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
            className="relative w-full max-w-md surface-card p-6 shadow-2xl rounded-2xl z-10 border border-[var(--border)] overflow-hidden"
            style={{ background: 'var(--bg-elevated, #161822)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3
                  id="download-choice-title"
                  className="font-display font-bold text-lg"
                  style={{ color: 'var(--text)' }}
                >
                  Download All Files
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {filesCount} {filesCount === 1 ? 'file' : 'files'} · {formatBytes(totalSize)}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon !w-8 !h-8 cursor-pointer"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Burn mode notice if applicable */}
            {isBurnMode && (
              <div
                className="flex items-center gap-2 p-2.5 rounded-xl mb-4 text-xs font-medium"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <Flame size={15} className="shrink-0" />
                <span>Single-use transfer: downloading as ZIP is recommended.</span>
              </div>
            )}

            <p className="text-xs mb-3 font-medium" style={{ color: 'var(--text-4)' }}>
              Choose how you would like to download your files:
            </p>

            {/* Options */}
            <div className="space-y-3 mb-5">
              {/* Option 1: ZIP Archive */}
              <button
                type="button"
                onClick={() => {
                  onClose?.()
                  onDownloadZip?.()
                }}
                className="w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 group hover:border-[var(--accent)] hover:shadow-md"
                style={{
                  background: 'var(--bg-sunken, rgba(255,255,255,0.03))',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Archive size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                      Download as ZIP
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      <Sparkles size={10} /> Recommended
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-4)' }}>
                    Single compressed archive (.zip) containing all files. Fast and tidy.
                  </p>
                </div>
              </button>

              {/* Option 2: Separate Files */}
              <button
                type="button"
                onClick={() => {
                  onClose?.()
                  onDownloadSeparate?.()
                }}
                className="w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 group hover:border-[var(--accent)] hover:shadow-md"
                style={{
                  background: 'var(--bg-sunken, rgba(255,255,255,0.03))',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
                >
                  <Files size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    Download as Separate Files
                  </span>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-4)' }}>
                    Downloads each file individually into your device's download folder.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-ghost text-xs px-4 py-2 cursor-pointer"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
