// ✅ File Preview Modal - FIXED & RESTORED 2026
// Supports: image, video, audio, PDF, DOCX, code with proper error handling
import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Download, ExternalLink, FileText, Lock, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { previewUrl } from '../services/api'

function getPreviewType(file) {
  const mime = String(file?.mimeType || file?.type || '').toLowerCase()
  const name = String(file?.name || '').toLowerCase()

  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|ico)$/i.test(name)) return 'image'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|ogv)$/i.test(name)) return 'video'
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|opus|flac|wma)$/i.test(name)) return 'audio'
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx'
  if (mime.includes('presentationml') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'pptx'
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('xml') ||
    mime.includes('yaml') ||
    /\.(js|jsx|ts|tsx|py|java|cpp|c|h|go|rs|rb|php|css|html|md|txt|log|sql|json|yaml|yml|xml|csv)$/i.test(name)
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

// ── forceAudible ──────────────────────────────────────────────────────────
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
  // (especially when the embedded PDF viewer is a plugin) and some media
  // elements never fire onLoadedMetadata on slow mobile networks. After 6s
  // we clear the shimmer so the user can interact with whatever has loaded.
  useEffect(() => {
    if (!open || !loading) return undefined
    const timer = setTimeout(() => setLoading(false), 6000)
    return () => clearTimeout(timer)
  }, [open, file, loading])

  // ── Imperatively unmute / set volume once the media element is mounted ──
  // We do this via ref so it is completely decoupled from React's render
  // cycle and the unreliable `muted` JSX attribute.  We fire on every
  // open/file/loading change so it runs both on first render and whenever
  // the media loads (onLoadedMetadata already calls forceAudible, but this
  // ref-based effect is the belt-and-suspenders for browsers that don't
  // fire onLoadedMetadata before the user presses play).
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

          <div className="p-4 overflow-auto max-h-[calc(90vh-72px)]">
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle size={40} style={{ color: 'var(--warning)' }} className="mb-3" />
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Preview failed to load</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try downloading the file instead.</p>
              </div>
            ) : type === 'image' ? (
              <div className="flex items-center justify-center min-h-[200px] relative">
                {loading && <div className="absolute inset-0 flex items-center justify-center"><div className="shimmer-block w-full h-48 rounded-xl" /></div>}
                <img
                  src={src}
                  alt={file.name || 'Preview'}
                  className="max-w-full max-h-[65vh] object-contain rounded-xl"
                  style={{ display: loading ? 'none' : 'block' }}
                  loading="eager"
                  onLoad={() => setLoading(false)}
                  onError={() => { setLoading(false); setError(true) }}
                />
              </div>
            ) : type === 'pdf' ? (
              // PDF iframe must stay mounted from first render — many browsers
              // never fire onLoad for the embedded PDF plugin if the iframe
              // is display:none at mount time, which left the shimmer stuck.
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
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="shimmer-block w-full h-full rounded-xl" />
                  </div>
                )}
              </div>
            ) : type === 'video' ? (
              // ── VIDEO ─────────────────────────────────────────────────────────
              // CRITICAL: Never use display:none on a video element.
              //
              // iOS Safari and Chrome Android suppress the AUDIO OUTPUT PIPELINE
              // for media elements that are hidden with display:none at the time
              // the media is loaded.  When the element later becomes visible, the
              // video frames render (the GPU decode path is separate) but the
              // audio channel was never attached to the output device — producing
              // exactly the symptom: seek-bar moves, picture plays, zero sound.
              //
              // Fix: use opacity:0 + pointer-events:none while loading.  The
              // element stays in the layout tree so the browser initialises the
              // full media pipeline (including audio) from the start.  The
              // shimmer overlay covers it visually until onLoadedMetadata fires.
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
                  preload="auto"
                  className="max-w-full max-h-[65vh] rounded-xl"
                  style={{
                    background: '#000',
                    // opacity-based hide — keeps audio pipeline alive, unlike display:none
                    opacity: loading ? 0 : 1,
                    // Prevent interaction with the invisible element while loading
                    pointerEvents: loading ? 'none' : 'auto',
                    transition: 'opacity 0.15s ease',
                    display: 'block',
                  }}
                  onLoadedMetadata={(e) => {
                    forceAudible(e.target)
                    setLoading(false)
                  }}
                  onCanPlay={(e) => {
                    forceAudible(e.target)
                  }}
                  onPlay={(e) => {
                    forceAudible(e.target)
                  }}
                  onError={() => { setLoading(false); setError(true) }}
                  src={src}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : type === 'audio' ? (
              // ── AUDIO ─────────────────────────────────────────────────────────
              // Same fix as video: opacity:0 instead of display:none.
              // Mobile browsers (especially iOS Safari) disable the audio output
              // context for display:none audio elements.  The result: the native
              // playback bar moves but no sound comes out.  Keeping the element
              // in the layout with opacity:0 keeps the audio context alive.
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
                  style={{
                    // opacity-based hide — same reasoning as video above
                    opacity: loading ? 0 : 1,
                    pointerEvents: loading ? 'none' : 'auto',
                    transition: 'opacity 0.15s ease',
                    display: 'block',
                  }}
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
                  onError={() => { setLoading(false); setError(true) }}
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
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
              <CodePreview src={previewSrc} onError={() => setError(true)} onLoad={() => setLoading(false)} />
            ) : (
              renderFallback()
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
