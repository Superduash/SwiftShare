import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Plus, X, Flame, Shield, Zap, Clock, Cpu, QrCode,
  ArrowRight, Clipboard, AlertTriangle, FileText, Lock, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import { useTransfer } from '../context/TransferContext'
import { uploadFiles, uploadClipboard, shareText } from '../services/api'
import { getSettings } from '../utils/storage'
import { saveTransfer } from '../utils/storage'
import { formatBytes } from '../utils/format'
import { playUploadSuccess } from '../utils/sound'
import Navbar from '../components/Navbar'
import FileCard from '../components/FileCard'
import ExpirySelector from '../components/ExpirySelector'
import ProgressBar from '../components/ProgressBar'
import RecentTransfers from '../components/RecentTransfers'
import NearbyDevices from '../components/NearbyDevices'

const ShareTextModal = lazy(() => import('../components/ShareTextModal').catch(() => ({ default: () => null })))
const BLOCKED_EXTS = new Set(['.exe', '.bat', '.sh', '.cmd', '.msi', '.scr', '.com', '.vbs', '.ps1', '.jar'])
const MAX_SIZE = 100 * 1024 * 1024 // 100MB total across all files
const MAX_FILES = 10

const FEATURES = [
  { icon: Shield, title: 'No Sign-Up', desc: 'Share without accounts' },
  { icon: Clock, title: 'Self-Destruct', desc: 'Gone when the timer ends' },
  { icon: Flame, title: 'Burn Mode', desc: 'Vanishes after one grab' },
  { icon: Cpu, title: 'AI Insights', desc: 'Understands your files' },
  { icon: QrCode, title: 'QR Codes', desc: 'Point, scan, done' },
  { icon: Zap, title: 'Live Updates', desc: 'Real-time progress' },
]

