import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Share2, Clock, Trash2,
  MessageCircle, Mail, Maximize2, Send,
  QrCode, AlertTriangle, Lock, Eye, EyeOff, Loader2,
  XCircle, Flame
} from 'lucide-react'
import { QRCode } from 'react-qr-code'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import {
  getFileMetadata, getTransferActivity,
  extendTransfer, deleteTransfer, downloadSingleFile, verifyPassword, getTextContent
} from '../services/api'
import {
  getCachedTransfer,
  saveCachedTransfer,
  getCachedAI,
  saveCachedAI,
  mergeTransferData,
  saveTransfer,
  updateTransferStatus,
} from '../utils/storage'
import Navbar from '../components/Navbar'
import StatusBanner from '../components/StatusBanner'
import CountdownRing from '../components/CountdownRing'
import FileCard from '../components/FileCard'
import AISummaryCard from '../components/AISummaryCard'
import ActivityLog from '../components/ActivityLog'
import ProgressBar from '../components/ProgressBar'
import QRModal from '../components/QRModal'
import ErrorState from '../components/ErrorState'
import NearbyDevices from '../components/NearbyDevices'
import SharedTextDisplay from '../components/SharedTextDisplay'

const FilePreviewModal = lazy(() =>
  import('../components/FilePreviewModal').catch(() => ({ default: () => null }))
)

