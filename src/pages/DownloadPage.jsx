import React, { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, CheckCircle2, Lock, Eye, EyeOff, ShieldX, XCircle, Clock, Flame, RefreshCw } from 'lucide-react'
import Spinner from '../components/Spinner'
import toast from 'react-hot-toast'
import { useSocket } from '../context/SocketContext'
import { getFileMetadataOutcome, previewUrl, verifyPassword, downloadSingleFile, finalizeBurnTransfer, getTextContent } from '../services/api'
import { smartDownload } from '../utils/download'
import {
  saveTransfer,
  updateTransferStatus,
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
import StatusBanner from '../components/StatusBanner'
import SharedTextDisplay from '../components/SharedTextDisplay'

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

const RETRY_DELAY_MS = 3000
const MAX_AUTO_RETRIES = 5

export default function DownloadPage() {
  const { code } = useParams()
  const normalizedCode = String(code || '').trim().toUpperCase()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state?.transferData || null
  const { socket, joinRoom, leaveRoom, rejoinRoom } = useSocket()

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
  const [downloadSpeed, setDownloadSpeed] = useState(0)
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
  const [textContent, setTextContent] = useState(null)
  const [textLoading, setTextLoading] = useState(false)
  
  const verifiedPasswordRef = useRef('')
  const downloadingRef = useRef(false)
  const mountedRef = useRef(true)
  const metaRef = useRef(initialCachedTransfer)
  const transferStatusRef = useRef(initialCachedTransfer?.status || 'ACTIVE')
  const downloadedAnyRef = useRef(false)
  const burnFinalizeRequestedRef = useRef(false)
  const requestInFlightRef = useRef(false)
  const requestTokenRef = useRef(0)
  const retryTimerRef = useRef(null)
  const terminalNavigatedRef = useRef(false)
  useEffect(() => { return () => { mountedRef.current = false } }, [])
  useEffect(() => { metaRef.current = meta }, [meta])
  useEffect(() => { transferStatusRef.current = transferStatus }, [transferStatus])

  const finalizeBurnSessionIfNeeded = useCallback(async () => {
    if (burnFinalizeRequestedRef.current) return

    const transfer = metaRef.current
    if (!transfer?.burnAfterDownload) return
    if (!downloadedAnyRef.current) return

    const status = String(transferStatusRef.current || transfer?.status || '').toUpperCase()
    if (status === 'DELETED' || status === 'CANCELLED' || status === 'EXPIRED') return

    burnFinalizeRequestedRef.current = true
    try {
      await finalizeBurnTransfer(normalizedCode)
      updateTransferStatus(normalizedCode, 'DELETED')
    } catch {
      // Cleanup service will finalize stale claimed sessions if this request fails during tab close.
    }
  }, [normalizedCode, updateTransferStatus])

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

    // Force React to paint the loading state before firing the request
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const startTime = Date.now()

    try {
      const requestConfig = { timeout: 45000, noRetry: true }
      if (verifiedPasswordRef.current) {
        requestConfig.headers = { 'X-Transfer-Password': verifiedPasswordRef.current }
      }
      const outcome = await getFileMetadataOutcome(normalizedCode, requestConfig)

      // Guarantee Minimum Visible Duration (MVD) to prevent flashing
      const elapsed = Date.now() - startTime
      if (elapsed < 350) {
        await new Promise(r => setTimeout(r, 350 - elapsed))
      }

      if (!mountedRef.current || requestToken !== requestTokenRef.current) return

      if (outcome.ok) {
        const data = outcome.data
        const status = String(data?.status || '').toUpperCase()
        if (status === 'EXPIRED' || status === 'CANCELLED' || status === 'DELETED') {
          updateTransferStatus(normalizedCode, status)
          const reason = status === 'DELETED' ? 'burned' : status.toLowerCase()
          navigate(`/expired?reason=${reason}`, { replace: true })
          return
        }

        applyTransferSnapshot(data, { persist: true })
        // If backend inlined text content into metadata, use it immediately
        if (data?.text?.content) {
          setTextContent(data.text.content)
          setTextLoading(false)
        }
        setRetryAttempt(0)
        setRequestError(null)
        setRequestState(REQUEST_STATE.SUCCESS)
        return
      }

      if (outcome.type === 'SERVER') {
        const errCode = outcome.errorCode || 'SERVER_ERROR'
        if (errCode === 'TRANSFER_EXPIRED') {
          updateTransferStatus(normalizedCode, 'EXPIRED')
          navigate('/expired?reason=expired', { replace: true })
          return
        }
        if (errCode === 'ALREADY_DOWNLOADED') {
          updateTransferStatus(normalizedCode, 'DELETED')
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
      if (seed?.text?.content) {
        setTextContent(seed.text.content)
        setTextLoading(false)
      }
    }

    if (cachedAi) {
      setAi(cachedAi)
      setAiLoading(false)
    }

    const hasUsableCache = Boolean(seed && Array.isArray(seed.files) && seed.files.length > 0)
    const hasCachedAi = Boolean(cachedAi || seed?.ai)

    if (hasUsableCache && hasCachedAi) {
      return
    }

    // If we have cached files but no AI yet, keep the loading shimmer visible
    // while we refetch metadata to pick up AI that may have completed since last visit
    if (hasUsableCache && !hasCachedAi) {
      setAiLoading(true)
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

  useEffect(() => {
    const finalizeOnPageExit = () => {
      void finalizeBurnSessionIfNeeded()
    }

    window.addEventListener('pagehide', finalizeOnPageExit)
    window.addEventListener('beforeunload', finalizeOnPageExit)

    return () => {
      window.removeEventListener('pagehide', finalizeOnPageExit)
      window.removeEventListener('beforeunload', finalizeOnPageExit)
      void finalizeBurnSessionIfNeeded()
    }
  }, [finalizeBurnSessionIfNeeded])

  // Socket
  useEffect(() => {
    if (!socket || !normalizedCode) return

    const connectRoom = async () => {
      // Use rejoinRoom on reconnect so the server re-syncs the countdown timer.
      try {
        const ack = await rejoinRoom(normalizedCode)
        if (ack?.ok && Number(ack.secondsRemaining) > 0) {
          return
        }
      } catch {}

      const cached = getCachedTransfer(normalizedCode)
      if (cached?.expiresAt) {
        const seconds = Math.max(0, Math.ceil((new Date(cached.expiresAt).getTime() - Date.now()) / 1000))
        setSecondsRemaining(seconds)
      }
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
    // RAF-coalesce socket-driven download progress. Backend now throttles emits
    // to ~5/sec, but on a fast LAN we can still get bursty updates that would
    // queue redundant renders. Coalesce so the bar advances smoothly at 60fps.
    let downProgRaf = 0
    let pendingDownPct = -1
    let pendingDownSpeed = 0
    const onDownProg = ({ percent, speed, loaded, total }) => {
      if (!downloadingRef.current) return
      const pct = Number(percent) || 0
      const spd = Number(speed) || 0
      pendingDownPct = pct
      pendingDownSpeed = spd
      if (downProgRaf) return
      downProgRaf = requestAnimationFrame(() => {
        downProgRaf = 0
        if (pendingDownPct >= 0) {
          setDownloadPercent(pendingDownPct)
          pendingDownPct = -1
        }
        if (pendingDownSpeed >= 0) {
          setDownloadSpeed(pendingDownSpeed)
          pendingDownSpeed = 0
        }
      })
    }
    const onDownComplete = () => {
      if (metaRef.current?.burnAfterDownload) {
        downloadedAnyRef.current = true
      }
      if (!downloadingRef.current) return
      setDownloadPercent(100)
      setDownloading(false)
      setDownloaded(true)
    }
    const onCancelled = () => {
      if (terminalNavigatedRef.current) return
      terminalNavigatedRef.current = true
      setTransferStatus('CANCELLED')
      patchCachedTransfer({ status: 'CANCELLED' })
      updateTransferStatus(normalizedCode, 'CANCELLED')
      navigate('/expired?reason=cancelled', { replace: true })
    }
    const onDeleted = ({ reason } = {}) => {
      if (terminalNavigatedRef.current) return
      setTransferStatus('DELETED')
      patchCachedTransfer({ status: 'DELETED' })
      updateTransferStatus(normalizedCode, 'DELETED')
      // Only show error if user hasn't downloaded and isn't currently downloading
      if (reason === 'burn' && !downloadedAnyRef.current && !downloadingRef.current) {
        toast.error('This file was burned after being downloaded by someone else')
      }
      if (!downloadedAnyRef.current && !downloadingRef.current) {
        terminalNavigatedRef.current = true
        navigate(reason === 'burn' ? '/expired?reason=burned' : '/expired?reason=deleted', { replace: true })
      }
    }
    const onClaimed = () => {
      setTransferStatus('CLAIMED')
      patchCachedTransfer({ status: 'CLAIMED' })
      updateTransferStatus(normalizedCode, 'CLAIMED')
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
    socket.on('transfer-claimed', onClaimed)
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
      socket.off('transfer-claimed', onClaimed)
      socket.off('transfer-receipt', onReceipt)
      if (downProgRaf) {
        cancelAnimationFrame(downProgRaf)
        downProgRaf = 0
      }
      leaveRoom(normalizedCode)
    }
  }, [socket, normalizedCode, joinRoom, rejoinRoom, leaveRoom, navigate, patchCachedTransfer])

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
      downloadedAnyRef.current = true
      setDownloaded(true)

      const currentSettings = getSettings()

      // Confetti! Pull the active theme's accent + success + info from CSS vars
      // so a Forest theme gets emerald confetti, Sakura gets rose, etc., instead
      // of always firing sunrise-orange.
      if (!currentSettings.reducedMotion) {
        try {
          const { default: confetti } = await import('canvas-confetti')
          const cs = getComputedStyle(document.documentElement)
          const themeColors = ['--accent', '--accent-hover', '--success', '--info', '--warning']
            .map((v) => cs.getPropertyValue(v).trim())
            .filter(Boolean)
          confetti({
            particleCount: 72,
            spread: 80,
            origin: { y: 0.6 },
            colors: themeColors.length ? themeColors : ['#E8634A', '#16A34A', '#0891B2'],
          })
        } catch (e) {
          // Fallback if chunk fails to load
        }
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

  // Check if this is a text share
  const isTextShare = meta?.files?.length === 1 && meta.files[0]?.name?.endsWith('.txt')

  // Fetch text content when unlocked
  useEffect(() => {
    if (!isTextShare || (!passwordVerified && needsPassword) || textContent !== null) return

    async function fetchText() {
      setTextLoading(true)
      try {
        const password = needsPassword ? verifiedPasswordRef.current : undefined
        const result = await getTextContent(normalizedCode, password)
        setTextContent(result.content)
      } catch (err) {
        console.error('Failed to fetch text content:', err)
        toast.error('Failed to load text content')
      } finally {
        setTextLoading(false)
      }
    }

    fetchText()
  }, [isTextShare, passwordVerified, needsPassword, normalizedCode, textContent])

  async function handleTextUnlock(password) {
    try {
      const result = await verifyPassword(normalizedCode, password)
      if (result?.verified) {
        verifiedPasswordRef.current = password
        setPasswordVerified(true)
        setNeedsPassword(false)
        toast.success('Text unlocked')
      }
    } catch (err) {
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'INVALID_PASSWORD') {
        toast.error('Wrong password')
      } else if (err?.response?.status === 429) {
        toast.error('Too many attempts')
      } else {
        toast.error('Failed to unlock')
      }
      throw err
    }
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
        <div className="app-main-offset page-shell-narrow py-8 sm:py-10 space-y-4">
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
        <div className="app-main-offset">
          <ErrorState
            code={requestError}
            onRetry={handleRetry}
            autoRetry={true}
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

      <main className="app-main-offset">
        <div className="page-shell-narrow py-8 sm:py-12">

          {/* Status banner */}
          <AnimatePresence>
            {isRetrying && (
              <StatusBanner
                key="retrying"
                tone="info"
                icon={RefreshCw}
                title="Trying again..."
                description="Retrying the metadata request."
                className="mb-4"
                action={
                  <button
                    type="button"
                    className="btn-secondary text-xs !py-1 !px-2"
                    onClick={handleRetry}
                  >
                    Retry now
                  </button>
                }
              />
            )}
            {transferStatus === 'CANCELLED' && (
              <StatusBanner
                key="cancelled"
                tone="danger"
                icon={XCircle}
                title="This transfer has been cancelled by the sender"
                className="mb-4"
              />
            )}
            {transferStatus === 'EXPIRED' && !downloaded && (
              <StatusBanner
                key="expired"
                tone="warning"
                icon={Clock}
                title="This transfer has expired"
                className="mb-4"
              />
            )}
            {transferStatus === 'DELETED' && !downloaded && (
              <StatusBanner
                key="deleted"
                tone="danger"
                icon={Flame}
                title="This file has been deleted"
                className="mb-4"
              />
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

          {/* Text Share Display or File cards */}
          {isTextShare ? (
            /* Show text content inline */
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {textLoading ? (
                <div className="surface-card p-8 text-center">
                  <Spinner size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading text...</p>
                </div>
              ) : (
                <SharedTextDisplay
                  textContent={textContent || ''}
                  title={meta?.files?.[0]?.name?.replace(/\.txt$/i, '') || 'Text Snippet'}
                  isPasswordProtected={needsPassword}
                  isUnlocked={passwordVerified || !needsPassword}
                  onUnlock={handleTextUnlock}
                  allowEdit={false}
                />
              )}
            </motion.div>
          ) : (
            /* Show files as cards */
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
          )}

          {/* Burn badge */}
          {meta?.burnAfterDownload && !isUnavailable && (
            <StatusBanner
              tone="warning"
              icon={Flame}
              title="Burn mode is active"
              description="This transfer stays available for this device until you leave this page."
              className="mb-4"
            />
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
                    {verifying ? <Spinner size={16} /> : <Lock size={16} />}
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
                    <ProgressBar percent={downloadPercent} speed={downloadSpeed} label="Downloading..." showSpeed={true} />
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
