import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText, AlertTriangle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { previewUrl } from '../services/api'

function getPreviewType(file) {
  const mime = (file?.mimeType || file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx'
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

function getDocxPreviewUrl(src) {
  if (!src) return ''
  const queryStart = src.indexOf('?')
  if (queryStart === -1) {
    return `${src}/docx-html`
  }
  return `${src.slice(0, queryStart)}/docx-html${src.slice(queryStart)}`
}

export default function FilePreviewModal({ open, onClose, file, code, fileIndex, onDownload, password, passwordRequired }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  function forceAudible(mediaEl) {
    if (!mediaEl) return
    try {
      mediaEl.defaultMuted = false
      mediaEl.muted = false
      mediaEl.volume = 1.0
    } catch (err) {
      console.error('[FilePreviewModal] Failed to enforce audible media state:', err)
    }
  }

  // Reset state when file changes
  React.useEffect(() => {
    if (open && file) {
      setError(false)
      setLoading(true)
    }
  }, [open, file, fileIndex])

  React.useEffect(() => {
	if (!open || !file) return
	if (getPreviewType(file) !== 'video') return

	// Ensure video is unmuted when modal opens
	const videoEl = videoRef.current
	if (!videoEl) return

	// Add error handling for video loading
	const handleError = (e) => {
		console.error('[FilePreviewModal] Video load error:', e)
		setLoading(false)
		setError(true)
	}

	// Force unmute and set volume
	const handleCanPlay = () => {
    forceAudible(videoEl)
	}
	
	// Some browsers require user interaction before unmuting
	const handlePlay = () => {
    forceAudible(videoEl)
	}
	
	videoEl.addEventListener('error', handleError)
	videoEl.addEventListener('canplay', handleCanPlay)
	videoEl.addEventListener('play', handlePlay)
	
	return () => {
		videoEl.removeEventListener('error', handleError)
		videoEl.removeEventListener('canplay', handleCanPlay)
		videoEl.removeEventListener('play', handlePlay)
	}
  }, [open, file, fileIndex, code, password])

  if (!open || !file) return null

  // If password is required and not yet verified, show a clean gate
  if (passwordRequired) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.75)' }}
              onClick={onClose}
            />
            <motion.div
              className="relative z-10 rounded-2xl overflow-hidden w-full max-w-md flex flex-col"
              style={{ background: 'var(--bg-raised)' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} style={{ color: 'var(--accent)' }} />
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {file.name || `File ${fileIndex + 1}`}
                  </p>
                </div>
                <button className="btn-icon" onClick={onClose} aria-label="Close preview">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center" style={{ background: 'var(--bg-sunken)' }}>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--accent-soft)' }}
                >
                  <Lock size={28} style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  Password required to preview
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Enter the transfer password to unlock previews and downloads
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  const type = getPreviewType(file)
  const src = previewUrl(code, fileIndex, password)
  const docxSrc = getDocxPreviewUrl(src)

  function openInNewTab() {
    if (!src) {
      toast.error('Preview URL not available')
      return
    }
    try {
      const newWindow = window.open(src, '_blank', 'noopener,noreferrer')
      if (!newWindow) {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.')
      }
    } catch (err) {
      toast.error('Failed to open file in new tab')
    }
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
                    loading="eager"
                    onLoad={() => setLoading(false)}
                    onError={() => { 
                      setLoading(false)
                      setError(true)
                    }}
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
                    src={`${src}#view=FitH`}
                    className="w-full h-full rounded-xl"
                    style={{ border: 'none', display: loading ? 'none' : 'block' }}
                    title={file.name || 'PDF Preview'}
                    onLoad={() => setLoading(false)}
                    onError={() => { 
                      setLoading(false)
                      setError(true)
                    }}
                  />
                </div>
              ) : type === 'video' ? (
                <div className="flex items-center justify-center">
                  {loading && (
                    <div className="shimmer-block w-full h-64 rounded-xl" />
                  )}
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    preload="auto"
                    muted={false}
                    className="max-w-full max-h-[65vh] rounded-xl"
                    style={{ background: '#000', display: loading ? 'none' : 'block' }}
                    onLoadedMetadata={(e) => {
						try {
							const videoEl = e.target
							forceAudible(videoEl)
						} catch (err) {
							console.error('[FilePreviewModal] Video metadata load error:', err)
						} finally {
							setLoading(false)
						}
					}}
          onLoadedData={(e) => {
            try {
              const videoEl = e.target
              forceAudible(videoEl)
            } catch (err) {
              console.error('[FilePreviewModal] Video data load error:', err)
            } finally {
              setLoading(false)
            }
          }}
                    onCanPlay={(e) => {
						forceAudible(e.target)
					}}
                    onPlay={(e) => {
						forceAudible(e.target)
					}}
                    onError={(e) => {
						console.error('[FilePreviewModal] Video error:', e)
						setLoading(false)
						setError(true)
					}}
					onLoadStart={() => {
						// Video started loading
						console.log('[FilePreviewModal] Video load started')
					}}
					onStalled={() => {
						// Video stalled - might be network issue
						console.warn('[FilePreviewModal] Video loading stalled')
					}}
					onSuspend={() => {
						// Video suspended - might be intentional pause
						console.log('[FilePreviewModal] Video loading suspended')
					}}
                    src={src}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : type === 'audio' ? (
                <div className="flex items-center justify-center min-h-[120px] relative">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="shimmer-block w-full h-16 rounded-xl" />
                    </div>
                  )}
                  <audio
                    ref={audioRef}
                    controls
                    preload="auto"
                    className="w-full max-w-xl"
                    style={{ display: loading ? 'none' : 'block' }}
                    onLoadedMetadata={(e) => {
                      forceAudible(e.target)
                      setLoading(false)
                    }}
                    onLoadedData={(e) => {
                      forceAudible(e.target)
                      setLoading(false)
                    }}
                    onCanPlay={(e) => {
                      forceAudible(e.target)
                    }}
                    onPlay={(e) => {
                      forceAudible(e.target)
                    }}
                    onError={() => {
                      setLoading(false)
                      setError(true)
                    }}
                    src={src}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : type === 'docx' ? (
                <div className="relative" style={{ height: '65vh' }}>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="shimmer-block w-full h-full rounded-xl" />
                    </div>
                  )}
                  <iframe
                    src={docxSrc}
                    className="w-full h-full rounded-xl"
                    style={{ border: 'none', display: loading ? 'none' : 'block' }}
                    title={file.name || 'DOCX Preview'}
                    sandbox="allow-same-origin"
                    onLoad={() => setLoading(false)}
                    onError={() => {
                      setLoading(false)
                      setError(true)
                    }}
                  />
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
  // Use refs to avoid re-rendering loops from callback deps
  const onErrorRef = useRef(onError)
  const onLoadRef = useRef(onLoad)
  onErrorRef.current = onError
  onLoadRef.current = onLoad

  React.useEffect(() => {
    if (!src) {
      onErrorRef.current?.()
      return
    }
    
    const controller = new AbortController()

    const run = async () => {
      try {
        const response = await fetch(src, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const text = await response.text()
        if (controller.signal.aborted) return
        setContent(text.slice(0, 50000)) // limit preview to 50KB
        onLoadRef.current?.()
      } catch (err) {
        if (controller.signal.aborted) return
        onErrorRef.current?.()
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void run()
    
    return () => controller.abort()
  }, [src])

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
