import React, { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, CheckCircle2, Lock, Eye, EyeOff, ShieldX } from 'lucide-react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import { getFileMetadataOutcome, previewUrl, verifyPassword, downloadSingleFile } from '../services/api'
import { smartDownload } from '../utils/download'
import {
  saveTransfer,
  getSettings,
  getCachedTransfer,
  saveCachedTransfer,
  getCachedAI,
  saveCachedAI,
  mergeTransferData,
} from '../utils/storage'
import { formatBytes } from '../utils/format'
import { playDownloadSuccess } from '../utils/sound'
import Navbar from '../components/Navbar'
import CountdownRing from '../components/CountdownRing'
import FileCard from '../components/FileCard'
import AISummaryCard from '../components/AISummaryCard'
import ProgressBar from '../components/ProgressBar'
import TransferReceipt from '../components/TransferReceipt'
import ErrorState from '../components/ErrorState'

const FilePreviewModal = lazy(() =>
  import('../components/FilePreviewModal').catch(() => ({ default: () => null }))
)

const REQUEST_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  RETRYING: 'retrying',
  SUCCESS: 'success',
  FAILED: 'failed',
}

const RETRY_DELAY_MS = 2000
const MAX_AUTO_RETRIES = 2

export default function DownloadPage() {
  const { code } = useParams()
  const normalizedCode = String(code || '').trim().toUpperCase()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state?.transferData || null
  const { socket, joinRoom, leaveRoom } = useSocket()

  const initialCachedTransfer = getCachedTransfer(normalizedCode)
  const initialCachedAI = getCachedAI(normalizedCode) || initialCachedTransfer?.ai || null

  const [meta, setMeta] = useState(initialCachedTransfer)
  const [ai, setAi] = useState(initialCachedAI)
  const [aiLoading, setAiLoading] = useState(!initialCachedAI)
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const cachedSeconds = Number(initialCachedTransfer?.secondsRemaining)
    if (Number.isFinite(cachedSeconds) && cachedSeconds >= 0) return cachedSeconds
    if (initialCachedTransfer?.expiresAt) {
      return Math.max(0, Math.ceil((new Date(initialCachedTransfer.expiresAt).getTime() - Date.now()) / 1000))
    }
    return 0
  })
  const [totalSeconds, setTotalSeconds] = useState(() => {
    if (initialCachedTransfer?.expiresAt && initialCachedTransfer?.createdAt) {
      const span = Math.ceil((new Date(initialCachedTransfer.expiresAt).getTime() - new Date(initialCachedTransfer.createdAt).getTime()) / 1000)
      return Math.max(span, 60)
    }
    return 600
  })
  const [requestState, setRequestState] = useState(initialCachedTransfer ? REQUEST_STATE.SUCCESS : REQUEST_STATE.IDLE)
  const [requestError, setRequestError] = useState(null)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloaded, setDownloaded] = useState(false)
  const [previewSrc, setPreviewSrc] = useState(null)
  const [needsPassword, setNeedsPassword] = useState(Boolean(initialCachedTransfer?.passwordProtected))
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [transferStatus, setTransferStatus] = useState(initialCachedTransfer?.status || 'ACTIVE')
  const [previewFile, setPreviewFile] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [receipt, setReceipt] = useState(null)
  const verifiedPasswordRef = useRef('')
  const downloadingRef = useRef(false)
  const mountedRef = useRef(true)
  const metaRef = useRef(initialCachedTransfer)
  const requestInFlightRef = useRef(false)
  const requestTokenRef = useRef(0)
  const retryTimerRef = useRef(null)
  useEffect(() => { return () => { mountedRef.current = false } }, [])
  useEffect(() => { metaRef.current = meta }, [meta])

  useEffect(() => {
    verifiedPasswordRef.current = ''
    setPassword('')
    setPasswordVerified(false)
    setPasswordError('')
  }, [normalizedCode])

  useEffect(() => {
    downloadingRef.current = downloading
  }, [downloading])

  // Title
  useEffect(() => {
    if (meta?.files?.[0]?.name) {
      document.title = `${meta.files[0].name} · SwiftShare`
    }
  }, [meta])

  const patchCachedTransfer = useCallback((patch) => {
    setMeta((prev) => {
      const merged = mergeTransferData(prev, patch)
      if (!merged) return prev

      metaRef.current = merged
      const persisted = saveCachedTransfer(normalizedCode, merged) || merged
      saveTransfer({
        code: normalizedCode,
        filename: persisted?.files?.[0]?.name || normalizedCode,
        isSender: false,
        status: persisted?.status,
        expiresAt: persisted?.expiresAt,
        createdAt: persisted?.createdAt,
        files: persisted?.files,
        ai: persisted?.ai || getCachedAI(normalizedCode) || null,
        transfer: persisted,
      })

      return persisted
    })
  }, [normalizedCode])

  const applyTransferSnapshot = useCallback((incoming, options = {}) => {
    const { persist = true } = options
    if (!incoming) return null

    const merged = mergeTransferData(metaRef.current, incoming)
    if (!merged) return null

    metaRef.current = merged
    setMeta(merged)

    const directSeconds = Number(merged.secondsRemaining)
    if (Number.isFinite(directSeconds) && directSeconds >= 0) {
      setSecondsRemaining(directSeconds)
    } else if (merged.expiresAt) {
      const inferred = Math.max(0, Math.ceil((new Date(merged.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsRemaining(inferred)
    }

    const sessionDuration = merged.expiresAt && merged.createdAt
      ? Math.ceil((new Date(merged.expiresAt).getTime() - new Date(merged.createdAt).getTime()) / 1000)
      : 600
    setTotalSeconds(Math.max(sessionDuration, 60))

    setNeedsPassword(Boolean(merged.passwordProtected))
    if (merged.status) {
      setTransferStatus(merged.status)
    }

    const firstFile = merged?.files?.[0]
    const firstFileType = String(firstFile?.mimeType || firstFile?.type || '').toLowerCase()
    if (firstFile && firstFileType.startsWith('image/') && !merged.passwordProtected) {
      setPreviewSrc(previewUrl(normalizedCode, 0))
    } else if (!merged.passwordProtected) {
      setPreviewSrc(null)
    }

    const aiPayload = merged.ai || getCachedAI(normalizedCode) || null
    if (aiPayload) {
      setAi(aiPayload)
      setAiLoading(false)
      saveCachedAI(normalizedCode, aiPayload)
    } else {
      setAiLoading(false)
    }

    if (persist) {
      const persisted = saveCachedTransfer(normalizedCode, merged) || merged
      saveTransfer({
        code: normalizedCode,
        filename: persisted?.files?.[0]?.name || normalizedCode,
        isSender: false,
        status: persisted?.status,
        expiresAt: persisted?.expiresAt,
        createdAt: persisted?.createdAt,
        files: persisted?.files,
        ai: aiPayload || persisted?.ai || null,
        transfer: persisted,
      })
    }

    return merged
  }, [normalizedCode])

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const loadMetadata = useCallback(async () => {
    if (!normalizedCode || requestInFlightRef.current) return

    requestInFlightRef.current = true
    clearRetryTimer()
    const requestToken = ++requestTokenRef.current

    setRequestState(REQUEST_STATE.LOADING)
    setRequestError(null)

    try {
      const outcome = await getFileMetadataOutcome(normalizedCode, { timeout: 12000, noRetry: true })

      if (!mountedRef.current || requestToken !== requestTokenRef.current) return

      if (outcome.ok) {
        const data = outcome.data
        const status = String(data?.status || '').toUpperCase()
        if (status === 'EXPIRED' || status === 'CANCELLED' || status === 'DELETED') {
          navigate(`/expired?reason=${status.toLowerCase()}`, { replace: true })
          return
        }

        applyTransferSnapshot(data, { persist: true })
        setRetryAttempt(0)
        setRequestError(null)
        setRequestState(REQUEST_STATE.SUCCESS)
        return
      }

      if (outcome.type === 'SERVER') {
        const errCode = outcome.errorCode || 'SERVER_ERROR'
        if (errCode === 'TRANSFER_EXPIRED') {
          navigate('/expired?reason=expired', { replace: true })
          return
        }
        if (errCode === 'ALREADY_DOWNLOADED') {
          navigate('/expired?reason=burned', { replace: true })
          return
        }
        if (errCode === 'TRANSFER_NOT_FOUND') {
          navigate('/expired?reason=notfound', { replace: true })
          return
        }

        setRequestError(errCode)
        setRequestState(REQUEST_STATE.FAILED)
        return
      }

      if (outcome.type === 'EMPTY_RESPONSE') {
        setRequestError('EMPTY_RESPONSE')
        setRequestState(REQUEST_STATE.FAILED)
        return
      }

      if (outcome.type === 'TIMEOUT') {
        setRequestError('TIMEOUT_ERROR')
        setRequestState(REQUEST_STATE.RETRYING)
        return
      }

      setRequestError('NETWORK_ERROR')
      setRequestState(REQUEST_STATE.RETRYING)
    } finally {
      if (requestToken === requestTokenRef.current) {
        requestInFlightRef.current = false
      }
    }
  }, [normalizedCode, applyTransferSnapshot, navigate, clearRetryTimer])

  // Fetch metadata
  useEffect(() => {
    if (!normalizedCode) return

    const navStateCode = String(navState?.code || '').trim().toUpperCase()
    const navTransfer = navState && navStateCode === normalizedCode
      ? { ...navState, code: normalizedCode }
      : null

    const cachedTransfer = getCachedTransfer(normalizedCode)
    const cachedAi = getCachedAI(normalizedCode)
    const seed = mergeTransferData(cachedTransfer, navTransfer)

    if (seed) {
      setRequestError(null)
      setRequestState(REQUEST_STATE.SUCCESS)
      applyTransferSnapshot(seed, { persist: true })
    }

    if (cachedAi) {
      setAi(cachedAi)
      setAiLoading(false)
    }

    const hasUsableCache = Boolean(seed && Array.isArray(seed.files) && seed.files.length > 0)
    if (hasUsableCache) {
      return
    }

    setRetryAttempt(0)
    void loadMetadata()
  }, [normalizedCode, navState, applyTransferSnapshot, loadMetadata])

  // Auto retry transient failures with a bounded retry budget.
  useEffect(() => {
    if (requestState !== REQUEST_STATE.RETRYING) return

    if (retryAttempt >= MAX_AUTO_RETRIES) {
      setRequestState(REQUEST_STATE.FAILED)
      return
    }

    clearRetryTimer()
    retryTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      setRetryAttempt((prev) => prev + 1)
      void loadMetadata()
    }, RETRY_DELAY_MS)

    return () => {
      clearRetryTimer()
    }
  }, [requestState, retryAttempt, clearRetryTimer, loadMetadata])

  useEffect(() => {
    return () => {
      clearRetryTimer()
    }
  }, [clearRetryTimer])

  // Socket
  useEffect(() => {
    if (!socket || !normalizedCode) return

    const connectRoom = () => {
      joinRoom(normalizedCode)
    }

    connectRoom()

    const onTick = ({ secondsRemaining: s }) => setSecondsRemaining(Math.max(0, s))
    const onExpired = () => {
      setTransferStatus('EXPIRED')
      setSecondsRemaining(0)
      patchCachedTransfer({ status: 'EXPIRED', secondsRemaining: 0 })
    }
    const onAi = (data) => {
      if (!data) return
      setAi(data)
      setAiLoading(false)
      saveCachedAI(normalizedCode, data)
      patchCachedTransfer({ ai: data })
    }
    const onDownProg = ({ percent }) => {
      if (!downloadingRef.current) return
      setDownloadPercent(percent || 0)
    }
    const onDownComplete = () => {
      if (!downloadingRef.current) return
      setDownloadPercent(100)
      setDownloading(false)
      setDownloaded(true)
    }
    const onCancelled = () => {
      setTransferStatus('CANCELLED')
      patchCachedTransfer({ status: 'CANCELLED' })
    }
    const onDeleted = ({ reason } = {}) => {
      setTransferStatus('DELETED')
      patchCachedTransfer({ status: 'DELETED' })
      // Only show error if user hasn't downloaded and isn't currently downloading
      if (reason === 'burn' && !downloaded && !downloadingRef.current) {
        toast.error('This file was burned after being downloaded by someone else')
      }
    }
    const onReceipt = (data) => setReceipt(data)

    socket.on('connect', connectRoom)
    socket.on('countdown-tick', onTick)
    socket.on('transfer-expired', onExpired)
    socket.on('ai-ready', onAi)
    socket.on('download-progress', onDownProg)
    socket.on('download-complete', onDownComplete)
    socket.on('transfer-cancelled', onCancelled)
    socket.on('transfer-deleted', onDeleted)
    socket.on('transfer-receipt', onReceipt)

    return () => {
      socket.off('connect', connectRoom)
      socket.off('countdown-tick', onTick)
      socket.off('transfer-expired', onExpired)
      socket.off('ai-ready', onAi)
      socket.off('download-progress', onDownProg)
      socket.off('download-complete', onDownComplete)
      socket.off('transfer-cancelled', onCancelled)
      socket.off('transfer-deleted', onDeleted)
      socket.off('transfer-receipt', onReceipt)
      leaveRoom(normalizedCode)
    }
  }, [socket, normalizedCode, joinRoom, leaveRoom, navigate, downloaded, patchCachedTransfer])

  // Password verification
  async function handlePasswordSubmit(e) {
    e?.preventDefault()
    if (!password.trim() || verifying) return

    setVerifying(true)
    setPasswordError('')

    try {
      const result = await verifyPassword(normalizedCode, password)
      if (result?.verified) {
        setPasswordVerified(true)
        verifiedPasswordRef.current = password
        // Now set preview for images with the verified password
        const firstFile = meta?.files?.[0]
        const firstFileType = String(firstFile?.mimeType || firstFile?.type || '').toLowerCase()
        if (firstFile && firstFileType.startsWith('image/')) {
          setPreviewSrc(previewUrl(normalizedCode, 0, password))
        }
      }
    } catch (err) {
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'INVALID_PASSWORD') {
        setPasswordError('Wrong password. Please try again.')
      } else if (err?.response?.status === 429) {
        setPasswordError('Too many attempts. This transfer is locked.')
      } else {
        setPasswordError('Verification failed. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  // Download
  async function handleDownload() {
    if (downloading || downloaded) return
    setDownloading(true)

    let downloadSucceeded = false
    try {
      await smartDownload(normalizedCode, {
        originalName: meta?.files?.[0]?.name,
        password: verifiedPasswordRef.current || undefined,
      })

      downloadSucceeded = true
      setDownloaded(true)

      const currentSettings = getSettings()

      // Confetti!
      if (!currentSettings.reducedMotion) {
        confetti({
          particleCount: 72,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E8634A', '#FFB88A', '#FF9A5C', '#16A34A', '#0891B2'],
        })
      }

      // Success sound
      if (currentSettings.soundEnabled) {
        playDownloadSuccess()
      }
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
      if (!downloadSucceeded) {
        setDownloadPercent(0)
      }
    }
  }

  // Per-file operations
  function handlePreview(index) {
    const file = meta?.files?.[index]
    if (file) {
      setPreviewFile(file)
      setPreviewIndex(index)
    }
  }

  function handleDownloadSingle(index) {
    const pw = verifiedPasswordRef.current || undefined
    downloadSingleFile(normalizedCode, index, pw)
  }

  // Retry handler for network/server errors (must be before conditional returns for hooks rules)
  const handleRetry = useCallback(async () => {
    setRetryAttempt(0)
    await loadMetadata()
  }, [loadMetadata])

  const terminalStatus = String(transferStatus || meta?.status || '').toUpperCase()
  const isUnavailable = terminalStatus === 'CANCELLED' || terminalStatus === 'DELETED' || terminalStatus === 'EXPIRED'
  const canDownload = !isUnavailable && !downloaded && (!needsPassword || passwordVerified)
  const isInitialLoading = requestState === REQUEST_STATE.LOADING && !meta
  const isRetrying = requestState === REQUEST_STATE.RETRYING

  if (isInitialLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="pt-20 max-w-lg mx-auto px-4 space-y-4">
          <div className="shimmer-block h-8 w-48" />
          <div className="shimmer-block h-32 w-full" />
          <div className="shimmer-block h-14 w-full" />
        </div>
      </div>
    )
  }

  if (requestState === REQUEST_STATE.FAILED && requestError) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="pt-20">
          <ErrorState
            code={requestError}
            onRetry={handleRetry}
            autoRetry={false}
          />
        </div>
      </div>
    )
  }

  if (isUnavailable) {
    return <Navigate to={`/expired?reason=${terminalStatus.toLowerCase()}`} replace />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <Suspense fallback={null}>
        <FilePreviewModal
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          code={normalizedCode}
          fileIndex={previewIndex}
          onDownload={canDownload ? handleDownloadSingle : undefined}
          password={verifiedPasswordRef.current || undefined}
          passwordRequired={needsPassword && !passwordVerified}
        />
      </Suspense>

      <main className="pt-14">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">

          {/* Status banner */}
          <AnimatePresence>
            {isRetrying && (
              <motion.div
                className="mb-4 p-3 rounded-xl"
                style={{ background: 'var(--info-soft)', border: '1px solid rgba(8,145,178,0.15)' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold" style={{ color: 'var(--info)' }}>
                    Trying again...
                  </p>
                  <button
                    type="button"
                    className="btn-secondary text-xs !py-1 !px-2"
                    onClick={handleRetry}
                  >
                    Retry now
                  </button>
                </div>
              </motion.div>
            )}
            {transferStatus === 'CANCELLED' && (
              <motion.div
                className="mb-4 p-3 rounded-xl text-center"
                style={{ background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.15)' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                  ❌ This transfer has been cancelled by the sender
                </p>
              </motion.div>
            )}
            {transferStatus === 'EXPIRED' && !downloaded && (
              <motion.div
                className="mb-4 p-3 rounded-xl text-center"
                style={{ background: 'var(--warning-soft)', border: '1px solid rgba(217,119,6,0.15)' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                  ⏰ This transfer has expired
                </p>
              </motion.div>
            )}
            {transferStatus === 'DELETED' && !downloaded && (
              <motion.div
                className="mb-4 p-3 rounded-xl text-center"
                style={{ background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.15)' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                  🔥 This file has been deleted
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-1" style={{ color: 'var(--text)' }}>
              {downloaded ? 'Download complete!' : isUnavailable ? 'Transfer unavailable' : 'Ready to download'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              {meta?.senderDeviceName ? `From ${meta.senderDeviceName}` : `Code: ${normalizedCode}`}
            </p>
          </motion.div>

          {/* Image preview */}
          {previewSrc && (
            <motion.div
              className="mb-6 rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <img
                src={previewSrc}
                alt="Preview"
                className="w-full max-h-64 object-contain"
                style={{ background: 'var(--bg-sunken)' }}
                loading="eager"
              />
            </motion.div>
          )}

          {/* File cards */}
          <motion.div
            className="space-y-2 mb-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {(meta?.files || []).map((f, i) => (
              <FileCard
                key={i}
                file={f}
                index={i}
                showDownload={canDownload}
                onPreview={(!needsPassword || passwordVerified) ? () => handlePreview(i) : undefined}
                onDownloadSingle={canDownload ? () => handleDownloadSingle(i) : undefined}
              />
            ))}
            {meta?.totalSize > 0 && (
              <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
                {meta.files?.length || 0} file{(meta.files?.length || 0) !== 1 ? 's' : ''} · {formatBytes(meta.totalSize)}
              </p>
            )}
          </motion.div>

          {/* Burn badge */}
          {meta?.burnAfterDownload && !downloaded && !isUnavailable && (
            <motion.div
              className="mb-4 p-3 rounded-xl text-center"
              style={{ background: 'var(--warning-soft)', border: '1px solid rgba(217,119,6,0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                🔥 One-time download — this file will be deleted after you download it
              </p>
            </motion.div>
          )}

          {/* Password gate */}
          {needsPassword && !passwordVerified && !downloaded && !isUnavailable && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="surface-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={18} style={{ color: 'var(--accent)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    This transfer is password protected
                  </p>
                </div>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="relative mb-3">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
                      placeholder="Enter password..."
                      maxLength={64}
                      autoFocus
                      className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: 'var(--bg-sunken)',
                        border: `1.5px solid ${passwordError ? 'var(--danger)' : 'var(--border)'}`,
                        color: 'var(--text)',
                      }}
                      onFocus={(e) => { if (!passwordError) e.target.style.borderColor = 'var(--accent)' }}
                      onBlur={(e) => { if (!passwordError) e.target.style.borderColor = 'var(--border)' }}
                    />
                    <button
                      type="button"
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
                  {passwordError && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <ShieldX size={14} style={{ color: 'var(--danger)' }} />
                      <p className="text-xs" style={{ color: 'var(--danger)' }}>{passwordError}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn-primary w-full text-sm"
                    disabled={!password.trim() || verifying}
                  >
                    {verifying ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    {verifying ? 'Verifying...' : 'Unlock'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Countdown */}
          {!downloaded && !isUnavailable && (
            <div className="flex justify-center mb-6">
              <CountdownRing secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} size={100} />
            </div>
          )}

          {/* Download / Progress */}
          <AnimatePresence mode="wait">
            {!downloaded ? (
              <motion.div key="download" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {downloading ? (
                  <div className="surface-card p-5 mb-6">
                    <ProgressBar percent={downloadPercent} label="Downloading..." showSpeed={false} />
                  </div>
                ) : isUnavailable ? null : (needsPassword && !passwordVerified) ? null : (
                  <button className="btn-primary w-full text-base mb-6" onClick={handleDownload}>
                    <Download size={18} />
                    Download {meta?.files?.length > 1 ? `${meta.files.length} files` : 'file'}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-6">
                  <motion.div
                    className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'var(--success-soft)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                  >
                    <CheckCircle2 size={32} style={{ color: 'var(--success)' }} />
                  </motion.div>
                </div>

                <TransferReceipt
                  code={normalizedCode}
                  files={meta?.files}
                  senderDevice={meta?.senderDeviceName}
                  totalSize={meta?.totalSize}
                  burnAfterDownload={meta?.burnAfterDownload}
                  receipt={receipt}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Summary */}
          <div className="mt-6">
            {needsPassword && !passwordVerified ? (
              <motion.div
                className="surface-card p-5 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
                  <Lock size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>
                  AI Summary Locked
                </p>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                  AI summary is disabled for password-protected files
                </p>
              </motion.div>
            ) : (
              <AISummaryCard ai={ai} loading={aiLoading} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
