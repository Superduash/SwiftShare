import { Component, useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Plus, X, Flame, Shield, Zap, Clock, QrCode,
  ArrowRight, Clipboard, AlertTriangle, FileText, Lock, Eye, EyeOff,
  GripVertical
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import { useTransfer } from '../context/TransferContext'
import { uploadFiles, uploadClipboard, shareText } from '../services/api'
import { getSettings, saveTransfer } from '../utils/storage'
import { formatBytes } from '../utils/format'
import { playUploadSuccess } from '../utils/sound'
import { useSpeedCalculator } from '../hooks/useSpeedCalculator'
import Navbar from '../components/Navbar'
import FileCard from '../components/FileCard'
import ExpirySelector from '../components/ExpirySelector'
import ProgressBar from '../components/ProgressBar'
import FinalizingIndicator from '../components/FinalizingIndicator'
import RecentTransfers from '../components/RecentTransfers'
import NearbyDevices from '../components/NearbyDevices'
import ContextMenu from '../components/ContextMenu'
import { copyToClipboard } from '../utils/clipboard'

const ShareTextModal = lazy(() => import('../components/ShareTextModal').catch(() => ({ default: () => null })))
const BLOCKED_EXTS = new Set(['.exe', '.bat', '.sh', '.cmd', '.msi', '.scr', '.com', '.vbs', '.ps1', '.jar'])
const MAX_SIZE = 100 * 1024 * 1024 // 100MB total across all files
const MAX_FILES = 10

const FEATURES = [
  { icon: Shield, title: 'No Sign-Up', desc: 'Share without accounts' },
  { icon: Clock, title: 'Self-Destruct', desc: 'Gone when the timer ends' },
  { icon: Flame, title: 'Burn Mode', desc: 'Vanishes after one grab' },
  { icon: QrCode, title: 'QR Codes', desc: 'Point, scan, done' },
  { icon: Zap, title: 'Live Updates', desc: 'Real-time progress' },
]

class LocalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }

    return this.props.children
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const { socket, isConnected, socketId } = useSocket()
  const { uploadState, setUploadProgress, startUpload, setError } = useTransfer()

  const initialSettings = getSettings()
  const [files, setFiles] = useState([])
  const [expiry, setExpiry] = useState(initialSettings.defaultExpiry || 60)
  const [burn, setBurn] = useState(initialSettings.defaultBurn || false)
  // Track whether the user has manually overridden the picker in this session.
  // If they have, we don't stomp their choice when settings change. If they
  // haven't, the picker should mirror whatever default is currently saved.
  const expiryTouchedRef = useRef(false)
  const burnTouchedRef = useRef(false)
  const setExpiryUser = useCallback((value) => {
    expiryTouchedRef.current = true
    setExpiry(value)
  }, [])
  const setBurnUser = useCallback((value) => {
    burnTouchedRef.current = true
    setBurn(value)
  }, [])

  // Settings live in localStorage and are mutated from SettingsPanel via the
  // `swiftshare:settings-changed` custom event. Without this listener, opening
  // settings, changing default expiry, and coming back here would leave the
  // picker stuck on the value captured at mount time.
  useEffect(() => {
    const onSettingsChanged = (e) => {
      const next = e?.detail || getSettings()
      if (!expiryTouchedRef.current && Number.isFinite(Number(next?.defaultExpiry))) {
        setExpiry(Number(next.defaultExpiry))
      }
      if (!burnTouchedRef.current && typeof next?.defaultBurn === 'boolean') {
        setBurn(next.defaultBurn)
      }
    }
    window.addEventListener('swiftshare:settings-changed', onSettingsChanged)
    // Also re-sync once on mount in case settings changed while this component
    // was unmounted (e.g. user navigated away, changed default, came back).
    onSettingsChanged({ detail: getSettings() })
    return () => window.removeEventListener('swiftshare:settings-changed', onSettingsChanged)
  }, [])
  const [uploading, setUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [uploadETA, setUploadETA] = useState(0)
  const [uploadPhase, setUploadPhase] = useState('uploading') // 'uploading' | 'finalizing' | 'retrying'
  const uploadStartRef = useRef(0)
  // Speed calculation using dedicated hook (EMA smoothing, 250ms sample interval)
  const speedCalc = useSpeedCalculator(0.35, 250)
  // RAF-coalesced UI updates: progress events fire faster than React can render
  // on low-end mobile. We accumulate the latest values and flush at most once
  // per animation frame (≤16ms) to keep the bar smooth without wasted renders.
  const pendingProgressRef = useRef(null)
  const rafIdRef = useRef(0)
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [shareTextModalOpen, setShareTextModalOpen] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [showPasteConfirm, setShowPasteConfirm] = useState(false)
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, index: null })
  const fileInputRef = useRef(null)
  const uploadHandledRef = useRef(false)
  const uploadAbortRef = useRef(null)

  // Password strength calculation
  function getPasswordStrength(pwd) {
    if (!pwd) return null
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    
    if (score <= 1) return { level: 'weak', label: 'Not recommended', color: 'var(--danger)' }
    if (score === 2 || score === 3) return { level: 'medium', label: 'Okay', color: 'var(--warning)' }
    return { level: 'strong', label: 'Strong password', color: 'var(--success)' }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleUploadSuccess = useCallback((payload) => {
    const transferCode = payload?.code
    if (!transferCode || uploadHandledRef.current) {
      return
    }

    uploadHandledRef.current = true
    
    const fname = files[0]?.name || 'file'
    const normalizedTransferCode = String(transferCode).trim().toUpperCase()
    const transferSnapshot = { ...payload, code: normalizedTransferCode }
    saveTransfer({
      code: normalizedTransferCode,
      filename: fname,
      isSender: true,
      status: transferSnapshot?.status,
      expiresAt: transferSnapshot?.expiresAt,
      createdAt: transferSnapshot?.createdAt,
      files: transferSnapshot?.files,
      transfer: transferSnapshot,
    })

    setUploading(false)
    
    navigate(`/sender/${normalizedTransferCode}`, { 
      state: { transferData: transferSnapshot },
      replace: false
    })
    
    const currentSettings = getSettings()
    if (currentSettings.soundEnabled) {
      playUploadSuccess()
    }
  }, [files, navigate])

  // Title
  useEffect(() => { document.title = 'SwiftShare — Files sent, not stored' }, [])

  // Socket listener: only used as a fallback completion signal if the HTTP response
  // is delayed (e.g. tab put to sleep mid-finalize). Real progress now comes from the
  // XHR onUploadProgress in services/api.js — the per-file socket emits here would
  // overwrite that with a stale value, so we ignore upload-progress.
  useEffect(() => {
    if (!socket) return
    const onComplete = (payload) => handleUploadSuccess(payload)
    const onDbError = ({ code }) => {
      if (uploadHandledRef.current) {
        toast.error('Transfer saved but may be unreachable. Please try again if the link doesn\'t work.', {
          duration: 6000,
        })
      }
    }
    socket.on('upload-complete', onComplete)
    socket.on('upload-db-error', onDbError)
    return () => {
      socket.off('upload-complete', onComplete)
      socket.off('upload-db-error', onDbError)
    }
  }, [socket, handleUploadSuccess])

  // Clipboard paste
  useEffect(() => {
    const onPaste = async (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      
      const pastedFiles = []
      
      for (const item of items) {
        // Handle any file type, not just images
        if (item.kind === 'file') {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            pastedFiles.push(file)
          }
        }
      }

      // Text paste
      if (pastedFiles.length === 0) {
        const text = e.clipboardData.getData('text/plain')
        if (text && text.trim().length > 0) {
          if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
          e.preventDefault()
          setPastedText(text.trim())
          setShowPasteConfirm(true)
          return
        }
      }
      
      // Add pasted files to the drop zone (up to MAX_FILES limit)
      if (pastedFiles.length > 0) {
        const combined = [...files, ...pastedFiles].slice(0, MAX_FILES)
        const errors = combined.map(validateFile).filter(Boolean)
        
        if (errors.length) {
          errors.forEach(e => toast.error(e))
          return
        }
        
        setFiles(combined)
        toast.success(`${pastedFiles.length} file${pastedFiles.length > 1 ? 's' : ''} pasted!`)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [files])

  // Validation
  function validateFile(file) {
    const ext = '.' + (file.name || '').split('.').pop().toLowerCase()
    if (BLOCKED_EXTS.has(ext)) return `${file.name}: blocked file type`
    if (file.size > MAX_SIZE) return `${file.name}: exceeds 100 MB limit`
    return null
  }

  const onDrop = useCallback((accepted) => {
    const combined = [...files, ...accepted].slice(0, MAX_FILES)
    const errors = combined.map(validateFile).filter(Boolean)
    if (errors.length) {
      errors.forEach(e => toast.error(e))
      return
    }
    // Check total size across all files
    const total = combined.reduce((s, f) => s + (f.size || 0), 0)
    if (total > MAX_SIZE) {
      toast.error(`Total size exceeds 100 MB limit (${formatBytes(total)})`)
      return
    }
    setFiles(combined)
    setUploadError(null)
  }, [files])

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: files.length > 0,
    multiple: true,
  })

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setUploadError(null)
  }

  function handleRename(idx, newName) {
    setFiles(prev => {
      const newFiles = [...prev]
      const oldFile = newFiles[idx]
      newFiles[idx] = new File([oldFile], newName, { type: oldFile.type })
      return newFiles
    })
  }

  const [dragOver, setDragOver] = useState(null)
  const [dragging, setDragging] = useState(null)

  const handleDragStart = (index) => setDragging(index)
  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOver(index)
  }
  const handleDrop = (targetIndex) => {
    if (dragging === null || dragging === targetIndex) return
    const newFiles = [...files]
    const [moved] = newFiles.splice(dragging, 1)
    newFiles.splice(targetIndex, 0, moved)
    setFiles(newFiles)
    setDragging(null)
    setDragOver(null)
  }

  function totalSize() {
    return files.reduce((s, f) => s + (f.size || 0), 0)
  }

  const preUploadMenuItems = () => {
    if (contextMenu.index === null) return []
    const file = files[contextMenu.index]
    if (!file) return []
    return [
      { icon: Clipboard, label: 'Copy filename', action: () => copyToClipboard(file.name) },
      { divider: true },
      { icon: X, label: 'Remove file', action: () => removeFile(contextMenu.index), danger: true },
    ]
  }

  async function handleShareText(textData) {
    try {
      const response = await shareText({
        ...textData,
        socketId: socketId || undefined,
      })

      const transferCode = response?.code
      if (!transferCode) {
        throw new Error('Invalid response from server')
      }

      const normalizedCode = String(transferCode).trim().toUpperCase()
      const transferSnapshot = { ...response, code: normalizedCode }
      
      saveTransfer({
        code: normalizedCode,
        filename: textData.title || 'Text Snippet',
        isSender: true,
        status: transferSnapshot?.status,
        expiresAt: transferSnapshot?.expiresAt,
        createdAt: transferSnapshot?.createdAt,
        files: transferSnapshot?.files,
        transfer: transferSnapshot,
      })

      navigate(`/sender/${normalizedCode}`, { 
        state: { transferData: transferSnapshot },
        replace: false
      })
      
      const currentSettings = getSettings()
      if (currentSettings.soundEnabled) {
        playUploadSuccess()
      }
      toast.success('Text shared successfully!')
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[HomePage] Share text error:', err)
      }
      throw err
    }
  }

  function getUploadErrorMessage(err) {
    const status = Number(err?.response?.status || 0)
    const backendError = err?.response?.data?.error
    const backendMessage = typeof backendError === 'string'
      ? backendError
      : (backendError?.message || err?.response?.data?.message || '')
    const errorCode = backendError?.code || ''
    const transportCode = String(err?.code || '').toUpperCase()
    const transportMessage = String(err?.message || '').toLowerCase()

    // === FILE BECAME UNAVAILABLE (Android Chrome file handle invalidation) ===
    if (transportCode === 'ERR_UPLOAD_FILE_CHANGED') {
      return 'File became unavailable after selection. Please re-select the file and try again.'
    }

    // === FILE READ ERRORS (caught during pre-read) ===
    if (transportMessage.includes('became unavailable')) {
      return err.message
    }

    if (!err?.response) {
      if (transportCode === 'ECONNABORTED' || /timeout/i.test(transportMessage)) {
        return 'Upload is taking longer than expected. Check your connection and retry.'
      }
      if (transportCode === 'ERR_STALLED') {
        return 'Upload stalled. Please check your network connection and try again.'
      }
      return 'Connection interrupted. Please check your network and retry.'
    }

    // Specific server-side rejections deserve clear messages
    if (errorCode === 'INVALID_FILE_TYPE' || status === 415) {
      return 'This file type cannot be shared. Try converting it to JPG, PNG, or PDF first.'
    }
    if (errorCode === 'FILE_TOO_LARGE') {
      return 'File exceeds the 100 MB limit. Please compress or split the file.'
    }
    if (errorCode === 'TOO_MANY_FILES') {
      return 'Too many files. Maximum 10 files per transfer.'
    }
    if (status === 429) {
      return backendMessage || 'Rate limit active: Please wait a moment before sending more files.'
    }

    return backendMessage || 'Upload failed. Please try again.'
  }

  function shouldSuppressUploadError(err) {
    // If socket already confirmed completion, ignore late transport-level failures.
    if (uploadHandledRef.current) return true
    if (String(err?.code || '').toUpperCase() === 'ERR_CANCELED') return true
    return false
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  // Warn before closing tab during upload
  useEffect(() => {
    if (!uploading) return
    const onBeforeUnload = (e) => { e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [uploading])



  async function handleUpload() {
    if (!files.length) return toast.error('Select at least one file')

    uploadAbortRef.current?.abort()
    uploadAbortRef.current = new AbortController()

    setUploading(true)
    setUploadPercent(0)
    setUploadSpeed(0)
    setUploadPhase('uploading')
    setUploadError(null)
    uploadStartRef.current = Date.now()
    speedCalc.reset()
    uploadHandledRef.current = false

    // Force React to paint the progress bar before starting the heavy upload fetch
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    let uploadSucceeded = false
    try {
      // Pre-read files into memory to avoid ERR_UPLOAD_FILE_CHANGED on Android.
      // Android's Gallery, Photos, MediaStore can modify files between selection and upload,
      // invalidating Chrome's file handle. Reading into memory ensures a stable copy.
      const safeFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const buffer = await file.arrayBuffer();
          const safeFile = new File(
            [buffer],
            file.name,
            {
              type: file.type,
              lastModified: file.lastModified
            }
          );
          safeFiles.push(safeFile);
        } catch (readError) {
          throw new Error(`"${file.name}" became unavailable. Please re-select the file and try again.`);
        }
      }

      const formData = new FormData()
      safeFiles.forEach(f => formData.append('files', f))
      formData.append('expiryMinutes', expiry)
      formData.append('burnAfterDownload', burn)
      if (passwordProtected && password.trim()) {
        formData.append('passwordProtected', 'true')
        formData.append('password', password)
      }
      if (socketId) formData.append('socketId', socketId)

      const flushProgress = () => {
        rafIdRef.current = 0
        const next = pendingProgressRef.current
        if (!next) return
        pendingProgressRef.current = null
        setUploadPercent((prev) => {
          // Never let the bar go backward — clamp to max of previous value.
          // This prevents rubber-banding when a retry resets XHR bytesLoaded.
          const clamped = Math.max(prev, next.percent)
          return Math.abs(prev - clamped) >= 0.5 ? clamped : prev
        })
        if (Number.isFinite(next.speed)) {
          setUploadSpeed((prev) => (Math.abs(prev - next.speed) >= 1024 ? next.speed : prev))
        }
        if (Number.isFinite(next.eta)) {
          setUploadETA((prev) => (Math.abs(prev - next.eta) >= 1 ? next.eta : prev))
        }
        if (next.phase) {
          setUploadPhase((prev) => (prev === next.phase ? prev : next.phase))
        }
      }

      const scheduleFlush = () => {
        if (rafIdRef.current) return
        rafIdRef.current = requestAnimationFrame(flushProgress)
      }

      const response = await uploadFiles(formData, {
        signal: uploadAbortRef.current.signal,
        onProgress: (info) => {
          if (info?.retrying) {
            // Drop any pending flushes; retry phase is its own indeterminate UI.
            pendingProgressRef.current = { 
              percent: 0, 
              speed: 0, 
              phase: 'retrying',
            }
            scheduleFlush()
            return
          }
          const total = Number(info?.total) || 0
          const loaded = Number(info?.loaded) || 0
          if (!total) return

          // Exact 0-100% network transfer representation
          const visiblePct = Math.min(100, (loaded / total) * 100)

          const smoothedSpeed = speedCalc.update(loaded)

          const phase = loaded >= total ? 'finalizing' : 'uploading'

          const etaSeconds = phase === 'uploading' ? speedCalc.getETA(loaded, total) : 0

          // Coalesce: only the latest values matter — older pending values are
          // safely overwritten before the next frame paint.
          pendingProgressRef.current = {
            percent: visiblePct,
            // Hold the last known speed during finalizing so the bar doesn't show 0
            speed: phase === 'finalizing'
              ? (pendingProgressRef.current?.speed ?? smoothedSpeed)
              : smoothedSpeed,
            eta: etaSeconds,
            phase,
          }
          scheduleFlush()
        },
      })

      // Strict success validation: never navigate without a valid transfer code.
      const transferCode = typeof response?.code === 'string' ? response.code.trim() : ''
      if (!transferCode) {
        throw new Error('Upload response was incomplete. Please try again.')
      }

      // Upload completed successfully
      setUploadPhase('finalizing')
      setUploadPercent(100)

      uploadSucceeded = true
      handleUploadSuccess({ ...response, code: transferCode })
    } catch (err) {
      if (!shouldSuppressUploadError(err)) {
        const msg = getUploadErrorMessage(err)
        setUploadError(msg)
      }
    } finally {
      // Always release spinner on failure; successful path is handled by handleUploadSuccess/navigation.
      if (!uploadSucceeded) {
        setUploading(false)
      }
      uploadAbortRef.current = null
    }
  }

  // Cleanup on unmount: abort upload, cancel RAF
  useEffect(() => {
    return () => {
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort()
        uploadAbortRef.current = null
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [])
  
  // Cancel upload handler
  function handleCancelUpload() {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort()
      uploadAbortRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
    setUploading(false)
    setUploadPercent(0)
    setUploadSpeed(0)
    setUploadETA(0)
    setUploadPhase('uploading')
    setUploadError(null)
    uploadHandledRef.current = false
    speedCalc.reset()
    toast.success('Upload canceled')
  }

  const hasFiles = files.length > 0

  return (
    <div className="min-h-screen">
      <main className="app-main-offset">
        <div className="page-shell-wide py-8 lg:py-12">

          {/* Desktop: split layout */}
          <div className="lg:grid lg:grid-cols-5 lg:gap-10">

            {/* ═══ LEFT: Upload Zone (60%) ═══ */}
            <div className="lg:col-span-3">
              {/* Hero text */}
              <motion.div
                className="mb-6"
                initial={{ y: 14 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight mb-2" style={{ color: 'var(--text)' }}>
                  Simple,<br />
                  <span style={{ color: 'var(--accent)' }}>yet too effective.</span>
                </h1>
                <p className="text-base sm:text-lg mb-2" style={{ color: 'var(--text-3)' }}>
                  Send files instantly like a message.
                </p>
                <p
                  className="text-sm font-medium tracking-wide bg-clip-text text-transparent bg-gradient-to-r"
                  style={{
                    backgroundImage: 'linear-gradient(to right, var(--accent), var(--accent-hover))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Works on any device, anywhere.
                </p>
              </motion.div>

              {/* Paste Confirm */}
              <AnimatePresence>
                {showPasteConfirm && (
                  <motion.div
                    className="surface-card p-4 space-y-3 mb-6"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Share this text?</p>
                      <button className="btn-icon" onClick={() => setShowPasteConfirm(false)} aria-label="Cancel paste"><X size={14} /></button>
                    </div>
                    <pre className="text-xs p-2 rounded-xl max-h-24 overflow-auto whitespace-pre-wrap font-mono"
                         style={{ background: 'var(--bg-sunken)', color: 'var(--text-3)' }}>
                      {pastedText.slice(0, 300)}{pastedText.length > 300 ? '...' : ''}
                    </pre>
                    <div className="flex gap-2">
                      <button className="btn-primary flex-1 text-sm" onClick={() => handleShareText({ content: pastedText, title: 'Text Snippet' })}>
                        Share as Snippet
                      </button>
                      <button className="btn-ghost text-sm" onClick={() => setShowPasteConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drop zone */}
              <motion.div
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div
                  {...getRootProps()}
                  className={`drop-zone relative ${isDragActive ? 'active' : ''} ${hasFiles ? 'p-5' : 'p-8 sm:p-12'}`}
                  style={{ minHeight: hasFiles ? 'auto' : '260px' }}
                >
                  <input {...getInputProps()} />

                  {!hasFiles ? (
                    <div className="text-center">
                      <motion.div
                        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-medium)' }}
                        animate={isDragActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <Upload size={28} style={{ color: 'var(--accent)' }} />
                      </motion.div>
                      <p className="font-display font-bold text-xl mb-1" style={{ color: 'var(--text)' }}>
                        {isDragActive ? 'Drop it here!' : 'Drag & drop anywhere to start'}
                      </p>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                        or use Ctrl+V to paste
                      </p>
                      <button 
                        type="button"
                        className="btn-primary mb-4 mx-auto" 
                        onClick={(e) => { e.stopPropagation(); openFileDialog(); }}
                      >
                        Select Files
                      </button>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-4)' }}>
                        Max 100 MB total · Up to 10 files
                      </p>
                      
                      {/* Share Text button */}
                      <div className="flex items-center gap-3 justify-center mt-4">
                        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>or</span>
                        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                      </div>
                      <button
                        type="button"
                        className="btn-secondary mt-4"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShareTextModalOpen(true)
                        }}
                      >
                        <FileText size={16} />
                        Share Text
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* File list */}
                      <div className="space-y-2 mb-4">
                        {files.map((f, i) => (
                          <div
                            key={i}
                            draggable
                            onDragStart={() => handleDragStart(i)}
                            onDragOver={(e) => handleDragOver(e, i)}
                            onDrop={() => handleDrop(i)}
                            onDragEnd={() => { setDragging(null); setDragOver(null) }}
                            className="flex items-center gap-2 p-1 -mx-1 transition-colors"
                            style={{
                              opacity: dragging === i ? 0.4 : 1,
                              border: dragOver === i ? '2px dashed var(--accent)' : '2px solid transparent',
                              borderRadius: '16px',
                              background: dragOver === i ? 'var(--accent-soft)' : 'transparent',
                            }}
                          >
                            <GripVertical size={16} className="shrink-0 cursor-grab" style={{ color: 'var(--text-5)' }} />
                            <div className="flex-1 min-w-0 pointer-events-auto">
                              <FileCard
                                file={f}
                                index={i}
                                showRemove
                                onRemove={removeFile}
                                onRename={handleRename}
                                onContextMenu={(e, idx, pos) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setContextMenu({ open: true, x: pos.x, y: pos.y, index: idx })
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <ContextMenu
                        open={contextMenu.open}
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={preUploadMenuItems()}
                        onClose={() => setContextMenu(prev => ({ ...prev, open: false }))}
                      />

                      {/* Add more */}
                      {files.length < MAX_FILES && (
                        <button
                          className="btn-ghost w-full justify-center"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                        >
                          <Plus size={14} />
                          Add more files ({files.length}/{MAX_FILES})
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || [])
                          onDrop(newFiles)
                          e.target.value = ''
                        }}
                      />

                      {/* Size info */}
                      <p className="text-xs text-center mt-2" style={{ color: 'var(--text-4)' }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize())} total
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Upload controls */}
              <AnimatePresence>
                {hasFiles && !uploading && (
                  <motion.div
                    className="mt-5 space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ExpirySelector value={expiry} onChange={setExpiryUser} />

                    {/* Burn toggle */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{
                        background: burn ? 'var(--danger-soft)' : 'transparent',
                        border: `1.5px solid ${burn ? 'var(--danger)' : 'var(--border)'}`,
                      }}
                      onClick={() => setBurnUser(!burn)}
                    >
                      <Flame size={18} style={{ color: burn ? 'var(--danger)' : 'var(--text-4)' }} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold" style={{ color: burn ? 'var(--danger)' : 'var(--text-2)' }}>
                          Burn after download
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>This action is permanent after first download</p>
                      </div>
                      <div
                        className="w-10 h-6 rounded-full relative transition-all"
                        style={{ background: burn ? 'var(--danger)' : 'var(--border-strong)' }}
                      >
                        <div
                          className="w-4 h-4 rounded-full absolute top-1 transition-all"
                          style={{ background: '#fff', left: burn ? '22px' : '4px' }}
                        />
                      </div>
                    </button>

                    {/* Password protection toggle */}
                    <div>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{
                          background: passwordProtected ? 'var(--accent-soft)' : 'transparent',
                          border: `1.5px solid ${passwordProtected ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                        onClick={() => {
                          setPasswordProtected(!passwordProtected)
                          if (passwordProtected) { setPassword(''); setShowPassword(false) }
                        }}
                      >
                        <Lock size={18} style={{ color: passwordProtected ? 'var(--accent)' : 'var(--text-4)' }} />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold" style={{ color: passwordProtected ? 'var(--accent)' : 'var(--text-2)' }}>
                            Password protect
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-4)' }}>Only people with the password can download</p>
                        </div>
                        <div
                          className="w-10 h-6 rounded-full relative transition-all"
                          style={{ background: passwordProtected ? 'var(--accent)' : 'var(--border-strong)' }}
                        >
                          <div
                            className="w-4 h-4 rounded-full absolute top-1 transition-all"
                            style={{ background: '#fff', left: passwordProtected ? '22px' : '4px' }}
                          />
                        </div>
                      </button>

                      {/* Password input field */}
                      <AnimatePresence>
                        {passwordProtected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="relative mt-2">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter a password..."
                                maxLength={64}
                                className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all"
                                style={{
                                  background: 'var(--bg-sunken)',
                                  border: '1.5px solid var(--border)',
                                  color: 'var(--text)',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                              />
                              <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                              >
                                {showPassword
                                  ? <EyeOff size={16} style={{ color: 'var(--text-4)' }} />
                                  : <Eye size={16} style={{ color: 'var(--text-4)' }} />
                                }
                              </button>
                            </div>

                            {/* Password strength indicator */}
                            {passwordStrength && (
                              <motion.div
                                className="mt-2 px-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                              >
                                {/* Progress bar */}
                                <div className="h-1 rounded-full mb-1.5" style={{ background: 'var(--border)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: passwordStrength.level === 'weak' ? '33%' : passwordStrength.level === 'medium' ? '66%' : '100%',
                                      background: passwordStrength.color,
                                    }}
                                  />
                                </div>
                                {/* Label */}
                                <div className="flex items-center justify-between">
                                  <p className="text-xs transition-colors duration-300" style={{ color: passwordStrength.color }}>
                                    {passwordStrength.label}
                                  </p>
                                  {/* Suggestion for large files */}
                                  {passwordStrength.level === 'weak' && totalSize() > 10 * 1024 * 1024 && (
                                    <p className="text-[10px]" style={{ color: 'var(--text-4)' }}>
                                      Consider stronger for large files
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Upload button */}
                    <motion.button
                      className="btn-primary w-full text-base group"
                      onClick={handleUpload}
                      disabled={uploading || (passwordProtected && !password.trim())}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Upload size={18} className="group-hover:rotate-12 transition-transform" />
                      </motion.div>
                      Share {files.length} file{files.length !== 1 ? 's' : ''}
                    </motion.button>

                    {/* Persistent upload error — stays until user retries or changes files */}
                    <AnimatePresence>
                      {uploadError && (
                        <motion.div
                          className="flex items-start gap-3 p-3 rounded-xl"
                          style={{
                            background: 'var(--danger-soft)',
                            border: '1px solid var(--danger)',
                          }}
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <AlertTriangle
                            size={16}
                            style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }}
                          />
                          <p className="flex-1 text-sm leading-snug" style={{ color: 'var(--danger)' }}>
                            {uploadError}
                          </p>
                          <button
                            type="button"
                            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            style={{
                              background: 'var(--danger)',
                              color: '#fff',
                            }}
                            onClick={() => {
                              setUploadError(null)
                              handleUpload()
                            }}
                          >
                            Retry
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload progress */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    className="mt-5 surface-card p-5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {uploadPhase === 'finalizing' ? (
                      <FinalizingIndicator label="Finalizing Transfer..." />
                    ) : (
                      <ProgressBar
                        percent={uploadPercent}
                        speed={uploadPhase === 'uploading' ? uploadSpeed : 0}
                        eta={uploadPhase === 'uploading' ? uploadETA : 0}
                        label={
                          uploadPhase === 'retrying'
                            ? 'Connection hiccup, retrying...'
                            : 'Uploading...'
                        }
                        indeterminate={uploadPhase === 'retrying'}
                        showSpeed={uploadPhase === 'uploading'}
                        onCancel={handleCancelUpload}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Receive section (mobile) */}
              <div className="mt-8 lg:hidden">
                <button
                  className="btn-secondary w-full"
                  onClick={() => navigate('/join')}
                >
                  <Clipboard size={16} />
                  Receive a file
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* ═══ RIGHT: Secondary info (40%) ═══ */}
            <div className="lg:col-span-2 mt-10 lg:mt-0 space-y-6">
              {/* Receive CTA (desktop) */}
              <motion.button
                className="hidden lg:flex w-full items-center gap-3 surface-card p-4 group cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
                whileHover={{ scale: 1.01, borderColor: 'var(--accent)' }}
                onClick={() => navigate('/join')}
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                  <Clipboard size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Receive a file</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Enter a code to grab your file</p>
                </div>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
              </motion.button>

              {/* Features grid */}
              <motion.div
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Why SwiftShare</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(({ icon: Icon, title, desc }, idx) => (
                    <motion.div
                      key={title}
                      className="surface-card-flat p-3 group"
                      initial={{ y: 6 }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.22 + idx * 0.04 }}
                    >
                      <Icon size={16} className="mb-1.5" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-4)' }}>{desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Recent Transfers */}
              <RecentTransfers />

              {/* Nearby Devices */}
              <LocalErrorBoundary fallback={null}>
                <NearbyDevices />
              </LocalErrorBoundary>

              {/* How it works */}
              <motion.div
                className="surface-card p-5"
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-4)' }}>How it works</h3>
                <div className="space-y-4">
                  {[
                    { step: '1', label: 'Drop your file', desc: 'Drag, drop, or paste — that\'s it' },
                    { step: '2', label: 'Share the code', desc: 'Send the 6-digit code or scan the QR' },
                    { step: '3', label: 'Done', desc: 'They download, then the file disappears' },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-xs"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Version Footer */}
              <div className="text-center mt-8 pb-4">
                <p className="text-[10px]" style={{ color: 'var(--text-5)' }}>
                  SwiftShare v{import.meta.env.PACKAGE_VERSION || '1.0.0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Share Text Modal */}
      <Suspense fallback={null}>
        <ShareTextModal 
          open={shareTextModalOpen}
          onClose={() => setShareTextModalOpen(false)}
          onShare={handleShareText}
        />
      </Suspense>
    </div>
  )
}
