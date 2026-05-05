import { useEffect, useRef, useState } from 'react'
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
  const [mediaErrorDetail, setMediaErrorDetail] = useState('')
  const [mediaTry, setMediaTry] = useState(0)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const mediaErrorTimer = useRef(null)

  useEffect(() => {
    setError(false)
    setLoading(true)
    setMediaError(false)
    setMediaErrorDetail('')
    setMediaTry(0)
    if (mediaErrorTimer.current) {
      clearTimeout(mediaErrorTimer.current)
      mediaErrorTimer.current = null
    }
  }, [file, open])

  useEffect(() => () => {
    if (mediaErrorTimer.current) clearTimeout(mediaErrorTimer.current)
  }, [])

  const handleMediaError = (event) => {
    if (mediaErrorTimer.current) return
    
    const media = event?.target
    const errCode = media?.error?.code
    const errMsg = media?.error?.message || ''
    const codeNames = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' }
    const codeName = codeNames[errCode] || 'UNKNOWN'
    const detail = errCode ? `ERR_${codeName} (code ${errCode})` : 'unknown error'

    console.error('[SwiftShare Preview] Media error', {
      file: file?.name,
      mime: file?.mimeType || file?.type,
      src: mediaSrc,
      errorCode: errCode,
      errorName: codeName,
      errorMessage: errMsg,
      readyState: media?.readyState,
      networkState: media?.networkState,
      currentSrc: media?.currentSrc,
    })

    // HEAD probe for debugging
    fetch(mediaSrc, { method: 'HEAD' })
      .then(r => {
        const ct = r.headers.get('content-type')
        const acao = r.headers.get('access-control-allow-origin')
        const acceptRanges = r.headers.get('accept-ranges')
        const contentLength = r.headers.get('content-length')
        console.error(`[SwiftShare Preview] URL probe → ${r.status} ${r.statusText} | content-type: ${ct} | ACAO: ${acao} | accept-ranges: ${acceptRanges} | content-length: ${contentLength}`)
        
        if (r.ok && errCode === 4) {
          console.error('[SwiftShare Preview] HEAD succeeded but media failed - likely codec/format issue or CORS')
        }
      })
      .catch(e => console.error('[SwiftShare Preview] URL probe failed:', e.message))

    // 800ms debounce - if error persists, show UI
    mediaErrorTimer.current = setTimeout(() => {
      mediaErrorTimer.current = null
      setMediaErrorDetail(detail)
      setMediaError(true)
    }, 800)
  }

  const cancelMediaError = () => {
    if (mediaErrorTimer.current) {
      clearTimeout(mediaErrorTimer.current)
      mediaErrorTimer.current = null
    }
    if (mediaError) setMediaError(false)
  }

  // Hard fallback for PDF/DOCX iframe loading
  useEffect(() => {
    if (!open || !loading) return undefined
    const type = file ? getPreviewType(file) : null
    if (type === 'image' || type === 'code' || type === 'unsupported' || type === 'video' || type === 'audio') return undefined
    const timer = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(timer)
  }, [open, file, loading])

  // Imperatively unmute media elements
  useEffect(() => {
    if (!open) return
    const type = file ? getPreviewType(file) : null
    if (type === 'video' && videoRef.current) forceAudible(videoRef.current)
    if (type === 'audio' && audioRef.current) forceAudible(audioRef.current)
  }, [open, file])

  const type = file ? getPreviewType(file) : null
  const src = open && file ? previewUrl(code, fileIndex, password) : ''
  const mediaSrc = mediaTry > 0 ? `${src}${src.includes('?') ? '&' : '?'}_previewTry=${mediaTry}` : src
  const previewSrc = type === 'docx' ? getDocxPreviewUrl(src) : src
  const canPlayVideo = type !== 'video' || canBrowserPlay(file, 'video')
  const canPlayAudio = type !== 'audio' || canBrowserPlay(file, 'audio')

  // Detect if media URL is cross-origin (Vercel frontend → Railway backend)
  const isCrossOrigin = typeof window !== 'undefined' && mediaSrc && (() => {
    try {
      const mediaUrl = new URL(mediaSrc, window.location.href)
      return mediaUrl.origin !== window.location.origin
    } catch {
      return false
    }
  })()

  // Log media source for debugging
  useEffect(() => {
    if (open && (type === 'video' || type === 'audio') && mediaSrc) {
      console.log('[SwiftShare Preview] Media source:', {
        type,
        src: mediaSrc,
        isCrossOrigin,
        canPlay: type === 'video' ? canPlayVideo : canPlayAudio,
        fileType: file?.mimeType || file?.type,
      })
    }
  }, [open, type, mediaSrc, isCrossOrigin, canPlayVideo, canPlayAudio, file])

  if (!open || !file) return null

  const retryMedia = () => {
    setMediaError(false)
    setMediaErrorDetail('')
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

            {/* VIDEO — uses ReactPlayer for cross-browser robustness.
                ReactPlayer falls back to native HTML5 <video> for file URLs but
                handles edge cases (HLS, format detection) better than a raw
                element. Error UI only shows after the play attempt actually
                fails and the user has had a chance to interact. */}
            {type === 'video' && (
              <div className="flex flex-col items-center justify-center gap-2">
                {mediaError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center w-full">
                    <AlertTriangle size={36} style={{ color: 'var(--warning)' }} className="mb-3" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Video preview failed to load</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try again, open in a new tab, or download to play in your device's video app.</p>
                    {mediaErrorDetail && (
                      <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--text-4)' }}>{mediaErrorDetail}</p>
                    )}
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
                    <div
                      className="w-full rounded-xl overflow-hidden"
                      style={{ background: '#000', aspectRatio: '16 / 9', maxHeight: '65vh' }}
                    >
                      <video
                        ref={videoRef}
                        src={mediaSrc}
                        controls
                        playsInline
                        preload="auto"
                        crossOrigin={isCrossOrigin ? "anonymous" : undefined}
                        controlsList="nodownload"
                        style={{ width: '100%', height: '100%', background: '#000' }}
                        onLoadedMetadata={() => { cancelMediaError(); forceAudible(videoRef.current) }}
                        onLoadedData={cancelMediaError}
                        onCanPlay={cancelMediaError}
                        onCanPlayThrough={cancelMediaError}
                        onPlay={() => { cancelMediaError(); forceAudible(videoRef.current) }}
                        onPlaying={cancelMediaError}
                        onError={handleMediaError}
                      />
                    </div>
                    {!canPlayVideo && (
                      <p className="text-[11px] text-center" style={{ color: 'var(--warning)' }}>
                        Your browser may not natively support this format. If playback fails, download to play in your device's video app.
                      </p>
                    )}
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-4)' }}>
                      If playback doesn't start, use Try again, Download, or Open in new tab.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* AUDIO — also uses ReactPlayer. */}
            {type === 'audio' && (
              <div className="flex flex-col items-center justify-center gap-3 py-4">
                {mediaError ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center w-full">
                    <AlertTriangle size={32} style={{ color: 'var(--warning)' }} className="mb-2" />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Audio preview failed to load</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try again, open in a new tab, or download to play in your device's music app.</p>
                    {mediaErrorDetail && (
                      <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--text-4)' }}>{mediaErrorDetail}</p>
                    )}
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
                    <div className="w-full max-w-xl">
                      <audio
                        ref={audioRef}
                        src={mediaSrc}
                        controls
                        preload="auto"
                        crossOrigin={isCrossOrigin ? "anonymous" : undefined}
                        controlsList="nodownload"
                        style={{ width: '100%', height: '54px' }}
                        onLoadedMetadata={() => { cancelMediaError(); forceAudible(audioRef.current) }}
                        onLoadedData={cancelMediaError}
                        onCanPlay={cancelMediaError}
                        onCanPlayThrough={cancelMediaError}
                        onPlay={() => { cancelMediaError(); forceAudible(audioRef.current) }}
                        onPlaying={cancelMediaError}
                        onError={handleMediaError}
                      />
                    </div>
                    {!canPlayAudio && (
                      <p className="text-[11px] text-center" style={{ color: 'var(--warning)' }}>
                        Your browser may not natively support this format. If playback fails, download to play in your device's music app.
                      </p>
                    )}
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
