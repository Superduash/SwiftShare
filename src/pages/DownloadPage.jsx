import React, { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, CheckCircle2, Lock, Eye, EyeOff, ShieldX, AlertTriangle } from 'lucide-react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import { getFileMetadata, previewUrl, verifyPassword, downloadSingleFile } from '../services/api'
import { smartDownload } from '../utils/download'
import { saveTransfer } from '../utils/storage'
import { formatBytes } from '../utils/format'
import { extractErrorCode } from '../utils/errors'
import Navbar from '../components/Navbar'
import CountdownRing from '../components/CountdownRing'
import FileCard from '../components/FileCard'
import AISummaryCard from '../components/AISummaryCard'
import ProgressBar from '../components/ProgressBar'
import TransferReceipt from '../components/TransferReceipt'

const FilePreviewModal = lazy(() => import('../components/FilePreviewModal'))

export default function DownloadPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { socket, joinRoom, leaveRoom } = useSocket()

  const [meta, setMeta] = useState(null)
  const [ai, setAi] = useState(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(600)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloaded, setDownloaded] = useState(false)
  const [previewSrc, setPreviewSrc] = useState(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [transferStatus, setTransferStatus] = useState('ACTIVE')
  const [previewFile, setPreviewFile] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [receipt, setReceipt] = useState(null)
  const verifiedPasswordRef = useRef('')
  const downloadingRef = useRef(false)

  useEffect(() => {
    downloadingRef.current = downloading
  }, [downloading])

  // Title
  useEffect(() => {
    if (meta?.files?.[0]?.name) {
      document.title = `${meta.files[0].name} · SwiftShare`
    }
  }, [meta])

  // Fetch metadata
  useEffect(() => {
    if (!code) return
    async function load() {
      try {
        const data = await getFileMetadata(code)
        setMeta(data)
        setSecondsRemaining(data.secondsRemaining || 0)
        const sessionDuration = data.expiresAt && data.createdAt
          ? Math.ceil((new Date(data.expiresAt).getTime() - new Date(data.createdAt).getTime()) / 1000)
          : 600
        setTotalSeconds(Math.max(sessionDuration, 60))
        if (data.passwordProtected) { setNeedsPassword(true) }
        if (data.ai) { setAi(data.ai); setAiLoading(false) }
        if (data.status) { setTransferStatus(data.status) }

        // Preview for images — skip if password-protected (will set after verification)
        const firstFile = data?.files?.[0]
        const firstFileType = String(firstFile?.mimeType || firstFile?.type || '').toLowerCase()
        if (firstFile && firstFileType.startsWith('image/') && !data.passwordProtected) {
          setPreviewSrc(previewUrl(code, 0))
        }

        saveTransfer({ code, filename: firstFile?.name || code, isSender: false })
      } catch (err) {
        const errCode = extractErrorCode(err)
        if (errCode === 'TRANSFER_EXPIRED') navigate('/expired?reason=expired', { replace: true })
        else if (errCode === 'ALREADY_DOWNLOADED') navigate('/expired?reason=burned', { replace: true })
        else if (errCode === 'TRANSFER_NOT_FOUND') navigate('/expired?reason=notfound', { replace: true })
        else toast.error('Failed to load transfer')
      }
      setLoading(false)
    }
    load()
  }, [code, navigate])

  // Socket
  useEffect(() => {
    if (!socket || !code) return

    const connectRoom = () => {
      joinRoom(code)
    }

    connectRoom()

    const onTick = ({ secondsRemaining: s }) => setSecondsRemaining(Math.max(0, s))
    const onExpired = () => {
      setTransferStatus('EXPIRED')
      setSecondsRemaining(0)
    }
    const onAi = (data) => { setAi(data); setAiLoading(false) }
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
    }
    const onDeleted = ({ reason } = {}) => {
      setTransferStatus('DELETED')
      if (reason === 'burn' && !downloaded) {
        toast.error('This file was just burned after being downloaded')
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
      leaveRoom(code)
    }
  }, [socket, code, joinRoom, leaveRoom, navigate, downloaded])

  // Password verification
  async function handlePasswordSubmit(e) {
    e?.preventDefault()
    if (!password.trim() || verifying) return
    setVerifying(true)
    setPasswordError('')
    try {
      const result = await verifyPassword(code, password)
      if (result?.verified) {
        setPasswordVerified(true)
        verifiedPasswordRef.current = password
        const firstFile = meta?.files?.[0]
        const firstFileType = String(firstFile?.type || '').toLowerCase()
        if (firstFile && firstFileType.startsWith('image/')) {
          setPreviewSrc(previewUrl(code, 0, password))
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
    }
    setVerifying(false)
  }

  // Download
  async function handleDownload() {
    if (downloading || downloaded) return
    setDownloading(true)
    try {
      await smartDownload(code, {
        aiName: ai?.suggestedName,
        originalName: meta?.files?.[0]?.name,
        password: verifiedPasswordRef.current || undefined,
      })
      setDownloaded(true)
      setDownloading(false)

      // Confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E8634A', '#FFB88A', '#FF9A5C', '#16A34A', '#0891B2'],
      })
    } catch {
      setDownloading(false)
      toast.error('Download failed')
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
    downloadSingleFile(code, index, pw)
  }

  const isUnavailable = transferStatus === 'CANCELLED' || transferStatus === 'DELETED' || transferStatus === 'EXPIRED'
  const canDownload = !isUnavailable && !downloaded && (!needsPassword || passwordVerified)

  if (loading) {
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <Suspense fallback={null}>
        <FilePreviewModal
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
          code={code}
          fileIndex={previewIndex}
          onDownload={canDownload ? handleDownloadSingle : undefined}
        />
      </Suspense>

      <main className="pt-14">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">

          {/* Status banner */}
          <AnimatePresence>
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
              {meta?.senderDeviceName ? `From ${meta.senderDeviceName}` : `Code: ${code}`}
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
                loading="lazy"
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
                onPreview={() => handlePreview(i)}
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
                  code={code}
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
            <AISummaryCard ai={ai} loading={aiLoading} />
          </div>
        </div>
      </main>
    </div>
  )
}
