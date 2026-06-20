import React, { useEffect, useRef, useState, useCallback, lazy, Suspense, useMemo } from 'react'
import { Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, CheckCircle2, Lock, Eye, EyeOff, ShieldX, ShieldCheck, XCircle, Clock, Flame, RefreshCw, Copy, Share2, AlertTriangle } from 'lucide-react'
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
  mergeTransferData,
} from '../utils/storage'

import { savePasswordSession, getPasswordSession, clearPasswordSession } from '../utils/passwordSession'
import { formatBytes } from '../utils/format'
import { playDownloadSuccess } from '../utils/sound'
import Navbar from '../components/Navbar'
import CountdownRing from '../components/CountdownRing'
import FileCard from '../components/FileCard'
import ProgressBar from '../components/ProgressBar'
import TransferReceipt from '../components/TransferReceipt'
import { copyToClipboard, shareOrCopy } from '../utils/clipboard'
import ErrorState from '../components/ErrorState'
import StatusBanner from '../components/StatusBanner'
import SharedTextDisplay from '../components/SharedTextDisplay'
import ContextMenu from '../components/ContextMenu'
import SecurityInfoCard from '../components/SecurityInfoCard'

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

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
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

  const [meta, setMeta] = useState(initialCachedTransfer)
  const [claimantToken] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  )
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (initialCachedTransfer?.expiresAt) {
      return Math.max(0, Math.ceil((new Date(initialCachedTransfer.expiresAt).getTime() - Date.now()) / 1000))
    }
    const cachedSeconds = Number(initialCachedTransfer?.secondsRemaining)
    if (Number.isFinite(cachedSeconds) && cachedSeconds >= 0) return cachedSeconds
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
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, index: null })
  
  const verifiedPasswordRef = useRef('')
  const downloadingRef = useRef(false)
  const mountedRef = useRef(true)

  const terminalStatus = String(transferStatus || meta?.status || '').toUpperCase()
  const isUnavailable = terminalStatus === 'CANCELLED' || terminalStatus === 'DELETED' || terminalStatus === 'EXPIRED' || terminalStatus === 'CONSUMED'
  const canDownload = !isUnavailable && (!meta?.burnAfterDownload || !downloaded) && (!needsPassword || passwordVerified)
  const metaRef = useRef(initialCachedTransfer)
  const transferStatusRef = useRef(initialCachedTransfer?.status || 'ACTIVE')
  const downloadedAnyRef = useRef(false)
  const burnFinalizeRequestedRef = useRef(false)
  const requestInFlightRef = useRef(false)
  const requestTokenRef = useRef(0)
  const retryTimerRef = useRef(null)
  const terminalNavigatedRef = useRef(false)
  useEffect(() => {
    document.title = 'Downloading file · SwiftShare'
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => { metaRef.current = meta }, [meta])
  useEffect(() => { transferStatusRef.current = transferStatus }, [transferStatus])

  // Load password from session on mount
  useEffect(() => {
    const sessionPassword = getPasswordSession(normalizedCode)
    if (sessionPassword && needsPassword) {
      verifiedPasswordRef.current = sessionPassword
      setPasswordVerified(true)
      setNeedsPassword(false)
    }
  }, [normalizedCode, needsPassword])

  const finalizeBurnSessionIfNeeded = useCallback(async () => {
    if (burnFinalizeRequestedRef.current) return

    const transfer = metaRef.current
    if (!transfer?.burnAfterDownload) return
    if (!downloadedAnyRef.current) return

    const status = String(transferStatusRef.current || transfer?.status || '').toUpperCase()
    if (status === 'DELETED' || status === 'CANCELLED' || status === 'EXPIRED') return

    burnFinalizeRequestedRef.current = true
    try {
      await finalizeBurnTransfer(normalizedCode, claimantToken)
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
    const fileName = meta?.files?.[0]?.name
    if (fileName) {
      document.title = `${fileName} · SwiftShare`
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

    // Always calculate/recalculate secondsRemaining from expiresAt if available
    if (merged.expiresAt) {
      const calculated = Math.max(0, Math.ceil((new Date(merged.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsRemaining(calculated)
    } else {
      const directSeconds = Number(merged.secondsRemaining)
      if (Number.isFinite(directSeconds) && directSeconds >= 0) {
        setSecondsRemaining(directSeconds)
      }
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
    // Removed image preview logic

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
      const headers = {}
      if (verifiedPasswordRef.current) headers['X-Transfer-Password'] = verifiedPasswordRef.current
      if (claimantToken) headers['X-Claimant-Token'] = claimantToken
      if (Object.keys(headers).length) requestConfig.headers = headers
      console.log('[Burn] metadata fetch sending claimant token:', claimantToken)
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
        
        // FIX: Handle CLAIMED state - burn transfer claimed by another device
        if (status === 'CLAIMED') {
          updateTransferStatus(normalizedCode, 'CLAIMED')
          // Show a dedicated page instead of trying to download
          navigate('/expired?reason=claimed', { replace: true })
          return
        }
        
        // FIX: Handle CONSUMED state - burn transfer already downloaded
        if (status === 'CONSUMED') {
          updateTransferStatus(normalizedCode, 'CONSUMED')
          // For the owner who downloaded it, show success state
          if (data?.burnAfterDownload) {
            setDownloaded(true)
            setTransferStatus('CONSUMED')
            applyTransferSnapshot(data, { persist: true })
            return
          }
          navigate('/expired?reason=burned', { replace: true })
          return
        }
        
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
          socket.emit('register-claimant', { code: normalizedCode, claimantToken })
          return
        }
      } catch {}

      socket.emit('register-claimant', { code: normalizedCode, claimantToken })
    }

    connectRoom()
    
    // Single source of truth: calculate from expiresAt every second
    const timerRef = { current: null }
    timerRef.current = setInterval(() => {
      const currentMeta = metaRef.current
      if (currentMeta?.expiresAt) {
        const seconds = Math.max(0, Math.ceil((new Date(currentMeta.expiresAt).getTime() - Date.now()) / 1000))
        setSecondsRemaining(seconds)
      }
    }, 1000)
    
    const onExpired = () => {
      setTransferStatus('EXPIRED')
      patchCachedTransfer({ status: 'EXPIRED' })
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
    const onClaimed = (data) => {
      setTransferStatus('CLAIMED')
      patchCachedTransfer({ status: 'CLAIMED' })
      updateTransferStatus(normalizedCode, 'CLAIMED')
      if (data?.claimantToken !== claimantToken) {
        terminalNavigatedRef.current = true
        navigate('/expired?reason=claimed', { replace: true })
      }
    }
    const onReceipt = (data) => setReceipt(data)

    const onSocketReconnected = () => {
      if (!mountedRef.current || !normalizedCode) return
      void loadMetadata()
    }
    window.addEventListener('swiftshare:socket-reconnected', onSocketReconnected)

    socket.on('connect', connectRoom)
    socket.on('transfer-expired', onExpired)
    socket.on('download-progress', onDownProg)
    socket.on('download-complete', onDownComplete)
    socket.on('transfer-cancelled', onCancelled)
    socket.on('transfer-deleted', onDeleted)
    socket.on('transfer-claimed', onClaimed)
    socket.on('transfer-receipt', onReceipt)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      socket.off('connect', connectRoom)
      socket.off('transfer-expired', onExpired)
      socket.off('download-progress', onDownProg)
      socket.off('download-complete', onDownComplete)
      socket.off('transfer-cancelled', onCancelled)
      socket.off('transfer-deleted', onDeleted)
      socket.off('transfer-claimed', onClaimed)
      socket.off('transfer-receipt', onReceipt)
      window.removeEventListener('swiftshare:socket-reconnected', onSocketReconnected)
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
        // Save password session for 5 minutes
        savePasswordSession(normalizedCode, password)
        // Now set preview for images with the verified password
        const firstFile = meta?.files?.[0]
        const firstFileType = String(firstFile?.mimeType || firstFile?.type || '').toLowerCase()
        // Removed image preview logic
      }
    } catch (err) {
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'INVALID_PASSWORD') {
        setPasswordError('Wrong password. Please try again.')
        toast.error('Wrong password')
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
    if (downloading) return
    setDownloaded(false)
    setDownloadPercent(0)
    setDownloading(true)

    let downloadSucceeded = false
    try {
      await smartDownload(normalizedCode, {
        originalName: meta?.files?.[0]?.name,
        password: verifiedPasswordRef.current || undefined,
        claimantToken
      })

      downloadSucceeded = true
      downloadedAnyRef.current = true
      setDownloaded(true)

      const currentSettings = getSettings()

      // Confetti! Pull the active theme's accent + success + info from CSS vars
      // so a Forest theme gets emerald confetti, Sakura gets rose, etc., instead
      // of always firing sunrise-orange.
      let confettiModule = window._confettiModule
      if (!confettiModule) {
        try {
          confettiModule = await import('canvas-confetti')
          window._confettiModule = confettiModule
        } catch (e) {
          // Ignore import error
        }
      }
      
      if (currentSettings.confettiEnabled && !meta?.burnAfterDownload && confettiModule) {
        try {
          const confetti = confettiModule.default
          const themeColors = []
          const root = document.documentElement
          const accent = getComputedStyle(root).getPropertyValue('--accent').trim()
          const success = getComputedStyle(root).getPropertyValue('--success').trim()
          if (accent) themeColors.push(accent)
          if (success) themeColors.push(success)
          
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
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloading(false)
      if (!downloadSucceeded) {
        setDownloadPercent(0)
      }
    }
  }

  // Space/Enter shortcut for download
  useEffect(() => {
    const onKey = (e) => {
      const activeTag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(activeTag)) return
      
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (canDownload && !downloading && !downloaded) {
          handleDownload()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canDownload, downloading, downloaded, handleDownload])

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
    downloadSingleFile(normalizedCode, index, pw, claimantToken)
  }

  const receiverMenuItems = () => {
    if (contextMenu.index === null) return []
    const file = meta?.files?.[contextMenu.index]
    if (!file) return []
    return [
      { icon: Eye, label: 'Preview', action: () => handlePreview(contextMenu.index) },
      { icon: Download, label: 'Download this file', action: () => handleDownloadSingle(contextMenu.index) },
      { icon: Copy, label: 'Copy filename', action: () => copyToClipboard(file.name) },
    ]
  }

  // Check if this is a text share
  const isTextShare = meta?.files?.length === 1 && meta?.files?.[0]?.name?.endsWith('.txt')

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
        // Save password session for 5 minutes
        savePasswordSession(normalizedCode, password)
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

  const memoizedFileList = useMemo(() => {
    return (meta?.files || []).map((f, i) => (
      <FileCard
        key={i}
        file={f}
        index={i}
        showDownload={canDownload && (meta?.files?.length ?? 0) > 1}
        onPreview={(!needsPassword || passwordVerified) ? () => handlePreview(i) : undefined}
        onDownloadSingle={canDownload ? () => handleDownloadSingle(i) : undefined}
        onContextMenu={(e, idx, pos) => {
          if (needsPassword && !passwordVerified) return
          e.preventDefault()
          setContextMenu({ open: true, x: pos.x, y: pos.y, index: idx })
        }}
      />
    ))
  }, [meta?.files, canDownload, needsPassword, passwordVerified, setContextMenu])

  const isInitialLoading = requestState === REQUEST_STATE.LOADING && !meta
  const isRetrying = requestState === REQUEST_STATE.RETRYING

  if (isInitialLoading) {
    return (
      <div className="min-h-screen">
        <div className="app-main-offset page-shell-narrow py-8 sm:py-10 space-y-4">
          <div className="shimmer-block h-6 w-1/3 rounded-xl mx-auto mb-6" />
          <div className="shimmer-block h-24 w-full rounded-2xl" />
          <div className="shimmer-block h-16 w-full rounded-xl" />
          <div className="shimmer-block h-16 w-full rounded-xl" />
          <div className="shimmer-block h-14 w-full rounded-xl mt-6" />
        </div>
      </div>
    )
  }

  if (requestState === REQUEST_STATE.FAILED && requestError) {
    return (
      <div className="min-h-screen">
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
    <div className="min-h-screen">

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
          claimantToken={claimantToken}
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
            {transferStatus === 'CLAIMED' && (
              <StatusBanner
                key="claimed"
                tone="warning"
                icon={Flame}
                title="Burn session claimed — file will self-destruct after download"
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
            {/* Expiry warning banners */}
            {!isUnavailable && !downloaded && secondsRemaining > 0 && secondsRemaining <= 60 && (
              <StatusBanner
                key="expiring-critical"
                tone="danger"
                icon={AlertTriangle}
                title={`Expires in ${secondsRemaining}s — download now!`}
                className="mb-4"
              />
            )}
            {!isUnavailable && !downloaded && secondsRemaining > 60 && secondsRemaining <= 300 && (
              <StatusBanner
                key="expiring-soon"
                tone="warning"
                icon={Clock}
                title={`Expires in ${Math.ceil(secondsRemaining / 60)} min — download soon`}
                className="mb-4"
              />
            )}
          </AnimatePresence>

          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ y: 14 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-1" style={{ color: 'var(--text)' }}>
              {downloaded ? 'Download complete!' : isUnavailable ? 'Transfer unavailable' : 'Ready to download'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              {meta?.senderDeviceName ? `From ${meta.senderDeviceName}` : `Code: ${normalizedCode}`}
            </p>
          </motion.div>

          {/* Transfer Info Panel */}
          {meta && !needsPassword && !isTextShare && (
            <motion.div 
              className="surface-card-flat p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-4)' }}>
                  From
                </p>
                <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                  {meta.senderDeviceName || 'Unknown device'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-4)' }}>
                  Total size
                </p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {formatBytes(meta.totalSize || 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-4)' }}>
                  Files
                </p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {meta.fileCount || meta.files?.length || 0} file{(meta.fileCount || meta.files?.length) !== 1 ? 's' : ''}
                </p>
              </div>
              {meta.burnAfterDownload && (
                <div className="col-span-full flex items-center gap-1.5 pt-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <Flame size={12} style={{ color: 'var(--danger)' }} />
                  <span className="text-xs" style={{ color: 'var(--danger)' }}>
                    Burns after download — files auto-delete once you download
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Text Share Display or File cards */}
          {isTextShare ? (
            /* Show text content inline */
            <motion.div
              className="mb-6"
              initial={{ y: 6 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
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
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {memoizedFileList}
              <ContextMenu
                open={contextMenu.open}
                x={contextMenu.x}
                y={contextMenu.y}
                items={receiverMenuItems()}
                onClose={() => setContextMenu(prev => ({ ...prev, open: false }))}
              />
              {meta?.totalSize > 0 && (
                <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
                  {meta?.files?.length || 0} file{(meta?.files?.length || 0) !== 1 ? 's' : ''} · {formatBytes(meta.totalSize)}
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
              initial={{ y: 6 }}
              animate={{ y: 0 }}
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
                      aria-label="Transfer password"
                      aria-describedby={passwordError ? "password-error" : undefined}
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
                    <div id="password-error" role="alert" className="flex items-center gap-1.5 mb-3">
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
                  <>
                    {/* Security Info Card */}
                    <SecurityInfoCard 
                      burnAfterDownload={meta?.burnAfterDownload} 
                      passwordProtected={meta?.passwordProtected} 
                    />

                    {/* Download Button (with sticky mobile wrapper) */}
                    <div className="sticky-action-bar">
                      <button className="btn-primary w-full text-base mb-2 shadow-lg" onClick={handleDownload} disabled={downloading}>
                        <Download size={18} />
                        {meta?.files?.length > 1
                          ? `Download All (${meta.files.length} files · ${formatBytes(meta.totalSize || 0)})`
                          : (() => {
                              const fileName = meta?.files?.[0]?.name || 'File';
                              const fileSize = formatBytes(meta?.files?.[0]?.size || meta?.files?.[0]?.fileSize || meta?.totalSize || 0);
                              // Truncate filename if too long (keep first 30 chars + extension)
                              const truncated = fileName.length > 35 
                                ? fileName.slice(0, 30) + '...' + (fileName.includes('.') ? fileName.split('.').pop() : '')
                                : fileName;
                              return `Download ${truncated} (${fileSize})`;
                            })()
                        }
                      </button>
                    </div>
                    {meta?.files?.length > 1 && (
                      <p className="text-[11px] text-center mb-4" style={{ color: 'var(--text-4)' }}>
                        Or download individual files using the ↓ buttons next to each file
                      </p>
                    )}
                    {!meta?.burnAfterDownload && (
                      <button
                        className="btn-ghost text-sm gap-2 w-full mb-6"
                        onClick={async () => {
                          const url = `${window.location.origin}/download/${normalizedCode}`
                          try {
                            const result = await shareOrCopy({ title: 'SwiftShare file', url })
                            if (result === 'copied') toast.success('Link copied to clipboard')
                          } catch {}
                        }}
                      >
                        <Share2 size={14} /> Forward to someone else
                      </button>
                    )}
                  </>
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
                  onDownloadSingle={canDownload ? handleDownloadSingle : undefined}
                  onDownloadAll={!meta?.burnAfterDownload ? handleDownload : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
