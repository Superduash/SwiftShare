import React, { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Share2, Clock, Trash2,
  MessageCircle, Mail, Maximize2, Send,
  QrCode, AlertTriangle,
  XCircle, Flame, Download, Eye
} from 'lucide-react'
import Spinner from '../components/Spinner'
import { QRCode } from 'react-qr-code'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import {
  extendTransfer, deleteTransfer, downloadSingleFile, verifyPassword, getTextContent,
  verifyOwnership, getFileMetadata, getTransferActivity, getTransferStatus
} from '../services/api'
import {
  getCachedTransfer,
  saveCachedTransfer,
  mergeTransferData,
  saveTransfer,
  updateTransferStatus,
} from '../utils/storage'
import { copyToClipboard, shareOrCopy, canWebShare } from '../utils/clipboard'

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

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
}

export default function SenderPage() {
  const { code } = useParams()
  const normalizedCode = String(code || '').trim().toUpperCase()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state?.transfer || location.state?.transferData || null
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
  const [extended, setExtended] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
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
  const passwordVerified = true
  // Sender does not need to verify passwords locally because ownershipToken grants bypass
  const [extending, setExtending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [textContent, setTextContent] = useState(null)
  const [textLoading, setTextLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, index: null })
  const [downloadCount, setDownloadCount] = useState(initialCachedTransfer?.downloadCount || 0)

  const mountedRef = useRef(true)
  const metaRef = useRef(initialCachedTransfer)
  const activityRefreshTimerRef = useRef(null)
  const terminalNavigatedRef = useRef(false)
  useEffect(() => { return () => { mountedRef.current = false } }, [])
  useEffect(() => { metaRef.current = meta }, [meta])
  
  const [authorized, setAuthorized] = useState(false)
  const [verifyingAuth, setVerifyingAuth] = useState(true)

  // Verify ownership before allowing access to the page
  useEffect(() => {
    if (!normalizedCode) return
    
    // First, check if we even have a token
    const token = ownershipToken || meta?.transfer?.ownershipToken || meta?.ownershipToken
    

    if (!token) {
      // FIX: If we just navigated from upload (navState exists), trust it temporarily
      // The backend async DB write might not have completed yet
      if (navState) {
        setAuthorized(true)
        setVerifyingAuth(false)
        return
      }
      
      setAuthorized(false)
      setVerifyingAuth(false)
      return
    }

    // Verify token with backend
    let isSubscribed = true
    verifyOwnership(normalizedCode, token)
      .then(res => {
        if (isSubscribed) {
          if (res?.authorized) {
            setAuthorized(true)
          } else {
            setAuthorized(false)
          }
        }
      })
      .catch(err => {
        // FIX: If verification fails but we have navState (just uploaded), trust it
        // Backend might be saving to DB asynchronously
        if (isSubscribed) {
          if (navState) {
            setAuthorized(true)
          } else {
            setAuthorized(false)
          }
        }
      })
      .finally(() => {
        if (isSubscribed) setVerifyingAuth(false)
      })

    return () => { isSubscribed = false }
  }, [normalizedCode, ownershipToken, meta?.transfer?.ownershipToken, meta?.ownershipToken, navState])

  // Redirect non-owners to download page
  useEffect(() => {
    if (!verifyingAuth && !authorized) {
      navigate(`/g/${normalizedCode}`, { replace: true })
    }
  }, [verifyingAuth, authorized, normalizedCode, navigate])

  useEffect(() => {
    return () => {
      if (activityRefreshTimerRef.current) {
        window.clearTimeout(activityRefreshTimerRef.current)
        activityRefreshTimerRef.current = null
      }
    }
  }, [])



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

    // Always calculate/recalculate secondsRemaining from expiresAt if available
    const directSeconds = Number(merged.secondsRemaining)
    if (merged.expiresAt) {
      const calculated = Math.max(0, Math.ceil((new Date(merged.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsRemaining(calculated)
    } else if (Number.isFinite(directSeconds) && directSeconds >= 0) {
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

    // Always fetch fresh stats/metadata from the backend on load
    async function load() {
      if (!normalizedCode || !mountedRef.current) return
      if (!seed) {
        setLoading(true)
      }
      setError(null)
      
      // Force React to paint the loading state before firing the request
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const startTime = Date.now()

      try {
        const requestConfig = { timeout: 45000, noRetry: true }
        if (initialOwnershipToken) {
          requestConfig.headers = { 'X-Ownership-Token': initialOwnershipToken }
        }
        
        const data = await getFileMetadata(normalizedCode, requestConfig)
        
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
        // Only trust a NOT_FOUND response when we don't have data from the upload itself.
        // A transfer we just created can transiently 404 on this verification fetch due to
        // a backend read-after-write race — the write may not be visible to this immediate
        // follow-up read yet. navTransfer is the freshest possible signal (it's literally
        // the response from the upload we just did), so never let a race condition override it.
        // A stale cache-only seed with no navTransfer still redirects normally — that case
        // has no freshness guarantee, so a real 404 there is trusted as before.
        if (errCode === 'TRANSFER_NOT_FOUND' && !navTransfer) {
          navigate('/expired?reason=notfound', { replace: true })
          return
        }
        // For network errors / timeouts, show a retry-able error instead of redirecting if no seed
        if (!seed) {
          setError(err?.response ? (errCode || 'SERVER_ERROR') : 'NETWORK_ERROR')
        }
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    load()
  }, [normalizedCode, navState, navigate, applyTransferSnapshot, initialOwnershipToken])

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
      // FIX: Don't increment locally - backend sends correct count via stats-updated socket event
      // This prevents showing downloadCount + 1 temporarily due to race condition
      
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
    const onExtended = ({ expiresAt, extensionMinutes, serverTime }) => {
      if (expiresAt) {
        // Use server time to calculate accurate seconds remaining
        const expiryMs = new Date(expiresAt).getTime()
        const nowMs = serverTime || Date.now() // Prefer server time for sync
        const newSeconds = Math.max(0, Math.ceil((expiryMs - nowMs) / 1000))
        
        // Update both totalSeconds AND secondsRemaining immediately
        setTotalSeconds(newSeconds)
        setSecondsRemaining(newSeconds)
        
        // Update meta state with new expiresAt
        setMeta(prev => {
          if (!prev) return prev
          const updated = {
            ...prev,
            expiresAt,
            secondsRemaining: newSeconds
          }
          metaRef.current = updated
          saveCachedTransfer(normalizedCode, updated)
          return updated
        })
        
        patchCachedTransfer({ expiresAt, secondsRemaining: newSeconds })
        
        // FIX: Toast removed - handleExtend already shows toast on API success
      }
      requestActivityRefresh()
    }
    const onStatsUpdated = (payload) => {
      const currentCode = normalizedCode
      const incomingCode = String(payload?.code || '').trim().toUpperCase()
      if (incomingCode && incomingCode !== currentCode) return

      const viewCount = Number(payload.viewCount || 0)
      const downloadCount = Number(payload.downloadCount || 0)

      setDownloadCount(downloadCount)
      
      setMeta(prev => {
        if (!prev) return prev
        const updated = {
          ...prev,
          viewCount,
          downloadCount
        }
        metaRef.current = updated
        saveCachedTransfer(normalizedCode, updated)
        return updated
      })
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
    socket.on('stats-updated', onStatsUpdated)

    // On socket reconnect: silently re-fetch transfer state to reconcile
    // any events missed while offline (download, extend, cancel, etc.)
    const onSocketReconnected = () => {
      if (!mountedRef.current || !normalizedCode) return
      const currentTransfer = metaRef.current
      const token = currentTransfer?.transfer?.ownershipToken || currentTransfer?.ownershipToken
      const requestConfig = { timeout: 10000, noRetry: true }
      if (token) {
        requestConfig.headers = { 'X-Ownership-Token': token }
      }
      void getFileMetadata(normalizedCode, requestConfig)
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
      socket.off('stats-updated', onStatsUpdated)
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
          // Update download and view counts from polling
          if (typeof status.downloadCount === 'number' || typeof status.viewCount === 'number') {
            const dl = typeof status.downloadCount === 'number' ? status.downloadCount : (metaRef.current?.downloadCount || 0);
            const vc = typeof status.viewCount === 'number' ? status.viewCount : (metaRef.current?.viewCount || 0);
            
            setDownloadCount(dl)
            setMeta(prev => {
              if (!prev) return prev
              const updated = {
                ...prev,
                downloadCount: dl,
                viewCount: vc
              }
              metaRef.current = updated
              saveCachedTransfer(normalizedCode, updated)
              return updated
            })
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
    try {
      const success = await copyToClipboard(shareLink)
      if (success) {
        toast.success('Share link copied')
      }
    } catch {
      // Silently ignore
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
      const result = await extendTransfer(normalizedCode, ownershipToken, extendMinutes)
      
      // FIX: Immediately update local state with the new expiresAt from API response
      if (result?.expiresAt) {
        const newExpiryMs = new Date(result.expiresAt).getTime()
        const nowMs = Date.now()
        const newSeconds = Math.max(0, Math.ceil((newExpiryMs - nowMs) / 1000))
        
        // Update all timer-related state immediately
        setSecondsRemaining(newSeconds)
        setTotalSeconds(newSeconds)
        
        // Update meta and metaRef with new expiresAt
        setMeta(prev => {
          if (!prev) return prev
          const updated = {
            ...prev,
            expiresAt: result.expiresAt,
            secondsRemaining: newSeconds
          }
          metaRef.current = updated
          saveCachedTransfer(normalizedCode, updated)
          return updated
        })
        
        patchCachedTransfer({ expiresAt: result.expiresAt, secondsRemaining: newSeconds })
      }
      
      setExtended(true)
      setConfirmExtend(false)
      toast.success(`Extended by ${extendMinutes} minutes`)
    } catch (err) {
      console.error('Extend failed:', err)
      const errCode = err?.response?.data?.error?.code
      const errMsg = err?.response?.data?.error?.message
      if (errCode === 'TRANSFER_NOT_FOUND') {
        toast.error('Transfer not found')
      } else if (errMsg) {
        toast.error(errMsg)
      } else {
        toast.error('Failed to extend')
      }
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

  // Per-file operations
  const handlePreview = useCallback((index) => {
    const file = meta?.files?.[index]
    if (file) {
      setPreviewFile(file)
      setPreviewIndex(index)
    }
  }, [meta?.files])

  const handleDownloadSingle = useCallback((index) => {
    downloadSingleFile(normalizedCode, index, undefined, undefined, ownershipToken)
  }, [normalizedCode, ownershipToken])

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

  // Fetch text content
  useEffect(() => {
    if (!isTextShare || textContent !== null) return

    async function fetchText() {
      setTextLoading(true)
      try {
        const result = await getTextContent(normalizedCode, undefined, ownershipToken)
        setTextContent(result.content)
      } catch (err) {
        console.error('Failed to fetch text content:', err)
        toast.error('Failed to load text content')
      } finally {
        setTextLoading(false)
      }
    }

    fetchText()
  }, [isTextShare, normalizedCode, textContent, ownershipToken])

  // Sender is pre-authorized via ownershipToken — text is always unlocked.
  // This callback is required by SharedTextDisplay's API but is never invoked here.
  const handleTextUnlock = useCallback(() => Promise.resolve(), [])

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
      const requestConfig = { timeout: 12000, noRetry: true }
      if (ownershipToken) {
        requestConfig.headers = { 'X-Ownership-Token': ownershipToken }
      }
      const data = await getFileMetadata(normalizedCode, requestConfig)
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
  }, [normalizedCode, navigate, applyTransferSnapshot, ownershipToken])

  // memoizedFileList must be before conditional returns (hooks rules)
  const memoizedFileList = useMemo(() => {
    return (meta?.files || []).map((f, i) => (
      <FileCard
        key={i}
        file={f}
        index={i}
        showDownload={!isExpired && !cancelled && (!meta?.passwordProtected || passwordVerified)}
        onPreview={(!isExpired && !cancelled) ? () => handlePreview(i) : undefined}
        onDownloadSingle={(!isExpired && !cancelled && (!meta?.passwordProtected || passwordVerified)) ? () => handleDownloadSingle(i) : undefined}
        onContextMenu={(e, idx, pos) => {
          e.preventDefault()
          setContextMenu({ open: true, x: pos.x, y: pos.y, index: idx })
        }}
      />
    ))
  }, [meta?.files, isExpired, cancelled, meta?.passwordProtected, passwordVerified, handlePreview, handleDownloadSingle])

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

  if (verifyingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--bg)' }}>
        <Spinner size={32} />
        <p className="mt-4 text-sm font-medium" style={{ color: 'var(--text-2)' }}>Verifying authorization...</p>
      </div>
    )
  }

  if (!authorized) return null

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
          password={undefined}
          ownershipToken={ownershipToken}
          passwordRequired={false}
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
                  <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                    {memoizedFileList}
                  </motion.div>
                  <ContextMenu
                    open={contextMenu.open}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={senderMenuItems()}
                    onClose={() => setContextMenu(prev => ({ ...prev, open: false }))}
                  />
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
                      {copiedCode ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
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
                        className={confirmDelete ? 'btn-danger flex-1 text-xs' : 'btn-ghost flex-1 text-xs'}
                        onClick={handleDelete}
                        disabled={deleting}
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
