import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Download, ExternalLink, FileText, Lock, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { previewUrl } from '../services/api'

function getPreviewType(file) {
  const mime = String(file?.mimeType || file?.type || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()

  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|ico|tiff?|jfif|pjpeg|pjp)$/i.test(name)) return 'image'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|ogv|3gp|3g2|ts|mts|m2ts)$/i.test(name)) return 'video'
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|opus|flac|wma|aiff?|caf|mid|midi)$/i.test(name)) return 'audio'
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx'
  if (mime.includes('presentationml') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'pptx'
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('xml') ||
    mime.includes('yaml') ||
    /\.(js|jsx|ts|tsx|py|java|cpp|c|h|go|rs|rb|php|css|html|md|txt|log|sql|json|yaml|yml|xml|csv|sh|bash|zsh|ps1|toml|ini|cfg|conf|env|gitignore|dockerfile|makefile|vue|svelte|kt|swift|r|dart|lua|perl|pl|scala|ex|exs|erl|clj|fs|fsx|fsi|hs|elm|ml|mli|nim|zig)$/i.test(name)
  ) {
    return 'code'
  }

  return 'unsupported'
}

function getDocxPreviewUrl(src) {
  if (!src) return ''
  const queryStart = src.indexOf('?')
  if (queryStart === -1) return `${src}/docx-html`
  return `${src.slice(0, queryStart)}/docx-html${src.slice(queryStart)}`
}

// Sets the DOM property directly (not via React prop) because React's `muted`
// JSX prop is unreliable — it sets the HTML attribute but does not always sync
// the reflected DOM property, especially on iOS Safari.
function forceAudible(mediaEl) {
  if (!mediaEl) return
  try {
    mediaEl.defaultMuted = false
    mediaEl.muted = false
    mediaEl.volume = 1
  } catch {
    // Some browsers throw on volume assignment without a user gesture; ignore.
  }
}

