import React, { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Share2, Clock, Trash2,
  MessageCircle, Mail, Maximize2, Send,
  QrCode, AlertTriangle, Lock, Eye, EyeOff, Loader2,
  XCircle, Flame, Download, Bell
} from 'lucide-react'
import Spinner from '../components/Spinner'
import { QRCode } from 'react-qr-code'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import {
  getFileMetadata, getTransferActivity, getTransferStatus,
  extendTransfer, deleteTransfer, downloadSingleFile, verifyPassword, getTextContent
} from '../services/api'
import {
  getCachedTransfer,
  saveCachedTransfer,
  mergeTransferData,
  saveTransfer,
  updateTransferStatus,
} from '../utils/storage'
import { copyToClipboard, shareOrCopy, canWebShare } from '../utils/clipboard'

import { savePasswordSession, getPasswordSession, clearPasswordSession } from '../utils/passwordSession'
import Navbar from '../components/Navbar'
import StatusBanner from '../components/StatusBanner'
import CountdownRing from '../components/CountdownRing'
import FileCard from '../components/FileCard'
import ActivityLog from '../components/ActivityLog'
import ProgressBar from '../components/ProgressBar'
import ErrorState from '../components/ErrorState'
import NearbyDevices from '../components/NearbyDevices'
import SharedTextDisplay from '../components/SharedTextDisplay'
import ContextMenu from '../components/ContextMenu'
import TransferSummaryCard from '../components/TransferSummaryCard'
import TransferStatsCard from '../components/TransferStatsCard'

const FilePreviewModal = lazy(() =>
  import('../components/FilePreviewModal').catch((err) => {
    if (import.meta.env.DEV) console.warn('[SenderPage] FilePreviewModal chunk failed to load:', err)
    return { default: () => null }
  })
)
const QRModal = lazy(() =>
  import('../components/QRModal').catch((err) => {
    if (import.meta.env.DEV) console.warn('[SenderPage] QRModal chunk failed to load:', err)
    return { default: () => null }
  })
)

function buildShareMessage(fileLabel, shareLink) {
  const title = `${fileLabel} — ready to download on SwiftShare`
  const text =
    `I'm sharing ${fileLabel} with you on SwiftShare — no account needed.\n\n` +
    `Tap to download instantly:\n${shareLink}`
  return { title, text }
}