function buildShareMessage(fileLabel, shareLink, minutesLeft) {
  const expiryNote = minutesLeft <= 1 ? 'less than a minute' : `${minutesLeft} min`
  const title = `${fileLabel} — ready to download on SwiftShare`
  const text =
    `I'm sharing ${fileLabel} with you on SwiftShare — no account needed.\n\n` +
    `Tap to download instantly:\n${shareLink}\n\n` +
    `Link expires in ${expiryNote}, so open it soon!`
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
  const initialCachedAI = getCachedAI(normalizedCode) || initialCachedTransfer?.ai || null

  const [meta, setMeta] = useState(initialCachedTransfer)
  const [activity, setActivity] = useState([])
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
  const [extended, setExtended] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [qrModal, setQrModal] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [loading, setLoading] = useState(!initialCachedTransfer)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmExtend, setConfirmExtend] = useState(false)
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

  const mountedRef = useRef(true)
  const metaRef = useRef(initialCachedTransfer)
  const verifiedPreviewPasswordRef = useRef('')
  const activityRefreshTimerRef = useRef(null)
  const terminalNavigatedRef = useRef(false)
  useEffect(() => { return () => { mountedRef.current = false } }, [])
  useEffect(() => { metaRef.current = meta }, [meta])

  useEffect(() => {
    return () => {
      if (activityRefreshTimerRef.current) {
        window.clearTimeout(activityRefreshTimerRef.current)
        activityRefreshTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const protectedTransfer = Boolean(getCachedTransfer(normalizedCode)?.passwordProtected)
    setPasswordVerified(!protectedTransfer)
    setPreviewPassword('')
    setShowPreviewPassword(false)
    setPreviewPasswordError('')
    verifiedPreviewPasswordRef.current = ''
  }, [normalizedCode])

  useEffect(() => {
    if (!meta?.passwordProtected) {
      setPasswordVerified(true)
    } else if (!verifiedPreviewPasswordRef.current) {
      setPasswordVerified(false)
    }
  }, [meta?.passwordProtected])

  const baseShareUrl = import.meta.env.VITE_SHARE_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const shareLink = `${baseShareUrl}/g/${normalizedCode}`
  const canUseWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  // Title
  useEffect(() => {
    if (meta?.files?.[0]?.name) {
      document.title = `Sharing ${meta.files[0].name} · SwiftShare`
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

    if (merged.status === 'CANCELLED' || merged.status === 'DELETED') {
      setCancelled(true)
    }

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
        isSender: true,
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
      setError(null)
      setLoading(false)
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
    if (hasUsableCache) {
      return
    }

    // Otherwise fetch from API
    async function load() {
      if (!normalizedCode || !mountedRef.current) return
      setLoading(true)
      setError(null)
      try {
        const data = await getFileMetadata(normalizedCode, { timeout: 45000, noRetry: true })
        if (!mountedRef.current) return
        
        // Check for expired/not found BEFORE setting any state
        if (data.status === 'EXPIRED') {
          updateTransferStatus(normalizedCode, 'EXPIRED')
          navigate('/expired?reason=expired', { replace: true })
          return
        }
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
        if (!mountedRef.current) return
        const errCode = err?.response?.data?.error?.code
        // Only redirect for definitive backend responses (not network/timeout errors)
        if (errCode === 'TRANSFER_NOT_FOUND') {
          navigate('/expired?reason=notfound', { replace: true })
          return
        }
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
      registerSender(normalizedCode)
      rejoinRoom(normalizedCode)
    }

    connectRoom()

    const onTick = ({ secondsRemaining: s }) => setSecondsRemaining(Math.max(0, s))
    const onExpired = () => {
      if (!mountedRef.current) return
      updateTransferStatus(normalizedCode, 'EXPIRED')
      navigate('/expired?reason=expired', { replace: true })
    }
    const onAi = (data) => {
      if (!data) return
      setAi(data)
      setAiLoading(false)
      saveCachedAI(normalizedCode, data)
      patchCachedTransfer({ ai: data })
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
    const onExtended = ({ expiresAt }) => {
      if (expiresAt) {
        const newSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setSecondsRemaining(newSeconds)
        // Derive totalSeconds from actual remaining time, not hardcoded value
        setTotalSeconds(newSeconds)
        patchCachedTransfer({ expiresAt, secondsRemaining: newSeconds })
      }
      requestActivityRefresh()
    }
    const onActivityUpdated = () => {
      requestActivityRefresh()
    }

    socket.on('connect', connectRoom)
    socket.on('countdown-tick', onTick)
    socket.on('transfer-expired', onExpired)
    socket.on('ai-ready', onAi)
    socket.on('download-progress', onDownProg)
    socket.on('download-complete', onDownComplete)
    socket.on('transfer-receipt', onReceipt)
    socket.on('transfer-cancelled', onCancelled)
    socket.on('transfer-deleted', onDeleted)
    socket.on('transfer-extended', onExtended)
    socket.on('activity-updated', onActivityUpdated)

    return () => {
      socket.off('connect', connectRoom)
      socket.off('countdown-tick', onTick)
      socket.off('transfer-expired', onExpired)
      socket.off('ai-ready', onAi)
      socket.off('download-progress', onDownProg)
      socket.off('download-complete', onDownComplete)
      socket.off('transfer-receipt', onReceipt)
      socket.off('transfer-cancelled', onCancelled)
      socket.off('transfer-deleted', onDeleted)
      socket.off('transfer-extended', onExtended)
      socket.off('activity-updated', onActivityUpdated)
      if (downProgRaf) {
        cancelAnimationFrame(downProgRaf)
        downProgRaf = 0
      }
      leaveRoom(normalizedCode)
    }
  }, [socket, normalizedCode, registerSender, rejoinRoom, leaveRoom, navigate, patchCachedTransfer, requestActivityRefresh])

  // Copy helpers
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(normalizedCode).then(() => {
      setCopiedCode(true)
      toast.success('Code copied')
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }, [normalizedCode])

  const copyLink = useCallback(async () => {
    const setCopied = () => {
      setCopiedLink(true)
      toast.success('Link copied')
      setTimeout(() => setCopiedLink(false), 2000)
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink)
        setCopied()
        return true
      }
    } catch {}

    try {
      const ta = document.createElement('textarea')
      ta.value = shareLink
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      ta.style.pointerEvents = 'none'
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) {
        setCopied()
        return true
      }
    } catch {}

    toast.error('Could not copy link on this browser')
    return false
  }, [shareLink])

  // Ctrl+C shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection()?.toString()) {
        copyCode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copyCode])

  // Extend
  async function handleExtend() {
    if (extending) return
    if (!confirmExtend) {
      setConfirmExtend(true)
      setTimeout(() => setConfirmExtend(false), 3000)
      return
    }

    setExtending(true)
    try {
      await extendTransfer(normalizedCode)
      setExtended(true)
      setConfirmExtend(false)
      // Don't update state here - let the socket event handle it to avoid double updates
      toast.success('Extended by 10 minutes')
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
      await deleteTransfer(normalizedCode)
      toast.success('Transfer cancelled permanently')
      terminalNavigatedRef.current = true
      setCancelled(true)
      patchCachedTransfer({ status: 'CANCELLED' })
      updateTransferStatus(normalizedCode, 'CANCELLED')
      setConfirmDelete(false)
      navigate('/expired?reason=cancelled', { replace: true })
    } catch {
      toast.error('Failed to cancel')
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
        toast.success('Preview unlocked')
        return
      }

      setPreviewPasswordError('Verification failed. Please try again.')
    } catch (err) {
      const errCode = err?.response?.data?.error?.code
      if (errCode === 'INVALID_PASSWORD') {
        setPreviewPasswordError('Wrong password. Please try again.')
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

  // Check if this is a text share
  const isTextShare = meta?.files?.length === 1 && meta.files[0]?.name?.endsWith('.txt')

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

  // Share helpers
  async function handleWebShare() {
    const fileCount = Array.isArray(meta?.files) ? meta.files.length : 0
    const primaryFileName = String(meta?.files?.[0]?.name || '').trim()
    const fileLabel = fileCount > 1 ? `${fileCount} files` : (primaryFileName || 'a file')
    const minutesLeft = Math.max(1, Math.ceil((Number(secondsRemaining) || 0) / 60))
    const { title: shareTitle, text: shareText } = buildShareMessage(fileLabel, shareLink, minutesLeft)

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: shareLink,
    }

    if (canUseWebShare) {
      try {
        const canSharePayload = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true
        if (canSharePayload) {
          await navigator.share(shareData)
          return
        }
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }

    const copied = await copyLink()
    if (copied) return

    const mailto = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`
    try {
      window.location.href = mailto
      toast.success('Opened share app')
    } catch {
      toast.error('Share is not supported on this browser')
    }
  }

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
      if (data.status === 'EXPIRED') {
        updateTransferStatus(normalizedCode, 'EXPIRED')
        navigate('/expired?reason=expired', { replace: true })
        return
      }
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
      else if (errCode === 'TRANSFER_EXPIRED') {
        updateTransferStatus(normalizedCode, 'EXPIRED')
        navigate('/expired?reason=expired', { replace: true })
      }
      else if (errCode === 'ALREADY_DOWNLOADED') {
        updateTransferStatus(normalizedCode, 'DELETED')
        navigate('/expired?reason=burned', { replace: true })
      }
      else setError(err?.response ? (errCode || 'SERVER_ERROR') : 'NETWORK_ERROR')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [normalizedCode, navigate, applyTransferSnapshot])

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="pt-20 max-w-6xl mx-auto px-4 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="shimmer-block h-16 w-full" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="pt-20">
          <ErrorState
            code={error}
            onRetry={handleRetry}
            autoRetry={true}
          />
        </div>
      </div>
    )
  }

  // Handle expired/deleted transfers
  if (!meta || meta.status === 'EXPIRED' || cancelled) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <div className="pt-20 max-w-2xl mx-auto px-4">
          <motion.div
            className="surface-card p-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--warning-soft)' }}>
              <Clock size={32} style={{ color: 'var(--warning)' }} />
            </div>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text)' }}>
              {cancelled ? 'Transfer Cancelled' : 'Transfer Expired'}
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
              {cancelled 
                ? 'This transfer has been permanently deleted.'
                : 'This transfer has expired and is no longer available.'}
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
  const _shareMinutesLeft = Math.max(1, Math.ceil((Number(secondsRemaining) || 0) / 60))
  const { title: _shareTitle, text: _shareText } = buildShareMessage(_shareFileLabel, shareLink, _shareMinutesLeft)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <QRModal open={qrModal} onClose={() => setQrModal(false)} value={shareLink} code={normalizedCode} />

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
              {/* Cancelled banner - inline, not fixed */}
              <AnimatePresence>
                {cancelled && (
                  <StatusBanner
                    key="cancelled"
                    tone="danger"
                    icon={XCircle}
                    title="Transfer cancelled — files permanently deleted"
                  />
                )}
              </AnimatePresence>

              {/* Password box - only show for non-text shares */}
              {meta?.passwordProtected && !passwordVerified && !isTextShare && (
                <motion.div
                  className="surface-card p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
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
                      <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>
                        {previewPasswordError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="btn-primary text-sm"
                      disabled={!previewPassword.trim() || previewUnlocking}
                    >
                      {previewUnlocking ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                      {previewUnlocking ? 'Verifying...' : 'Unlock preview'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Text Share Display or Files */}
              {isTextShare ? (
                /* Show text content inline */
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                    Shared Text
                  </h2>
                  {textLoading ? (
                    <div className="surface-card p-8 text-center">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: 'var(--accent)' }} />
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
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                    Shared Files ({meta?.files?.length || 0})
                  </h2>
                  <div className="space-y-2">
                    {(meta?.files || []).map((f, i) => (
                      <FileCard
                        key={i}
                        file={f}
                        index={i}
                        showDownload={!cancelled && (!meta?.passwordProtected || passwordVerified)}
                        onPreview={(!meta?.passwordProtected || passwordVerified) ? () => handlePreview(i) : undefined}
                        onDownloadSingle={(!meta?.passwordProtected || passwordVerified) ? () => handleDownloadSingle(i) : undefined}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Download progress */}
              {downloadProgress !== null && downloadProgress < 100 && (
                <motion.div className="surface-card p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ProgressBar percent={downloadProgress} label="Someone is downloading..." showSpeed={false} />
                </motion.div>
              )}

              {/* AI Summary */}
              <AISummaryCard ai={ai} loading={aiLoading} />

              {/* Activity */}
              <ActivityLog activity={activity} />
            </div>

            {/* ═══ RIGHT: sticky share panel ═══ */}
            <div className="lg:col-span-2 mt-8 lg:mt-0">
              <div className="lg:sticky lg:top-20 space-y-5">
                {/* QR Code */}
                <motion.div
                  className="surface-card p-5 text-center"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 20 }}
                >
                  <button
                    className="inline-block p-4 rounded-2xl mx-auto mb-4 transition-transform hover:scale-105 cursor-pointer relative group"
                    style={{ background: 'var(--qr-bg)', border: '1px solid var(--border)' }}
                    onClick={() => setQrModal(true)}
                  >
                    <QRCode id="sender-qr-code" value={shareLink} size={160} bgColor="var(--qr-bg)" fgColor="var(--qr-fg)" level="M" />
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.06, type: 'spring', damping: 15 }}
                        onClick={copyCode}
                        title="Click to copy code"
                      >
                        {ch}
                      </motion.button>
                    ))}
                  </div>

                  {/* Copy buttons */}
                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1 text-xs" onClick={copyCode}>
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      {copiedCode ? 'Copied!' : 'Copy code'}
                    </button>
                    <button className="btn-secondary flex-1 text-xs" onClick={handleWebShare}>
                      {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                      {copiedLink ? 'Link copied' : 'Share'}
                    </button>
                  </div>
                </motion.div>

                {/* Share options */}
                <div className="surface-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                    <Share2 size={12} className="inline mr-1" /> Share via
                  </h3>
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
                    <button className="btn-ghost justify-center col-span-2" onClick={handleWebShare}>
                      <Share2 size={14} />
                      {canUseWebShare ? 'Share' : 'Share (copy link)'}
                    </button>
                  </div>
                </div>

                {/* Nearby share prompts */}
                {!cancelled && (
                  <NearbyDevices
                    currentTransferCode={normalizedCode}
                    currentFilename={meta?.files?.[0]?.name || 'file'}
                  />
                )}

                {/* Countdown */}
                {!cancelled && (
                  <div className="surface-card p-5 text-center">
                    <CountdownRing secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} size={130} />

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
                          <><Clock size={13} />{extending ? 'Extending...' : (extended ? 'Extended' : '+10 min')}</>
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
