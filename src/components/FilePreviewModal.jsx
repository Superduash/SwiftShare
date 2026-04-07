import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText, AlertTriangle } from 'lucide-react'
import { previewUrl } from '../services/api'

function getPreviewType(file) {
  const mime = (file?.mimeType || file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('xml') ||
    mime.includes('yaml') ||
    /\.(js|jsx|ts|tsx|py|java|cpp|c|h|go|rs|rb|php|css|html|md|txt|log|sql|json|yaml|yml|xml|csv)$/i.test(name)
  ) return 'code'
  return 'unsupported'
}

export default function FilePreviewModal({ open, onClose, file, code, fileIndex, onDownload }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  // Reset state when file changes
  React.useEffect(() => {
    if (open && file) {
      setError(false)
      setLoading(true)
    }
  }, [open, file, fileIndex])

  if (!open || !file) return null

  const type = getPreviewType(file)
  const src = previewUrl(code, fileIndex)

  function openInNewTab() {
    if (!src) return
    window.open(src, '_blank', 'noopener,noreferrer')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden w-full max-w-3xl max-h-[85vh] flex flex-col"
            style={{ background: 'var(--bg-raised)' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {file.name || `File ${fileIndex + 1}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onDownload && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => onDownload(fileIndex)}
                  >
                    <Download size={14} /> Download
                  </button>
                )}
                <button className="btn-icon" onClick={onClose} aria-label="Close preview">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--bg-sunken)' }}>
              {error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle size={32} style={{ color: 'var(--warning)' }} className="mb-3" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Preview unavailable</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>This file type can't be previewed</p>
                  {onDownload && (
                    <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                      <Download size={14} /> Download instead
                    </button>
                  )}
                  <button className="btn-ghost text-sm mt-2" onClick={openInNewTab}>
                    Open in new tab
                  </button>
                </div>
              ) : type === 'image' ? (
                <div className="flex items-center justify-center min-h-[200px] relative">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="shimmer-block w-full h-48 rounded-xl" />
                    </div>
                  )}
                  <img
                    src={src}
                    alt={file.name || 'Preview'}
                    className="max-w-full max-h-[65vh] object-contain rounded-xl"
                    style={{ display: loading ? 'none' : 'block' }}
                    loading="lazy"
                    onLoad={() => setLoading(false)}
                    onError={() => { setLoading(false); setError(true) }}
                  />
                </div>
              ) : type === 'pdf' ? (
                <div className="relative" style={{ height: '65vh' }}>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="shimmer-block w-full h-full rounded-xl" />
                    </div>
                  )}
                  <iframe
                    src={src}
                    className="w-full h-full rounded-xl"
                    style={{ border: 'none', display: loading ? 'none' : 'block' }}
                    title={file.name || 'PDF Preview'}
                    onLoad={() => setLoading(false)}
                    onError={() => { setLoading(false); setError(true) }}
                  />
                </div>
              ) : type === 'video' ? (
                <div className="flex items-center justify-center">
                  <video
                    controls
                    className="max-w-full max-h-[65vh] rounded-xl"
                    style={{ background: '#000' }}
                    onLoadedData={() => setLoading(false)}
                    onError={() => { setLoading(false); setError(true) }}
                  >
                    <source src={src} type={file.mimeType || file.type || 'video/mp4'} />
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : type === 'code' ? (
                <CodePreview src={src} onError={() => setError(true)} onLoad={() => setLoading(false)} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText size={40} style={{ color: 'var(--text-4)' }} className="mb-3" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    No preview available
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    This file type ({file.mimeType || file.type || 'unknown'}) can't be previewed in the browser
                  </p>
                  {onDownload && (
                    <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                      <Download size={14} /> Download to view
                    </button>
                  )}
                  <button className="btn-ghost text-sm mt-2" onClick={openInNewTab}>
                    Open in new tab
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CodePreview({ src, onError, onLoad }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    if (!src) return
    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error('Failed')
        return r.text()
      })
      .then(text => {
        setContent(text.slice(0, 50000)) // limit preview
        setLoading(false)
        onLoad?.()
      })
      .catch(() => {
        setLoading(false)
        onError?.()
      })
  }, [src, onError, onLoad])

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <div className="shimmer-block h-4 w-full" />
        <div className="shimmer-block h-4 w-3/4" />
        <div className="shimmer-block h-4 w-1/2" />
      </div>
    )
  }

  if (!content) return null

  return (
    <pre
      className="text-xs leading-relaxed p-4 rounded-xl overflow-auto max-h-[65vh]"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        tabSize: 4,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content}
    </pre>
  )
}
