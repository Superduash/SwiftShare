import React, { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import {
  Copy, Check, Link2, Clock, RefreshCw, Trash2,
  ArrowLeft, Zap, AlertTriangle, Download
} from 'lucide-react'
import {
  getFileMetadata, getTransferActivity, extendTransfer,
  deleteTransfer, downloadFile, downloadSingleFile, previewUrl
} from '../services/api'
import { useSocket } from '../context/SocketContext'
import { useTransfer } from '../context/TransferContext'
import FileCard from '../components/FileCard'
import AISummaryCard from '../components/AISummaryCard'
import ActivityLog from '../components/ActivityLog'
import CountdownRing from '../components/CountdownRing'
import ProgressBar from '../components/ProgressBar'

function getTotalCountdownSeconds(data) {
  const createdAt = data?.createdAt ? new Date(data.createdAt).getTime() : null
  const expiresAt = data?.expiresAt ? new Date(data.expiresAt).getTime() : null

  if (!createdAt || !expiresAt || expiresAt <= createdAt) {
    return 600
  }

  return Math.max(1, Math.ceil((expiresAt - createdAt) / 1000))
}

export default function SenderPage() {
  const { code } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket, registerSender, joinRoom, isConnected } = useSocket()
  const { uploadData, setAiData } = useTransfer()

  const [transfer, setTransfer] = useState(location.state?.transferData || uploadData || null)
  const [ai, setAi] = useState(transfer?.ai || null)
  const [activity, setActivity] = useState([])
  const [secondsRemaining, setSecondsRemaining] = useState(null)
  const [expired, setExpired] = useState(false)
  const [extendedOnce, setExtendedOnce] = useState(false)
  const [extending, setExtending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [aiLoading, setAiLoading] = useState(!ai)
  const [totalSeconds, setTotalSeconds] = useState(getTotalCountdownSeconds(transfer))
  const [showSocketWarning, setShowSocketWarning] = useState(false)
  const shareLink = transfer?.shareLink || transfer?.data?.shareLink || `${import.meta.env.VITE_SHARE_BASE_URL}/join?code=${code}`

  // Load transfer data if not in state
  useEffect(() => {
    if (!transfer) {
      getFileMetadata(code)
        .then(data => {
          setTransfer(data)
          setAi(data.ai || null)
          setExtendedOnce(Boolean(data?.extendedOnce))
          setTotalSeconds(getTotalCountdownSeconds(data))
          if (data.ai) setAiLoading(false)
          if (data.secondsRemaining != null) setSecondsRemaining(data.secondsRemaining)
        })
        .catch(() => navigate('/'))
    } else {
      if (transfer.secondsRemaining != null) setSecondsRemaining(transfer.secondsRemaining)
      else {
        const expAt = new Date(transfer.expiresAt).getTime()
        setSecondsRemaining(Math.max(0, Math.ceil((expAt - Date.now()) / 1000)))
      }
      setExtendedOnce(Boolean(transfer?.extendedOnce))
      setTotalSeconds(getTotalCountdownSeconds(transfer))
    }
  }, [code])

  // Register socket
  useEffect(() => {
    if (!code) return
    registerSender(code)
    joinRoom(code)
  }, [code, registerSender, joinRoom])

  // Fetch activity
  useEffect(() => {
    const fetch = () => getTransferActivity(code).then(d => setActivity(d?.activity || [])).catch(() => {})
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [code])

  // Socket events
  useEffect(() => {
    if (!socket) return

    const onAiReady = (data) => {
      const aiData = { summary: data.summary, category: data.category, suggestedName: data.suggestedName }
      setAi(aiData)
      setAiData(aiData)
      setAiLoading(false)
      toast('✨ AI analysis complete!', { icon: '🤖' })
    }
    const onCountdown = ({ secondsRemaining: s }) => setSecondsRemaining(s)
    const onExpired = () => {
      setExpired(true)
      toast.error('Transfer expired')
    }
    const onDownloadProgress = ({ percent }) => setDownloadPercent(percent || 0)

    socket.on('ai-ready', onAiReady)
    socket.on('countdown-tick', onCountdown)
    socket.on('transfer-expired', onExpired)
    socket.on('download-progress', onDownloadProgress)

    return () => {
      socket.off('ai-ready', onAiReady)
      socket.off('countdown-tick', onCountdown)
      socket.off('transfer-expired', onExpired)
      socket.off('download-progress', onDownloadProgress)
    }
  }, [socket])

  useEffect(() => {
    let timer = null

    if (!isConnected) {
      timer = setTimeout(() => {
        setShowSocketWarning(true)
      }, 5000)
    } else {
      setShowSocketWarning(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isConnected])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCodeCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setLinkCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleExtend = async () => {
    setExtending(true)
    try {
      const result = await extendTransfer(code)
      const isExtended = Boolean(result?.extendedOnce)
      const nextExpiresAt = result?.expiresAt || transfer?.expiresAt

      setExtendedOnce(isExtended)
      if (nextExpiresAt) {
        const nextSeconds = Math.max(0, Math.ceil((new Date(nextExpiresAt).getTime() - Date.now()) / 1000))
        setSecondsRemaining(nextSeconds)
      }

      if (transfer) {
        const nextTransfer = { ...transfer, expiresAt: nextExpiresAt, extendedOnce: isExtended }
        setTransfer(nextTransfer)
        setTotalSeconds(getTotalCountdownSeconds(nextTransfer))
      }

      toast.success('Extended by 10 minutes!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExtending(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Cancel this transfer? The file will be deleted.')) return
    setDeleting(true)
    try {
      await deleteTransfer(code)
      toast.success('Transfer cancelled')
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const files = transfer?.files || []

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="blob-cyan fixed top-0 right-0 translate-x-1/2 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Nav */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button className="btn-ghost flex items-center gap-2 text-sm py-2 px-3" onClick={() => navigate('/')}>
            <ArrowLeft size={14} />
            New Transfer
          </button>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent-cyan" />
            <span className="text-text-primary font-bold text-sm">Swift<span className="text-accent-cyan">Share</span></span>
          </div>
        </motion.div>

        {/* Expired banner */}
        <AnimatePresence>
          {expired && (
            <motion.div
              className="expired-banner flex items-center gap-2 mb-6"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertTriangle size={14} />
              This transfer has expired. Files have been deleted.
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSocketWarning && !expired && (
            <motion.div
              className="mb-6 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.24)', color: '#FBBF24' }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertTriangle size={14} />
              Live connection is unstable. Countdown and activity may refresh slowly.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download progress (for receiver activity) */}
        {downloadPercent > 0 && downloadPercent < 100 && (
          <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ProgressBar percent={downloadPercent} label="Someone is downloading..." color="#10B981" />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5 order-2 lg:order-1">
            {/* Files */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-text-primary font-bold text-base mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-accent-cyan rounded-full block" />
                Files ({files.length})
              </h2>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <FileCard
                    key={i}
                    file={file}
                    index={i}
                    onPreview={() => window.open(previewUrl(code, i), '_blank')}
                    onDownloadSingle={() => downloadSingleFile(code, i)}
                    showDownload={files.length > 1}
                  />
                ))}
              </div>
            </motion.div>

            {/* AI Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AISummaryCard ai={ai} loading={aiLoading} />
            </motion.div>

            {/* Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ActivityLog activity={activity} />
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <motion.div
            className="space-y-5 order-1 lg:order-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {/* QR + Code card */}
            <div className="glass-card p-6 glow-cyan">
              {/* QR code */}
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-2xl" style={{ background: '#0F1628', border: '1px solid rgba(34,211,238,0.25)' }}>
                  <QRCode
                    value={shareLink}
                    size={200}
                    bgColor="#0F1628"
                    fgColor="#22D3EE"
                    level="M"
                  />
                </div>
              </div>

              {/* 6-digit code */}
              <div className="flex justify-center gap-2 mb-4">
                {(code || '').split('').map((char, i) => (
                  <motion.div
                    key={i}
                    className={`code-char ${char ? 'filled' : ''}`}
                    style={{width:"clamp(34px,8vw,52px)",height:"clamp(42px,10vw,64px)",fontSize:"clamp(15px,3.5vw,28px)"}}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                  >
                    {char}
                  </motion.div>
                ))}
              </div>

              <p className="text-text-dim text-xs text-center mb-5">Scan or enter code on any device</p>

              {/* Action buttons */}
              <div className="flex gap-2 mb-5">
                <button
                  className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5"
                  onClick={handleCopyCode}
                >
                  {codeCopied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                  {codeCopied ? 'Copied!' : 'Copy Code'}
                </button>
                <button
                  className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5"
                  onClick={handleCopyLink}
                >
                  {linkCopied ? <Check size={14} className="text-accent-green" /> : <Link2 size={14} />}
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* WhatsApp share */}
              <a
                href={`https://wa.me/?text=SwiftShare%3A%20${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-text-muted border border-border-color hover:border-green-500/40 hover:text-green-400 transition-all"
              >
                <span>📱</span> Share via WhatsApp
              </a>
            </div>

            {/* Countdown */}
            <div className="glass-card p-5 flex flex-col items-center gap-3">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Time remaining</p>
              {secondsRemaining !== null && (
                <CountdownRing
                  secondsRemaining={secondsRemaining}
                  totalSeconds={totalSeconds || 600}
                  size={130}
                />
              )}
              <p className="text-text-dim text-xs text-center">
                File auto-deletes when timer reaches zero
              </p>
            </div>

            {/* Controls */}
            <div className="glass-card p-4 space-y-3">
              <button
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  extendedOnce || expired
                    ? 'bg-bg-elevated text-text-dim border border-border-color cursor-not-allowed'
                    : 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/25 hover:bg-accent-yellow/15'
                }`}
                onClick={handleExtend}
                disabled={extendedOnce || extending || expired}
              >
                {extending
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw size={14} /></motion.div>
                  : <Clock size={14} />
                }
                {extendedOnce ? 'Extended' : extending ? 'Extending...' : 'Extend 10 min'}
              </button>

              <button
                className="btn-danger w-full flex items-center justify-center gap-2 text-sm py-2.5"
                onClick={handleDelete}
                disabled={deleting || expired}
              >
                {deleting
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}><RefreshCw size={14} /></motion.div>
                  : <Trash2 size={14} />
                }
                {deleting ? 'Cancelling...' : 'Cancel Transfer'}
              </button>
            </div>

            {/* Direct download (for sender convenience) */}
            {!expired && (
              <button
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={() => downloadFile(code)}
              >
                <Download size={16} />
                Download Own File
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