export default function SenderPage() {
  const { code } = useParams()
  const normalizedCode = String(code || '').trim().toUpperCase()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state?.transferData || null
  const { socket, registerSender, rejoinRoom, leaveRoom } = useSocket()

  const initialCachedTransfer = getCachedTransfer(normalizedCode)
  
  // Extract ownership token from navigation state or cached transfer
  const initialOwnershipToken = 
    navState?.transfer?.ownershipToken || 
    navState?.ownershipToken || 
    initialCachedTransfer?.transfer?.ownershipToken || 
    initialCachedTransfer?.ownershipToken ||
    null

  const [meta, setMeta] = useState(initialCachedTransfer)
  const [ownershipToken, setOwnershipToken] = useState(initialOwnershipToken)
  const [activity, setActivity] = useState([])
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
  const [extended, setExtended] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copyLinkState, setCopyLinkState] = useState('idle')
  const [qrModal, setQrModal] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [loading, setLoading] = useState(!initialCachedTransfer)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmExtend, setConfirmExtend] = useState(false)
  const [extendMinutes, setExtendMinutes] = useState(10) // Default 10 minutes
  const [showExtendOptions, setShowExtendOptions] = useState(false)
  const [cancelled, setCancelled] = useState(
    initialCachedTransfer?.status === 'CANCELLED' || initialCachedTransfer?.status === 'DELETED'
  )
  const [previewFile, setPreviewFile] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [passwordVerified, setPasswordVerified] = useState(!Boolean(initialCachedTransfer?.passwordProtected))
  const [previewPassword, setPreviewPassword] = useState('')
  const [showPreviewPassword, setShowPreviewPassword] = useState(false)
  const [previewPasswordError, setPreviewPasswordError] = useState('')
  const [previewUnlocking, setPreviewUnlocking] = useState(false)
  const [extending, setExtending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [textContent, setTextContent] = useState(null)
  const [textLoading, setTextLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, index: null })
  const [downloadCount, setDownloadCount] = useState(initialCachedTransfer?.downloadCount || 0)

  const mountedRef = useRef(true)
  const metaRef = useRef(initialCachedTransfer)
  const verifiedPreviewPasswordRef = useRef('')
  const activityRefreshTimerRef = useRef(null)
  const terminalNavigatedRef = useRef(false)
  useEffect(() => { return () => { mountedRef.current = false } }, [])
  useEffect(() => { metaRef.current = meta }, [meta])
  
  // Redirect non-owners to download page
  useEffect(() => {
    if (!meta || loading) return
    
    // If we have metadata but no ownership token, user is not the owner
    const hasOwnership = Boolean(
      ownershipToken || 
      meta?.transfer?.ownershipToken || 
      meta?.ownershipToken
    )
    
    if (!hasOwnership) {
      // Not the owner - redirect to download page
      navigate(`/g/${normalizedCode}`, { replace: true })
    }
  }, [meta, ownershipToken, loading, normalizedCode, navigate])

  useEffect(() => {
    return () => {
      if (activityRefreshTimerRef.current) {
        window.clearTimeout(activityRefreshTimerRef.current)
        activityRefreshTimerRef.current = null
      }
    }
  }, [])

  // Single unified password-state effect — replaces the three separate password effects
  useEffect(() => {
    const isProtected = Boolean(
      getCachedTransfer(normalizedCode)?.passwordProtected || meta?.passwordProtected
    )

    // Always reset transient state when the code or protection changes
    setPreviewPassword('')
    setShowPreviewPassword(false)
    setPreviewPasswordError('')
    verifiedPreviewPasswordRef.current = ''

    if (!isProtected) {
      setPasswordVerified(true)
      return
    }

    // Try to restore from session storage (5-minute session)
    const sessionPassword = getPasswordSession(normalizedCode)
    if (sessionPassword) {
      verifiedPreviewPasswordRef.current = sessionPassword
      setPasswordVerified(true)
    } else {
      setPasswordVerified(false)
    }
  }, [normalizedCode, meta?.passwordProtected])

  const baseShareUrl = import.meta.env.VITE_SHARE_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const shareLink = `${baseShareUrl}/g/${normalizedCode}`

  // Title
  useEffect(() => {
    const fileName = meta?.files?.[0]?.name
    if (fileName) {
      document.title = `Sharing ${fileName} · SwiftShare`
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
        isSender: true,
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
    
    // Update ownership token if present in the incoming data
    const incomingToken = incoming?.transfer?.ownershipToken || incoming?.ownershipToken
    if (incomingToken) {
      setOwnershipToken(incomingToken)
    }

    if (merged.status === 'CANCELLED' || merged.status === 'DELETED') {
      setCancelled(true)
    }

    // Only update expiresAt, not secondsRemaining - let timer calculate it
    const directSeconds = Number(merged.secondsRemaining)
    if (merged.expiresAt) {
      // Timer will calculate from expiresAt - don't touch secondsRemaining here
    } else if (Number.isFinite(directSeconds) && directSeconds >= 0) {
      // Only if no expiresAt, use direct seconds as fallback
      setSecondsRemaining(directSeconds)
    }

    const sessionDuration = merged.expiresAt && merged.createdAt
      ? Math.ceil((new Date(merged.expiresAt).getTime() - new Date(merged.createdAt).getTime()) / 1000)
      : 600
    setTotalSeconds(Math.max(sessionDuration, 60))

    if (merged.downloadCount !== undefined) {
      setDownloadCount(merged.downloadCount)
    }

    if (persist) {
      const persisted = saveCachedTransfer(normalizedCode, merged) || merged
      saveTransfer({
        code: normalizedCode,
        filename: persisted?.files?.[0]?.name || normalizedCode,
        isSender: true,
        status: persisted?.status,
        expiresAt: persisted?.expiresAt,
        createdAt: persisted?.createdAt,
        files: persisted?.files,
        transfer: persisted,
      })
    }

    return merged
  }, [normalizedCode])

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
      setError(null)
      setLoading(false)
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

    // Otherwise fetch from API
    async function load() {
      if (!normalizedCode || !mountedRef.current) return
      setLoading(true)
      setError(null)
      
      // Force React to paint the loading state before firing the request
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const startTime = Date.now()

      try {
        const data = await getFileMetadata(normalizedCode, { timeout: 45000, noRetry: true })
        
        // Guarantee Minimum Visible Duration (MVD) to prevent flashing
        const elapsed = Date.now() - startTime
        if (elapsed < 350) {
          await new Promise(r => setTimeout(r, 350 - elapsed))
        }

        if (!mountedRef.current) return
        
        // Check for expired/cancelled/deleted status but don't immediately redirect for EXPIRED
        // Keep the page accessible but disable actions
        if (data.status === 'CANCELLED') {
          updateTransferStatus(normalizedCode, 'CANCELLED')
          navigate('/expired?reason=cancelled', { replace: true })
          return
        }
        if (data.status === 'DELETED') {
          updateTransferStatus(normalizedCode, 'DELETED')
          navigate('/expired?reason=burned', { replace: true })
          return
        }

        applyTransferSnapshot(data, { persist: true })
        if (data?.text?.content) {
          setTextContent(data.text.content)
          setTextLoading(false)
        }
      } catch (err) {
        const elapsed = Date.now() - startTime
        if (elapsed < 350) {
          await new Promise(r => setTimeout(r, 350 - elapsed))
        }

        if (!mountedRef.current) return
        const errCode = err?.response?.data?.error?.code
        // Only redirect for definitive backend responses (not network/timeout errors)
        if (errCode === 'TRANSFER_NOT_FOUND') {
          navigate('/expired?reason=notfound', { replace: true })
          return
        }
        // For network errors / timeouts, show a retry-able error instead of redirecting
        setError(err?.response ? (errCode || 'SERVER_ERROR') : 'NETWORK_ERROR')
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    load()
  }, [normalizedCode, navState, navigate, applyTransferSnapshot])

  // Safety net: stop showing skeleton if request hangs too long.
  useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return
      if (!metaRef.current) {
        setError(prev => prev || 'NETWORK_ERROR')
      }
      setLoading(false)
    }, 50000)

    return () => window.clearTimeout(timer)
  }, [loading])

  // Fetch activity once per page load; subsequent refreshes are event-driven.
  const fetchingActivityRef = useRef(false)
  const loadActivity = useCallback(async () => {
    if (!normalizedCode || fetchingActivityRef.current) return
    fetchingActivityRef.current = true
    try {
      const data = await getTransferActivity(normalizedCode)
      if (data?.activity) setActivity(data.activity)
    } catch {}
    finally {
      fetchingActivityRef.current = false
    }
  }, [normalizedCode])

  const requestActivityRefresh = useCallback(() => {
    if (activityRefreshTimerRef.current) {
      window.clearTimeout(activityRefreshTimerRef.current)
      activityRefreshTimerRef.current = null
    }

    activityRefreshTimerRef.current = window.setTimeout(() => {
      activityRefreshTimerRef.current = null
      void loadActivity()
    }, 300)
  }, [loadActivity])

  useEffect(() => {
    if (!normalizedCode) return
    void loadActivity()
  }, [normalizedCode, loadActivity])

  // Socket
  useEffect(() => {
    if (!socket || !normalizedCode) return

    const connectRoom = () => {
      const currentTransfer = metaRef.current
      const ownershipToken = currentTransfer?.transfer?.ownershipToken || currentTransfer?.ownershipToken
      registerSender(normalizedCode, ownershipToken)
      rejoinRoom(normalizedCode)
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
      if (!mountedRef.current) return
      updateTransferStatus(normalizedCode, 'EXPIRED')
      navigate('/expired?reason=expired', { replace: true })
    }
    // RAF-coalesce: percent updates can land faster than React renders,
    // especially on multi-receiver downloads where each percent is broadcast.
    let downProgRaf = 0
    let pendingDownPct = -1
    const onDownProg = ({ percent }) => {
      pendingDownPct = Number(percent) || 0
      if (downProgRaf) return
      downProgRaf = requestAnimationFrame(() => {
        downProgRaf = 0
        if (pendingDownPct >= 0) {
          setDownloadProgress(pendingDownPct)
          pendingDownPct = -1
        }
      })
    }
    const onDownComplete = () => {
      setDownloadProgress(100)
      const newCount = (metaRef.current?.downloadCount || 0) + 1
      setDownloadCount(newCount)
      
      // Persist download count to localStorage immediately
      const cached = getCachedTransfer(normalizedCode)
      if (cached) {
        saveCachedTransfer(normalizedCode, { ...cached, downloadCount: newCount })
      }
      
      if (metaRef.current?.burnAfterDownload) {
        patchCachedTransfer({ status: 'CLAIMED' })
        updateTransferStatus(normalizedCode, 'CLAIMED')
      }
      requestActivityRefresh()
      window.setTimeout(() => setDownloadProgress(null), 1500)
    }
    const onReceipt = (receipt) => {
      const currentCode = normalizedCode
      const receiptCode = String(receipt?.transferId || '').trim().toUpperCase()
      if (receiptCode && receiptCode !== currentCode) return
      if (receipt?.receiver) {
        toast.success(`Downloaded by ${receipt.receiver}`)
      }
      requestActivityRefresh()
    }
    const onCancelled = () => {
      if (!mountedRef.current || terminalNavigatedRef.current) return
      terminalNavigatedRef.current = true
      setCancelled(true)
      patchCachedTransfer({ status: 'CANCELLED' })
      updateTransferStatus(normalizedCode, 'CANCELLED')
      requestActivityRefresh()
      navigate('/expired?reason=cancelled', { replace: true })
    }
    const onDeleted = ({ reason } = {}) => {
      if (!mountedRef.current || terminalNavigatedRef.current) return
      terminalNavigatedRef.current = true
      setCancelled(true)
      patchCachedTransfer({ status: 'DELETED' })
      updateTransferStatus(normalizedCode, 'DELETED')
      requestActivityRefresh()
      navigate(reason === 'burn' ? '/expired?reason=burned' : '/expired?reason=deleted', { replace: true })
    }
    const onExtended = ({ expiresAt, serverTime }) => {
      if (expiresAt) {
        // Use server time to calculate accurate seconds remaining
        const expiryMs = new Date(expiresAt).getTime()
        const nowMs = serverTime || Date.now() // Prefer server time for sync
        const newSeconds = Math.max(0, Math.ceil((expiryMs - nowMs) / 1000))
        setTotalSeconds(newSeconds)
        patchCachedTransfer({ expiresAt })
      }
      requestActivityRefresh()
    }
    const onActivityUpdated = () => {
      requestActivityRefresh()
    }

    socket.on('connect', connectRoom)
    socket.on('transfer-expired', onExpired)
    socket.on('download-progress', onDownProg)
    socket.on('download-complete', onDownComplete)
    socket.on('transfer-receipt', onReceipt)
    socket.on('transfer-cancelled', onCancelled)
    socket.on('transfer-deleted', onDeleted)
    socket.on('transfer-extended', onExtended)
    socket.on('activity-updated', onActivityUpdated)

    // On socket reconnect: silently re-fetch transfer state to reconcile
    // any events missed while offline (download, extend, cancel, etc.)
    const onSocketReconnected = () => {
      if (!mountedRef.current || !normalizedCode) return
      void getFileMetadata(normalizedCode, { timeout: 10000, noRetry: true })
        .then((data) => {
          if (!mountedRef.current || !data) return
          // Only apply non-terminal states — don't overwrite a cancelled/expired UI
          if (data.status === 'EXPIRED' || data.status === 'CANCELLED' || data.status === 'DELETED') return
          applyTransferSnapshot(data, { persist: true })
          requestActivityRefresh()
        })
        .catch(() => { /* silent — reconnect refresh is best-effort */ })
    }
    window.addEventListener('swiftshare:socket-reconnected', onSocketReconnected)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      socket.off('connect', connectRoom)
      socket.off('transfer-expired', onExpired)
      socket.off('download-progress', onDownProg)
      socket.off('download-complete', onDownComplete)
      socket.off('transfer-receipt', onReceipt)
      socket.off('transfer-cancelled', onCancelled)
      socket.off('transfer-deleted', onDeleted)
      socket.off('transfer-extended', onExtended)
      socket.off('activity-updated', onActivityUpdated)
      window.removeEventListener('swiftshare:socket-reconnected', onSocketReconnected)
      if (downProgRaf) {
        cancelAnimationFrame(downProgRaf)
        downProgRaf = 0
      }
      leaveRoom(normalizedCode)
    }
  }, [socket, normalizedCode, registerSender, rejoinRoom, leaveRoom, navigate, patchCachedTransfer, requestActivityRefresh])

  // 10-second polling for live stats updates
  useEffect(() => {
    if (!normalizedCode || !meta || loading || cancelled) return

    const pollInterval = setInterval(async () => {
      if (!mountedRef.current) return
      
      try {
        const status = await getTransferStatus(normalizedCode)
        if (status && mountedRef.current) {
          // Update download count from polling
          if (typeof status.downloadCount === 'number') {
            setDownloadCount(status.downloadCount)
            
            // Persist to localStorage
            const cached = getCachedTransfer(normalizedCode)
            if (cached) {
              saveCachedTransfer(normalizedCode, { ...cached, downloadCount: status.downloadCount })
            }
          }
          
          // Sync timer using server time if available
          if (status.expiresAt && status.serverTime) {
            const expiryMs = new Date(status.expiresAt).getTime()
            const serverNow = status.serverTime
            const adjustedSeconds = Math.max(0, Math.ceil((expiryMs - serverNow) / 1000))
            setSecondsRemaining(adjustedSeconds)
          }
        }
      } catch {
        // Silent fail - polling is best-effort
      }
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(pollInterval)
  }, [normalizedCode, meta, loading, cancelled])

  // Copy helpers
  const handleCopyCode = useCallback(() => {
    copyToClipboard(normalizedCode).then((success) => {
      if (success) {
        setCopiedCode(true)
        toast.success('Code copied to clipboard')
        setTimeout(() => setCopiedCode(false), 2000)
      } else {
        toast.error('Failed to copy code')
      }
    })
  }, [normalizedCode])

  const handleCopyLink = useCallback(async () => {
    setCopyLinkState('copying')
    try {
      const success = await copyToClipboard(shareLink)
      if (success) {
        setCopyLinkState('copied')
        toast.success('Share link copied')
        setTimeout(() => setCopyLinkState('idle'), 2000)
      } else {
        // Silently reset — clipboard is unavailable, no toast spam
        setCopyLinkState('idle')
      }
    } catch {
      // Silently reset — browser blocked clipboard access
      setCopyLinkState('idle')
    }
  }, [shareLink])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault()
        handleCopyCode()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        handleCopyLink()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleCopyCode, handleCopyLink])

  // Extend
  async function handleExtend() {
    if (extending) return
    if (!confirmExtend) {
      setShowExtendOptions(true)
      setConfirmExtend(true)
      setTimeout(() => {
        setConfirmExtend(false)
        setShowExtendOptions(false)
      }, 5000)
      return
    }

    setExtending(true)
    setShowExtendOptions(false)
    try {
      await extendTransfer(normalizedCode, ownershipToken, extendMinutes)
      setExtended(true)
      setConfirmExtend(false)
      toast.success(`Extended by ${extendMinutes} minutes`)
    } catch {
      toast.error('Failed to extend')
    } finally {
      setExtending(false)
    }
  }

  // Delete
  async function handleDelete() {
    if (deleting) return
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return }

    setDeleting(true)
    try {
      await deleteTransfer(normalizedCode, ownershipToken)
      toast.success('Transfer cancelled successfully')
      terminalNavigatedRef.current = true
      setCancelled(true)
      patchCachedTransfer({ status: 'CANCELLED' })
      updateTransferStatus(normalizedCode, 'CANCELLED')
      setConfirmDelete(false)
      navigate('/expired?reason=cancelled', { replace: true })
    } catch (err) {
      // Handle specific error cases gracefully
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'TRANSFER_NOT_FOUND') {
        toast('Transfer no longer exists', { icon: 'ℹ️' })
        navigate('/expired?reason=notfound', { replace: true })
      } else if (errCode === 'TRANSFER_EXPIRED') {
        toast('Transfer already expired', { icon: 'ℹ️' })
        updateTransferStatus(normalizedCode, 'EXPIRED')
      } else if (errCode === 'ALREADY_DOWNLOADED' || errCode === 'TRANSFER_DELETED') {
        toast('Transfer already removed', { icon: 'ℹ️' })
        navigate('/expired?reason=burned', { replace: true })
      } else {
        toast.error('Unable to cancel transfer. Please try again.')
      }
    } finally {
      setDeleting(false)
    }
  }

  async function handlePreviewUnlock(e) {
    e?.preventDefault()
    if (!meta?.passwordProtected || previewUnlocking || !previewPassword.trim()) return

    setPreviewUnlocking(true)
    setPreviewPasswordError('')

    try {
      const result = await verifyPassword(normalizedCode, previewPassword)
      if (result?.verified) {
        verifiedPreviewPasswordRef.current = previewPassword
        setPasswordVerified(true)
        setPreviewPassword('')
        // Save password session for 5 minutes
        savePasswordSession(normalizedCode, previewPassword)
        toast.success('Preview unlocked')
        return
      }

      setPreviewPasswordError('Verification failed. Please try again.')
    } catch (err) {
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'INVALID_PASSWORD') {
        setPreviewPasswordError('Wrong password. Please try again.')
        toast.error('Wrong password')
      } else if (err?.response?.status === 429) {
        setPreviewPasswordError('Too many attempts. This transfer is locked.')
      } else {
        setPreviewPasswordError('Verification failed. Please try again.')
      }
    } finally {
      setPreviewUnlocking(false)
    }
  }

  // Per-file operations
  function handlePreview(index) {
    if (meta?.passwordProtected && !passwordVerified) {
      toast.error('Unlock preview first')
      return
    }

    const file = meta?.files?.[index]
    if (file) {
      setPreviewFile(file)
      setPreviewIndex(index)
    }
  }

  function handleDownloadSingle(index) {
    const protectedTransfer = Boolean(meta?.passwordProtected)
    const password = protectedTransfer ? (verifiedPreviewPasswordRef.current || undefined) : undefined
    downloadSingleFile(normalizedCode, index, password)
  }

  // Context menu items for files
  function senderMenuItems() {
    if (contextMenu.index === null) return []
    const file = meta?.files?.[contextMenu.index]
    if (!file) return []
    return [
      { icon: Eye,      label: 'Preview',       action: () => handlePreview(contextMenu.index) },
      { icon: Copy,     label: 'Copy filename', action: () => copyToClipboard(file.name) },
    ]
  }

  // Check if this is a text share
  const isTextShare = meta?.files?.length === 1 && meta?.files?.[0]?.name?.endsWith('.txt')

  // Determine if transfer is expired (before any hooks that use it)
  const isExpired = meta?.status === 'EXPIRED'

  // Fetch text content when unlocked or not password protected
  useEffect(() => {
    if (!isTextShare || textContent !== null) return
    if (meta?.passwordProtected && !passwordVerified) return

    async function fetchText() {
      setTextLoading(true)
      try {
        const password = meta?.passwordProtected ? verifiedPreviewPasswordRef.current : undefined
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
  }, [isTextShare, passwordVerified, normalizedCode, meta?.passwordProtected, textContent])

  async function handleTextUnlock(password) {
    try {
      const result = await verifyPassword(normalizedCode, password)
      if (result?.verified) {
        verifiedPreviewPasswordRef.current = password
        setPasswordVerified(true)
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

  const handleNativeShare = useCallback(async () => {
    const fileLabel = meta?.files?.length > 1
      ? `${meta.files.length} files`
      : (meta?.files?.[0]?.name || 'file')
    const { title, text } = buildShareMessage(fileLabel, shareLink)

    try {
      const result = await shareOrCopy({ title, text, url: shareLink })
      if (result === 'copied') toast.success('Link copied to clipboard instead')
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Sharing failed. Copy the link instead.')
      }
    }
  }, [meta, shareLink])

  function handleDownloadQR() {
    const svg = document.querySelector('#sender-qr-code')
    if (!svg) {
      toast.error('QR code not found')
      return
    }
    
    try {
      // Resolve CSS variables to actual colors
      const computedStyle = getComputedStyle(document.documentElement)
      const bgColor = computedStyle.getPropertyValue('--qr-bg').trim() || '#ffffff'
      const fgColor = computedStyle.getPropertyValue('--qr-fg').trim() || '#000000'
      
      // Clone SVG and replace CSS vars with resolved values
      const clonedSvg = svg.cloneNode(true)
      clonedSvg.querySelectorAll('path').forEach(path => {
        const fill = path.getAttribute('fill')
        if (fill === 'var(--qr-fg)') path.setAttribute('fill', fgColor)
        if (fill === 'var(--qr-bg)') path.setAttribute('fill', bgColor)
      })
      clonedSvg.querySelectorAll('rect').forEach(rect => {
        const fill = rect.getAttribute('fill')
        if (fill === 'var(--qr-fg)') rect.setAttribute('fill', fgColor)
        if (fill === 'var(--qr-bg)') rect.setAttribute('fill', bgColor)
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error('Canvas is not supported on this device')
        return
      }
      
      // High resolution with proper padding
      const qrSize = 1024
      const padding = 80
      const totalSize = qrSize + (padding * 2)
      
      canvas.width = totalSize
      canvas.height = totalSize
      
      // Use resolved background color
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, totalSize, totalSize)
      
      // Serialize cloned SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      
      const img = new Image()
      
      img.onload = () => {
        try {
          // Draw QR centered with padding
          ctx.drawImage(img, padding, padding, qrSize, qrSize)
          
          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (!blob) {
              toast.error('Failed to generate QR image')
              return
            }
            
            const link = document.createElement('a')
            link.download = `swiftshare-qr-${normalizedCode}.png`
            link.href = URL.createObjectURL(blob)
            link.click()
            
            // Delay revocation to ensure browser has time to start download
            setTimeout(() => {
              URL.revokeObjectURL(link.href)
              URL.revokeObjectURL(url)
              toast.success('QR code downloaded')
            }, 500)
          }, 'image/png', 1.0)
        } catch (err) {
          URL.revokeObjectURL(url)
          toast.error('Failed to export QR code')
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        toast.error('Failed to load QR code')
      }
      
      img.src = url
    } catch (err) {
      toast.error('Failed to download QR code')
    }
  }

  // Retry handler for network/server errors (must be before conditional returns for hooks rules)
  const handleRetry = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await getFileMetadata(normalizedCode, { timeout: 12000, noRetry: true })
      if (!mountedRef.current) return
      if (data.status === 'CANCELLED') {
        updateTransferStatus(normalizedCode, 'CANCELLED')
        navigate('/expired?reason=cancelled', { replace: true })
        return
      }
      if (data.status === 'DELETED') {
        updateTransferStatus(normalizedCode, 'DELETED')
        navigate('/expired?reason=burned', { replace: true })
        return
      }
      applyTransferSnapshot(data, { persist: true })
    } catch (err) {
      if (!mountedRef.current) return
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'TRANSFER_NOT_FOUND') navigate('/expired?reason=notfound', { replace: true })
      else setError(err?.response ? (errCode || 'SERVER_ERROR') : 'NETWORK_ERROR')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [normalizedCode, navigate, applyTransferSnapshot])

  // memoizedFileList must be before conditional returns (hooks rules)
  const memoizedFileList = useMemo(() => {
    return (meta?.files || []).map((f, i) => (
      <FileCard
        key={i}
        file={f}
        index={i}
        showDownload={!isExpired && !cancelled && (!meta?.passwordProtected || passwordVerified)}
        onPreview={(!isExpired && !cancelled && (!meta?.passwordProtected || passwordVerified)) ? () => handlePreview(i) : undefined}
        onDownloadSingle={(!isExpired && !cancelled && (!meta?.passwordProtected || passwordVerified)) ? () => handleDownloadSingle(i) : undefined}
        onContextMenu={(e, idx, pos) => {
          e.preventDefault()
          setContextMenu({ open: true, x: pos.x, y: pos.y, index: idx })
        }}
      />
    ))
  }, [meta?.files, isExpired, cancelled, meta?.passwordProtected, passwordVerified])

  if (loading && !meta) {
    return (
      <div className="min-h-screen">
        <main className="app-main-offset max-w-2xl mx-auto px-4 lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start pt-safe-nav">
          <div className="lg:col-span-3 space-y-4">
            <div className="shimmer-block h-6 w-1/3 rounded-xl" />
            <div className="shimmer-block h-28 w-full rounded-2xl" />
            <div className="shimmer-block h-16 w-full rounded-xl" />
            <div className="shimmer-block h-16 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 mt-8 lg:mt-0 space-y-5">
             <div className="shimmer-block h-32 w-full rounded-2xl" />
             <div className="shimmer-block h-64 w-full rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="app-main-offset">
          <ErrorState
            code={error}
            onRetry={handleRetry}
            autoRetry={true}
          />
        </div>
      </div>
    )
  }

  // Handle cancelled/deleted transfers - show error page only for these
  if (!meta || cancelled) {
    return (
      <div className="min-h-screen">
        <div className="app-main-offset max-w-2xl mx-auto px-4">
          <motion.div
            className="surface-card p-8 text-center"
            initial={{ y: 14 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--danger-soft)' }}>
              {cancelled ? <XCircle size={32} style={{ color: 'var(--danger)' }} /> : <Clock size={32} style={{ color: 'var(--warning)' }} />}
            </div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>
              Transfer {cancelled ? 'Cancelled' : 'Unavailable'}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
              {cancelled 
                ? 'This transfer has been permanently deleted by the sender.'
                : 'This transfer is no longer available.'}
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Create New Transfer
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  const _shareFileCount = Array.isArray(meta?.files) ? meta.files.length : 0
  const _shareFileLabel = _shareFileCount > 1
    ? `${_shareFileCount} files`
    : (String(meta?.files?.[0]?.name || '').trim() || 'a file')
  const { title: _shareTitle, text: _shareText } = buildShareMessage(_shareFileLabel, shareLink)

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <QRModal open={qrModal} onClose={() => setQrModal(false)} value={shareLink} code={normalizedCode} />
      </Suspense>

      <Suspense fallback={null}>
        <FilePreviewModal
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          code={normalizedCode}
          fileIndex={previewIndex}
          onDownload={handleDownloadSingle}
          password={verifiedPreviewPasswordRef.current || undefined}
          passwordRequired={Boolean(meta?.passwordProtected) && !passwordVerified}
        />
      </Suspense>

      <main className="app-main-offset">
        <div className="page-shell-wide py-8">
          <div className="lg:grid lg:grid-cols-5 lg:gap-10">

            {/* ═══ LEFT: scrolling content ═══ */}
            <div className="lg:col-span-3 space-y-5">
              {/* Status banners */}
              <AnimatePresence>
                {isExpired && (
                  <StatusBanner
                    key="expired"
                    tone="danger"
                    icon={Clock}
                    title="This transfer has expired and is no longer available for download"
                    description="The files are pending permanent deletion from cloud storage."
                    className="mb-4"
                  />
                )}
                {cancelled && (
                  <StatusBanner
                    key="cancelled"
                    tone="danger"
                    icon={XCircle}
                    title="Transfer cancelled — files permanently deleted"
                    className="mb-4"
                  />
                )}
                {meta?.status === 'CLAIMED' && (
                  <StatusBanner
                    key="claimed"
                    tone="warning"
                    icon={Flame}
                    title="Burn session claimed — file will self-destruct after download"
                    className="mb-4"
                  />
                )}
                {/* Expiry warning banners - only show if not already expired */}
                {!isExpired && !cancelled && secondsRemaining > 0 && secondsRemaining <= 60 && (
                  <StatusBanner
                    key="expiring-critical"
                    tone="danger"
                    icon={AlertTriangle}
                    title={`Expires in ${secondsRemaining}s — extend or share now`}
                    className="mb-4"
                  />
                )}
                {!isExpired && !cancelled && secondsRemaining > 60 && secondsRemaining <= 300 && (
                  <StatusBanner
                    key="expiring-soon"
                    tone="warning"
                    icon={Clock}
                    title={`Expires in ${Math.ceil(secondsRemaining / 60)} min — extend soon`}
                    className="mb-4"
                  />
                )}
              </AnimatePresence>

              {/* Transfer Summary */}
              {!cancelled && !isExpired && meta && (
                <TransferSummaryCard meta={meta} url={shareLink} onCopy={handleCopyLink} />
              )}

              {/* Password box - only show for non-text shares */}
              {meta?.passwordProtected && !passwordVerified && !isTextShare && (
                <motion.div
                  className="surface-card p-4"
                  initial={{ y: 6 }}
                  animate={{ y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Lock size={16} style={{ color: 'var(--accent)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      Password required to preview files
                    </p>
                  </div>
                  <form onSubmit={handlePreviewUnlock}>
                    <div className="relative mb-3">
                      <input
                        type={showPreviewPassword ? 'text' : 'password'}
                        value={previewPassword}
                        onChange={(e) => {
                          setPreviewPassword(e.target.value)
                          setPreviewPasswordError('')
                        }}
                        placeholder="Enter transfer password"
                        maxLength={64}
                        autoFocus
                        aria-label="Transfer password"
                        aria-describedby={previewPasswordError ? "preview-password-error" : undefined}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all"
                        style={{
                          background: 'var(--bg-sunken)',
                          border: `1.5px solid ${previewPasswordError ? 'var(--danger)' : 'var(--border)'}`,
                          color: 'var(--text)',
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5"
                        onClick={() => setShowPreviewPassword(!showPreviewPassword)}
                        tabIndex={-1}
                      >
                        {showPreviewPassword
                          ? <EyeOff size={16} style={{ color: 'var(--text-4)' }} />
                          : <Eye size={16} style={{ color: 'var(--text-4)' }} />
                        }
                      </button>
                    </div>
                    {previewPasswordError && (
                      <p id="preview-password-error" role="alert" className="text-xs mb-3" style={{ color: 'var(--danger)' }}>
                        {previewPasswordError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="btn-primary text-sm"
                      disabled={!previewPassword.trim() || previewUnlocking}
                    >
                      {previewUnlocking ? <Spinner size={15} /> : <Lock size={15} />}
                      {previewUnlocking ? 'Verifying...' : 'Unlock preview'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Text Share Display or Files */}
              {isTextShare ? (
                /* Show text content inline */
                <motion.div initial={{ y: 6 }} animate={{ y: 0 }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                    Shared Text
                  </h2>
                  {textLoading ? (
                    <div className="surface-card p-8 text-center">
                      <Spinner size={24} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading text...</p>
                    </div>
                  ) : (
                    <SharedTextDisplay
                      textContent={textContent || ''}
                      title={meta?.files?.[0]?.name?.replace(/\.txt$/i, '') || 'Text Snippet'}
                      isPasswordProtected={Boolean(meta?.passwordProtected)}
                      isUnlocked={passwordVerified}
                      onUnlock={handleTextUnlock}
                      allowEdit={false}
                    />
                  )}
                </motion.div>
              ) : (
                /* Show files as cards */
                <motion.div initial={{ y: 6 }} animate={{ y: 0 }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                    {isExpired ? 'Files Expired' : `Shared Files (${meta?.files?.length || 0})`}
                  </h2>
                  <div className="space-y-2">
                    {memoizedFileList}
                  </div>
                  <ContextMenu
                    open={contextMenu.open}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={senderMenuItems()}
                    onClose={() => setContextMenu(prev => ({ ...prev, open: false }))}
                  />
                </motion.div>
              )}

              {/* Download progress */}
              {downloadProgress !== null && downloadProgress < 100 && (
                <motion.div className="surface-card p-4" initial={{ y: 4 }} animate={{ y: 0 }}>
                  <ProgressBar percent={downloadProgress} label="Someone is downloading..." showSpeed={false} />
                </motion.div>
              )}

              {/* Transfer Stats */}
              {!cancelled && (
                <TransferStatsCard downloadCount={downloadCount} viewCount={meta?.viewCount || activity?.filter(a => a.event === 'viewed').length || 0} />
              )}

              {/* Activity */}
              <ActivityLog activity={activity} isLoading={loading} />
            </div>

            {/* ═══ RIGHT: sticky share panel ═══ */}
            <div className="lg:col-span-2 mt-8 lg:mt-0">
              <div className="lg:sticky lg:top-20 space-y-5">
                {/* QR Code */}
                <motion.div
                  className="surface-card p-5 text-center"
                  initial={{ scale: 0.96 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.08, type: 'spring', damping: 20 }}
                >
                  <button
                    className="inline-block p-4 rounded-2xl mx-auto mb-4 transition-transform hover:scale-105 cursor-pointer relative group w-[160px] sm:w-[180px] h-auto"
                    style={{ background: 'var(--qr-bg)', border: '1px solid var(--border)', transform: 'translateZ(0)' }}
                    onClick={() => setQrModal(true)}
                  >
                    <QRCode id="sender-qr-code" value={shareLink} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%", shapeRendering: "crispEdges" }} viewBox="0 0 256 256" bgColor="var(--qr-bg)" fgColor="var(--qr-fg)" level="M" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <Maximize2 size={20} style={{ color: 'var(--text-3)' }} />
                    </div>
                  </button>

                  {/* Code characters */}
                  <div className="flex justify-center gap-1.5 mb-4">
                    {(normalizedCode || '').split('').map((ch, i) => (
                      <motion.button
                        key={i}
                        className="w-11 h-13 rounded-xl flex items-center justify-center font-mono font-bold text-xl cursor-pointer transition-colors"
                        style={{
                          background: 'var(--code-char-bg)',
                          border: '1.5px solid var(--code-char-border)',
                          color: 'var(--accent)',
                        }}
                        initial={{ y: 6 }}
                        animate={{ y: 0 }}
                        transition={{ delay: 0.1 + i * 0.04, type: 'spring', damping: 15 }}
                        onClick={handleCopyCode}
                        title="Click to copy code"
                      >
                        {ch}
                      </motion.button>
                    ))}
                  </div>

                  {/* Copy and Share buttons */}
                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1 text-xs" onClick={handleCopyCode}>
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      {copiedCode ? 'Copied!' : 'Copy code'}
                    </button>
                    <button className="btn-secondary flex-1 text-xs" onClick={handleNativeShare}>
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>
                </motion.div>

                {/* Share options - only show if not expired */}
                {!isExpired && (
                  <div className="surface-card p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                      <Share2 size={12} className="inline mr-1" /> Share via
                    </h3>
                  
                  {canWebShare({ url: shareLink }) ? (
                    <button className="btn-primary w-full gap-2" onClick={handleNativeShare}>
                      <Share2 size={16} /> Share via Apps
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(_shareText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost justify-center"
                      >
                        <MessageCircle size={14} />WhatsApp
                      </a>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(_shareTitle)}&body=${encodeURIComponent(_shareText)}`}
                        className="btn-ghost justify-center"
                      >
                        <Mail size={14} />Email
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(_shareText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost justify-center"
                      >
                        <Send size={14} />Telegram
                      </a>
                      <button className="btn-ghost justify-center" onClick={handleDownloadQR}>
                        <QrCode size={14} />Save QR
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* Nearby share prompts - only show if not expired */}
                {!isExpired && !cancelled && (
                  <NearbyDevices
                    currentTransferCode={normalizedCode}
                    currentFilename={meta?.files?.[0]?.name || 'file'}
                  />
                )}

                {/* Countdown - only show if not expired */}
                {!isExpired && !cancelled && (
                  <div className="surface-card p-5 text-center">
                    {downloadCount > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-4"
                           style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                        <Download size={11} />
                        Downloaded {downloadCount} time{downloadCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    <CountdownRing secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} size={130} />

                    {showExtendOptions && !extended && (
                      <div className="mt-3 p-2 rounded-xl" style={{ background: 'var(--bg-sunken)' }}>
                        <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-3)' }}>EXTEND BY:</p>
                        <div className="flex gap-2">
                          {[10, 30, 60].map(mins => (
                            <button
                              key={mins}
                              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${extendMinutes === mins ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => setExtendMinutes(mins)}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        className="btn-ghost flex-1 text-xs"
                        onClick={handleExtend}
                        disabled={extended || extending}
                        style={confirmExtend ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : undefined}
                      >
                        {confirmExtend ? (
                          <><AlertTriangle size={13} />Confirm extend?</>
                        ) : (
                          <><Clock size={13} />{extending ? 'Extending...' : (extended ? 'Extended' : 'Extend')}</>
                        )}
                      </button>
                      <button
                        className="btn-ghost flex-1 text-xs hover:!text-red-500"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={confirmDelete ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}
                      >
                        <Trash2 size={13} />
                        {deleting ? 'Cancelling...' : (confirmDelete ? 'Delete forever?' : 'Cancel')}
                      </button>
                    </div>

                    <p className="text-[10px] mt-2" style={{ color: confirmDelete ? 'var(--danger)' : 'var(--text-4)' }}>
                      {confirmDelete ? 'This action is permanent' : 'Share the code before this timer ends'}
                    </p>

                    {extended && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-4)' }}>
                        Can only extend once per transfer
                      </p>
                    )}
                  </div>
                )}

                {/* Burn badge */}
                {meta?.burnAfterDownload && (
                  <StatusBanner
                    tone="danger"
                    icon={Flame}
                    title="Burn mode is on"
                    description="First download permanently deletes this transfer."
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
