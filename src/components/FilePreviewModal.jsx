import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Download, ExternalLink, FileText, Lock, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { previewUrl } from '../services/api'
import { getPreviewType } from '../utils/preview'

function getDocxPreviewUrl(src) {
  if (!src) return ''
  const queryStart = src.indexOf('?')
  if (queryStart === -1) return `${src}/docx-html`
  return `${src.slice(0, queryStart)}/docx-html${src.slice(queryStart)}`
}

// React's `muted` JSX prop is unreliable on iOS Safari — set the DOM properties
// directly via ref so unmuting always sticks.
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

function canBrowserPlay(file, kind) {
  if (typeof document === 'undefined') return true
  const mime = String(file?.mimeType || file?.type || '').toLowerCase().split(';')[0].trim()
  if (!mime) return true

  const el = document.createElement(kind)
  if (!el || typeof el.canPlayType !== 'function') return true

  const capability = el.canPlayType(mime)
  return capability === 'probably' || capability === 'maybe'
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
  // Note: media (video / audio) DELIBERATELY do not use these states.
  // The native HTML5 player handles its own loading and error UX better than
  // any overlay we could build, and aggressively replacing it with an error
  // screen prevents the user from ever recovering or trying playback again.
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mediaError, setMediaError] = useState(false)
  const [mediaTry, setMediaTry] = useState(0)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    setError(false)
    setLoading(true)
    setMediaError(false)
    setMediaTry(0)
  }, [file, open])

  // Hard fallback for non-media (PDF/DOCX iframe) which can fail to fire onLoad
  // on some browser/plugin combinations. After 8s drop the shimmer so the user
  // can interact with whatever has loaded.
  useEffect(() => {
    if (!open || !loading) return undefined
    const type = file ? getPreviewType(file) : null
    if (type === 'image' || type === 'code' || type === 'unsupported' || type === 'video' || type === 'audio') return undefined
    const timer = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(timer)
  }, [open, file, loading])

  // Imperatively unmute / set volume once the media element is mounted.
  useEffect(() => {
    if (!open) return
    const type = file ? getPreviewType(file) : null
    if (type === 'video' && videoRef.current) forceAudible(videoRef.current)
    if (type === 'audio' && audioRef.current) forceAudible(audioRef.current)
  }, [open, file])

  if (!open || !file) return null

  const type = getPreviewType(file)
  const src = previewUrl(code, fileIndex, password)
  const mediaSrc = mediaTry > 0 ? `${src}${src.includes('?') ? '&' : '?'}_previewTry=${mediaTry}` : src
  const previewSrc = type === 'docx' ? getDocxPreviewUrl(src) : src
  const canPlayVideo = type !== 'video' || canBrowserPlay(file, 'video')
  const canPlayAudio = type !== 'audio' || canBrowserPlay(file, 'audio')

  const retryMedia = () => {
    setMediaError(false)
    setMediaTry((prev) => prev + 1)
  }

  const openInNewTab = () => {
    try {
      const newWindow = window.open(src, '_blank', 'noopener,noreferrer')
      if (!newWindow) toast.error('Popup blocked. Please allow popups to open the file.')
    } catch {
      toast.error('Unable to open preview')
    }
  }

  const renderUnsupported = () => (
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

          {/* Body */}
          <div className="p-4 overflow-auto max-h-[calc(90vh-72px)]">
            {/* Image — has its own error fallback */}
            {type === 'image' && (
              error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle size={40} style={{ color: 'var(--warning)' }} className="mb-3" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Image failed to load</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try downloading the file instead.</p>
                  {onDownload && (
                    <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                      <Download size={14} /> Download file
                    </button>
                  )}
                </div>
              ) : (
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
              )
            )}

            {/* PDF — has its own error fallback */}
            {type === 'pdf' && (
              error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle size={40} style={{ color: 'var(--warning)' }} className="mb-3" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>PDF preview unavailable</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Open in a new tab or download to view.</p>
                  {onDownload && (
                    <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                      <Download size={14} /> Download file
                    </button>
                  )}
                  <button className="btn-ghost text-sm mt-2" onClick={openInNewTab}>
                    Open in new tab
                  </button>
                </div>
              ) : (
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
              )
            )}

            {/* VIDEO — never replaced by an error UI.
                Using `src` directly on the video element (NOT a child <source>):
                <source> requires the browser to commit to a specific type up-front,
                and Firefox in particular rejects the entire source list with
                "No video with supported format and MIME type found" if the type
                attribute disagrees with the actual response headers. With `src`
                on the element directly, the browser fetches the resource, reads
                the response Content-Type, and tries to play whatever bytes
                arrive — which is exactly what we want.
                Header buttons (Download / New tab) are always visible above. */}
            {type === 'video' && (
              <div className="flex flex-col items-center justify-center gap-2">
                {!canPlayVideo ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center w-full">
                    <AlertTriangle size={36} style={{ color: 'var(--warning)' }} className="mb-3" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>This browser may not support this video format</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try opening in a new tab or downloading to play in your device player.</p>
                    <div className="flex items-center gap-2 mt-4">
                      <button className="btn-ghost text-sm" onClick={openInNewTab}>
                        <ExternalLink size={14} /> Open in new tab
                      </button>
                      {onDownload && (
                        <button className="btn-primary text-sm" onClick={() => onDownload(fileIndex)}>
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                ) : mediaError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center w-full">
                    <AlertTriangle size={36} style={{ color: 'var(--warning)' }} className="mb-3" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Video preview failed to load</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>This can happen with unstable network or partial stream fetch failures.</p>
                    <div className="flex items-center gap-2 mt-4">
                      <button className="btn-secondary text-sm" onClick={retryMedia}>Try again</button>
                      <button className="btn-ghost text-sm" onClick={openInNewTab}>
                        <ExternalLink size={14} /> New tab
                      </button>
                      {onDownload && (
                        <button className="btn-primary text-sm" onClick={() => onDownload(fileIndex)}>
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      key={mediaSrc}
                      ref={videoRef}
                      controls
                      playsInline
                      preload="metadata"
                      src={mediaSrc}
                      className="max-w-full max-h-[65vh] rounded-xl"
                      style={{ background: '#000', display: 'block', width: '100%' }}
                      onLoadedMetadata={(e) => { setMediaError(false); forceAudible(e.target) }}
                      onCanPlay={(e) => forceAudible(e.target)}
                      onPlay={(e) => forceAudible(e.target)}
                      onError={() => setMediaError(true)}
                    />
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-4)' }}>
                      If playback doesn't start, use Try again, Download, or Open in new tab.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* AUDIO — same approach as video. `src` on the element, no child <source>. */}
            {type === 'audio' && (
              <div className="flex flex-col items-center justify-center gap-3 py-4">
                {!canPlayAudio ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center w-full">
                    <AlertTriangle size={32} style={{ color: 'var(--warning)' }} className="mb-2" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>This browser may not support this audio format</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Open in new tab or download for guaranteed playback.</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button className="btn-ghost text-sm" onClick={openInNewTab}>
                        <ExternalLink size={14} /> Open in new tab
                      </button>
                      {onDownload && (
                        <button className="btn-primary text-sm" onClick={() => onDownload(fileIndex)}>
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                ) : mediaError ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center w-full">
                    <AlertTriangle size={32} style={{ color: 'var(--warning)' }} className="mb-2" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Audio preview failed to load</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button className="btn-secondary text-sm" onClick={retryMedia}>Try again</button>
                      <button className="btn-ghost text-sm" onClick={openInNewTab}>
                        <ExternalLink size={14} /> New tab
                      </button>
                      {onDownload && (
                        <button className="btn-primary text-sm" onClick={() => onDownload(fileIndex)}>
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <audio
                      key={mediaSrc}
                      ref={audioRef}
                      controls
                      preload="metadata"
                      src={mediaSrc}
                      className="w-full max-w-xl"
                      style={{ display: 'block' }}
                      onLoadedMetadata={(e) => { setMediaError(false); forceAudible(e.target) }}
                      onLoadedData={(e) => forceAudible(e.target)}
                      onCanPlay={(e) => forceAudible(e.target)}
                      onPlay={(e) => forceAudible(e.target)}
                      onError={() => setMediaError(true)}
                    />
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-4)' }}>
                      If playback doesn't start, use Try again, Download, or Open in new tab.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* DOCX */}
            {type === 'docx' && (
              error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle size={40} style={{ color: 'var(--warning)' }} className="mb-3" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>DOCX preview unavailable</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Download the file to open it in Word.</p>
                  {onDownload && (
                    <button className="btn-primary text-sm mt-4" onClick={() => onDownload(fileIndex)}>
                      <Download size={14} /> Download file
                    </button>
                  )}
                </div>
              ) : (
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
              )
            )}

            {/* CODE / TEXT */}
            {type === 'code' && (
              <CodePreview src={previewSrc} onError={() => { setError(true); setLoading(false) }} onLoad={() => setLoading(false)} />
            )}

            {/* UNSUPPORTED */}
            {type === 'unsupported' && renderUnsupported()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