function CodePreview({ src, onError, onLoad }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    if (!src) {
      onError?.()
      return undefined
    }

    const controller = new AbortController()

    const run = async () => {
      try {
        const response = await fetch(src, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const text = await response.text()
        if (controller.signal.aborted) return

        const PREVIEW_LIMIT = 50000
        setTruncated(text.length > PREVIEW_LIMIT)
        setContent(text.slice(0, PREVIEW_LIMIT))
        onLoad?.()
      } catch {
        if (!controller.signal.aborted) {
          onError?.()
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => controller.abort()
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

  return (
    <div className="space-y-2">
      {truncated && (
        <div className="px-4 py-2 rounded-xl text-xs" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
          Preview limited to first 50KB. Download for the full file.
        </div>
      )}
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
    </div>
  )
}

export default function FilePreviewModal({ open, onClose, file, code, fileIndex, onDownload, password, passwordRequired }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    setError(false)
    setLoading(true)
  }, [file, open])

  // Hard fallback: some browsers never fire onLoad for PDF/iframe content
  // and some media elements never fire onLoadedMetadata on slow mobile networks.
  // After 8s we clear the shimmer so the user can interact with whatever has loaded.
  useEffect(() => {
    if (!open || !loading) return undefined
    const type = file ? getPreviewType(file) : null
    // Images and code manage their own loading state — only apply the timer for media/PDF/DOCX
    if (type === 'image' || type === 'code' || type === 'unsupported' || type === 'pptx') return undefined
    const timer = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(timer)
  }, [open, file, loading])

  // Imperatively unmute / set volume once the media element is mounted.
  // Fires on every open/file/loading change so it runs both on first render
  // and whenever the media loads.
  useEffect(() => {
    if (!open) return
    const type = file ? getPreviewType(file) : null
    if (type === 'video' && videoRef.current) forceAudible(videoRef.current)
    if (type === 'audio' && audioRef.current) forceAudible(audioRef.current)
  }, [open, file, loading])

  if (!open || !file) return null

  const type = getPreviewType(file)
  const src = previewUrl(code, fileIndex, password)
  const previewSrc = type === 'docx' ? getDocxPreviewUrl(src) : src

  const openInNewTab = () => {
    try {
      const newWindow = window.open(src, '_blank', 'noopener,noreferrer')
      if (!newWindow) toast.error('Popup blocked. Please allow popups to open the file.')
    } catch {
      toast.error('Unable to open preview')
    }
  }

  const renderFallback = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText size={40} style={{ color: 'var(--text-4)' }} className="mb-3" />
      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No preview available</p>
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
  )

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{file.name || 'Preview'}</p>
                {passwordRequired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <Lock size={12} /> Protected
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{file.mimeType || file.type || 'unknown type'}</p>
            </div>

            <div className="flex items-center gap-2">
              {onDownload && (
                <button className="btn-ghost text-sm" onClick={() => onDownload(fileIndex)}>
                  <Download size={14} /> Download
                </button>
              )}
              <button className="btn-ghost text-sm" onClick={openInNewTab}>
                <ExternalLink size={14} /> New tab
              </button>
              <button className="btn-ghost text-sm" onClick={onClose}>
                <X size={16} /> Close
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-auto max-h-[calc(90vh-72px)]">
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle size={40} style={{ color: 'var(--warning)' }} className="mb-3" />
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Preview failed to load</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try downloading the file instead.</p>
                {onDownload && (
                  <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                    <Download size={14} /> Download file
                  </button>
                )}
                <button className="btn-ghost text-sm mt-2" onClick={openInNewTab}>
                  Open in new tab
                </button>
              </div>
            ) : type === 'image' ? (
              // IMAGE: use opacity-based hide, same pattern as video/audio,
              // so the loading shimmer is replaced by the image once loaded.
              <div className="flex items-center justify-center min-h-[200px] relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="shimmer-block w-full h-48 rounded-xl" />
                  </div>
                )}
                <img
                  src={src}
                  alt={file.name || 'Preview'}
                  className="max-w-full max-h-[65vh] object-contain rounded-xl"
                  style={{
                    opacity: loading ? 0 : 1,
                    transition: 'opacity 0.15s ease',
                    display: 'block',
                  }}
                  loading="eager"
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setError(true) }}
                />
              </div>
            ) : type === 'pdf' ? (
              // PDF: iframe must always be mounted — browsers won't fire onLoad if
              // the iframe is hidden at mount time. The shimmer overlays it via
              // pointer-events:none and disappears once onLoad fires (or after 8s timeout).
              <div className="relative" style={{ height: '65vh' }}>
                <iframe
                  src={`${src}#view=FitH`}
                  className="w-full h-full rounded-xl"
                  style={{ border: 'none', display: 'block', background: 'var(--bg-sunken)' }}
                  title={file.name || 'PDF Preview'}
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setError(true) }}
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl overflow-hidden">
                    <div className="shimmer-block w-full h-full rounded-xl" />
                  </div>
                )}
              </div>
            ) : type === 'video' ? (
              // VIDEO playback rules:
              //   1. Never use display:none — iOS Safari and Chrome Android suppress
              //      the AUDIO OUTPUT PIPELINE for media hidden at load time. Use
              //      opacity:0 + pointer-events:none instead.
              //   2. NEVER set crossOrigin="anonymous". Browsers play cross-origin
              //      media without it. Adding it forces strict CORS validation that
              //      fails on any header mismatch and produces a phantom error event
              //      that takes down the whole player even when playback would work.
              //   3. onError is only authoritative AFTER the element exposes a real
              //      MediaError on `el.error`. Transient range-fetch retries fire
              //      error events without populating `el.error.code` — those must be
              //      ignored or every slow network blip triggers "Preview failed".
              <div className="flex items-center justify-center relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="shimmer-block w-full h-64 rounded-xl" />
                  </div>
                )}
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-w-full max-h-[65vh] rounded-xl"
                  style={{
                    background: '#000',
                    opacity: loading ? 0 : 1,
                    pointerEvents: loading ? 'none' : 'auto',
                    transition: 'opacity 0.15s ease',
                    display: 'block',
                  }}
                  onLoadedMetadata={(e) => { forceAudible(e.target); setLoading(false) }}
                  onCanPlay={(e) => { forceAudible(e.target); setLoading(false) }}
                  onPlay={(e) => forceAudible(e.target)}
                  onError={(e) => {
                    // Only treat as fatal if the browser actually populated a real
                    // MediaError. Transient range-fetch hiccups fire error events
                    // without setting el.error and must NOT take the player down.
                    const code = e.currentTarget?.error?.code
                    // 3 = MEDIA_ERR_DECODE, 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — fatal
                    if (code === 3 || code === 4) {
                      setLoading(false)
                      setError(true)
                    }
                  }}
                  src={src}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : type === 'audio' ? (
              // AUDIO playback — same rules as video (see comment block above).
              // No crossOrigin. Lenient onError. opacity-based loading.
              <div className="flex items-center justify-center min-h-[120px] relative">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="shimmer-block w-full h-16 rounded-xl" />
                  </div>
                )}
                <audio
                  ref={audioRef}
                  controls
                  preload="metadata"
                  className="w-full max-w-xl"
                  style={{
                    opacity: loading ? 0 : 1,
                    pointerEvents: loading ? 'none' : 'auto',
                    transition: 'opacity 0.15s ease',
                    display: 'block',
                  }}
                  onLoadedMetadata={(e) => { forceAudible(e.target); setLoading(false) }}
                  onLoadedData={(e) => { forceAudible(e.target); setLoading(false) }}
                  onCanPlay={(e) => { forceAudible(e.target); setLoading(false) }}
                  onPlay={(e) => forceAudible(e.target)}
                  onError={(e) => {
                    const code = e.currentTarget?.error?.code
                    if (code === 3 || code === 4) {
                      setLoading(false)
                      setError(true)
                    }
                  }}
                  src={src}
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : type === 'docx' ? (
              <div className="relative" style={{ height: '65vh' }}>
                <iframe
                  src={previewSrc}
                  className="w-full h-full rounded-xl"
                  style={{ border: 'none', display: 'block', background: 'var(--bg-sunken)' }}
                  title={file.name || 'DOCX Preview'}
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setError(true) }}
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl overflow-hidden">
                    <div className="shimmer-block w-full h-full rounded-xl" />
                  </div>
                )}
              </div>
            ) : type === 'pptx' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle size={32} style={{ color: 'var(--warning)' }} className="mb-3" />
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>PowerPoint preview is not supported in-browser</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Use open in new tab or download to view this file</p>
                {onDownload && (
                  <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                    <Download size={14} /> Download instead
                  </button>
                )}
                <button className="btn-ghost text-sm mt-2" onClick={openInNewTab}>
                  Open in new tab
                </button>
              </div>
            ) : type === 'code' ? (
              <CodePreview src={previewSrc} onError={() => { setError(true); setLoading(false) }} onLoad={() => setLoading(false)} />
            ) : (
              renderFallback()
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