class LocalErrorBoundary extends React.Component {
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
  const [uploadPhase, setUploadPhase] = useState('uploading') // 'uploading' | 'finalizing' | 'retrying'
  const uploadStartRef = useRef(0)
  // Speed sampling state. Maintains a rolling-window calculation plus an
  // exponential moving average so the displayed MB/s is stable instead of
  // jittering on every progress tick (XHR can fire dozens per second on LAN).
  const speedSampleRef = useRef({ at: 0, loaded: 0, ema: 0 })
  // RAF-coalesced UI updates: progress events fire faster than React can render
  // on low-end mobile. We accumulate the latest values and flush at most once
  // per animation frame (≤16ms) to keep the bar smooth without wasted renders.
  const pendingProgressRef = useRef(null)
  const rafIdRef = useRef(0)
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [shareTextModalOpen, setShareTextModalOpen] = useState(false)
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
      ai: transferSnapshot?.ai,
      transfer: transferSnapshot,
    })

    // Defer navigation to next tick to avoid React error #321
    // (Cannot update a component while rendering a different component)
    setTimeout(() => {
      setUploading(false)
      navigate(`/sender/${normalizedTransferCode}`, { state: { transferData: transferSnapshot } })
      
      // Play success sound after page has fully loaded
      setTimeout(() => {
        const currentSettings = getSettings()
        if (currentSettings.soundEnabled) {
          playUploadSuccess()
        }
      }, 300)
    }, 0)
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
    socket.on('upload-complete', onComplete)
    return () => {
      socket.off('upload-complete', onComplete)
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
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: files.length > 0,
    multiple: true,
  })

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function totalSize() {
    return files.reduce((s, f) => s + (f.size || 0), 0)
  }

  async function handleShareText(textData) {
    if (!isConnected) {
      toast.error('Server is waking up. Please wait a moment and try again.')
      throw new Error('Not connected')
    }

    try {
      const response = await shareText({
        ...textData,
        socketId,
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
        ai: transferSnapshot?.ai,
        transfer: transferSnapshot,
      })

      // Navigate to sender page
      navigate(`/sender/${normalizedCode}`, { state: { transferData: transferSnapshot } })

      // Play success sound after page has fully loaded (small delay ensures clean playback)
      setTimeout(() => {
        const currentSettings = getSettings()
        if (currentSettings.soundEnabled) {
          playUploadSuccess()
        }
      }, 300)

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
    const errorCode = String(err?.code || '').toUpperCase()
    const transportMessage = String(err?.message || '').toLowerCase()

    if (!err?.response) {
      if (errorCode === 'ECONNABORTED' || /timeout/i.test(transportMessage)) {
        return 'Upload is taking longer than expected. Please wait a moment and retry.'
      }
      return 'Upload connection was interrupted. Please retry once.'
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

  // Cancel any pending RAF on unmount to avoid setState-after-unmount.
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  async function handleUpload() {
    if (!files.length) return toast.error('Select at least one file')
    if (!isConnected) return toast.error('Server is waking up. Please wait a moment and try again.')

    uploadAbortRef.current?.abort()
    uploadAbortRef.current = new AbortController()

    setUploading(true)
    setUploadPercent(0)
    setUploadSpeed(0)
    setUploadPhase('uploading')
    uploadStartRef.current = Date.now()
    speedSampleRef.current = { at: Date.now(), loaded: 0, ema: 0 }
    uploadHandledRef.current = false

    // Force React to paint the progress bar before starting the heavy upload fetch
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    let uploadSucceeded = false
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
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
        if (next.phase) setUploadPhase((prev) => (prev === next.phase ? prev : next.phase))
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
            pendingProgressRef.current = { percent: 0, speed: 0, phase: 'retrying' }
            scheduleFlush()
            return
          }
          const total = Number(info?.total) || 0
          const loaded = Number(info?.loaded) || 0
          if (!total) return

          // Cap visible bar at 99% until the server response confirms finalization
          // (the last few % is server-side R2 finalization which the client can't see).
          const visiblePct = Math.min(99, (loaded / total) * 100)

          // Speed: weighted EMA over a ~750ms sampling window. The sliding window
          // smooths over chunky XHR delivery (browsers often batch progress events
          // on slow networks), and the EMA dampens spikes from radio handoffs.
          const now = Date.now()
          const sample = speedSampleRef.current
          let smoothedSpeed = sample.ema
          const dt = (now - sample.at) / 1000
          if (dt >= 0.75) {
            const instantSpeed = Math.max(0, (loaded - sample.loaded) / dt)
            // Alpha 0.4: responsive enough to reflect a stalled radio within a
            // couple seconds, smooth enough to avoid showing wild swings.
            smoothedSpeed = sample.ema > 0
              ? Math.round(sample.ema * 0.6 + instantSpeed * 0.4)
              : Math.round(instantSpeed)
            speedSampleRef.current = { at: now, loaded, ema: smoothedSpeed }
          }

          const phase = loaded >= total ? 'finalizing' : 'uploading'

          // Coalesce: only the latest values matter — older pending values are
          // safely overwritten before the next frame paint.
          pendingProgressRef.current = {
            percent: visiblePct,
            speed: smoothedSpeed,
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

      // Guarantee Minimum Visible Duration for upload success (MVD)
      const elapsed = Date.now() - uploadStartRef.current
      if (elapsed < 400) {
        setUploadPhase('finalizing')
        setUploadPercent(100)
        await new Promise(r => setTimeout(r, 400 - elapsed))
      }

      uploadSucceeded = true
      handleUploadSuccess({ ...response, code: transferCode })
    } catch (err) {
      if (!shouldSuppressUploadError(err)) {
        toast.error(getUploadErrorMessage(err))
      }
    } finally {
      // Always release spinner on failure; successful path is handled by handleUploadSuccess/navigation.
      if (!uploadSucceeded) {
        setUploading(false)
      }
      uploadAbortRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort()
    }
  }, [])

  const hasFiles = files.length > 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <main className="app-main-offset">
        <div className="page-shell-wide py-8 lg:py-12">

          {/* Desktop: split layout */}
          <div className="lg:grid lg:grid-cols-5 lg:gap-10">

            {/* ═══ LEFT: Upload Zone (60%) ═══ */}
            <div className="lg:col-span-3">
              {/* Hero text */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
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

              {/* Drop zone */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
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
                      <p className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>
                        {isDragActive ? 'Drop it here!' : 'Drop files here'}
                      </p>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                        or click to browse · Ctrl+V to paste files
                      </p>
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
                          <FileCard key={i} file={f} index={i} showRemove onRemove={removeFile} />
                        ))}
                      </div>

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
                      disabled={passwordProtected && !password.trim()}
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
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-4)' }}>Share the code before leaving this page</p>
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
                    <ProgressBar
                      percent={uploadPhase === 'finalizing' ? 100 : uploadPercent}
                      speed={uploadPhase === 'uploading' ? uploadSpeed : 0}
                      label={
                        uploadPhase === 'retrying'
                          ? 'Connection hiccup, retrying...'
                          : uploadPhase === 'finalizing'
                            ? 'Finalizing on server...'
                            : 'Uploading...'
                      }
                      indeterminate={uploadPhase === 'finalizing' || uploadPhase === 'retrying'}
                      showSpeed={uploadPhase === 'uploading'}
                    />
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Why SwiftShare</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(({ icon: Icon, title, desc }, idx) => (
                    <motion.div
                      key={title}
                      className="surface-card-flat p-3 group"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
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
