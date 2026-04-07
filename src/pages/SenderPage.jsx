import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Copy, Check, ExternalLink, Share2, Clock, Trash2,
  MessageCircle, Mail, Monitor, Maximize2
} from 'lucide-react'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import {
  getFileMetadata, getTransferActivity,
  extendTransfer, deleteTransfer
} from '../services/api'
import Navbar from '../components/Navbar'
import CountdownRing from '../components/CountdownRing'
import FileCard from '../components/FileCard'
import AISummaryCard from '../components/AISummaryCard'
import ActivityLog from '../components/ActivityLog'
import ProgressBar from '../components/ProgressBar'
import QRModal from '../components/QRModal'
import ErrorState from '../components/ErrorState'

export default function SenderPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { socket, registerSender, rejoinRoom, leaveRoom } = useSocket()

  const [meta, setMeta] = useState(null)
  const [activity, setActivity] = useState([])
  const [ai, setAi] = useState(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(600)
  const [extended, setExtended] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [qrModal, setQrModal] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const shareLink = `${import.meta.env.VITE_SHARE_BASE_URL || window.location.origin}/g/${code}`

  // Title
  useEffect(() => {
    if (meta?.files?.[0]?.name) {
      document.title = `Sharing ${meta.files[0].name} · SwiftShare`
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
        setTotalSeconds(data.secondsRemaining || 600)
        if (data.ai) { setAi(data.ai); setAiLoading(false) }
      } catch (err) {
        const errCode = err?.response?.data?.error?.code
        if (errCode === 'TRANSFER_NOT_FOUND' || errCode === 'TRANSFER_EXPIRED') {
          navigate('/expired?reason=' + (errCode === 'TRANSFER_EXPIRED' ? 'expired' : 'notfound'), { replace: true })
        } else {
          setError(errCode || 'SERVER_ERROR')
        }
      }
      setLoading(false)
    }
    load()
  }, [code, navigate])

  // Fetch activity
  const loadActivity = useCallback(async () => {
    if (!code) return
    try {
      const data = await getTransferActivity(code)
      if (data?.activity) setActivity(data.activity)
    } catch {}
  }, [code])

  useEffect(() => {
    if (!code) return
    loadActivity()
    const iv = setInterval(loadActivity, 8000)
    return () => clearInterval(iv)
  }, [code, loadActivity])

  // Socket
  useEffect(() => {
    if (!socket || !code) return

    const connectRoom = () => {
      registerSender(code)
      rejoinRoom(code)
    }

    connectRoom()

    const onTick = ({ secondsRemaining: s }) => setSecondsRemaining(Math.max(0, s))
    const onExpired = () => navigate('/expired?reason=expired', { replace: true })
    const onAi = (data) => { setAi(data); setAiLoading(false) }
    const onDownProg = ({ percent }) => setDownloadProgress(percent || 0)
    const onDownComplete = () => {
      setDownloadProgress(100)
      void loadActivity()
      window.setTimeout(() => setDownloadProgress(null), 1500)
    }
    const onReceipt = (receipt) => {
      const currentCode = String(code || '').trim().toUpperCase()
      const receiptCode = String(receipt?.transferId || '').trim().toUpperCase()
      if (receiptCode && receiptCode !== currentCode) return
      if (receipt?.receiver) {
        toast.success(`Downloaded by ${receipt.receiver}`)
      }
    }

    socket.on('connect', connectRoom)
    socket.on('countdown-tick', onTick)
    socket.on('transfer-expired', onExpired)
    socket.on('ai-ready', onAi)
    socket.on('download-progress', onDownProg)
    socket.on('download-complete', onDownComplete)
    socket.on('transfer-receipt', onReceipt)

    return () => {
      socket.off('connect', connectRoom)
      socket.off('countdown-tick', onTick)
      socket.off('transfer-expired', onExpired)
      socket.off('ai-ready', onAi)
      socket.off('download-progress', onDownProg)
      socket.off('download-complete', onDownComplete)
      socket.off('transfer-receipt', onReceipt)
      leaveRoom(code)
    }
  }, [socket, code, registerSender, rejoinRoom, leaveRoom, navigate, loadActivity])

  // Copy helpers
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      toast.success('Code copied')
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }, [code])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopiedLink(true)
      toast.success('Link copied')
      setTimeout(() => setCopiedLink(false), 2000)
    })
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
    try {
      await extendTransfer(code)
      setExtended(true)
      toast.success('Extended by 10 minutes')
    } catch { toast.error('Failed to extend') }
  }

  // Delete
  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await deleteTransfer(code)
      toast.success('Transfer cancelled')
      navigate('/', { replace: true })
    } catch { toast.error('Failed to cancel') }
  }

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
        <div className="pt-20"><ErrorState code={error} /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <QRModal open={qrModal} onClose={() => setQrModal(false)} value={shareLink} code={code} />

      <main className="pt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="lg:grid lg:grid-cols-5 lg:gap-10">

            {/* ═══ LEFT: scrolling content ═══ */}
            <div className="lg:col-span-3 space-y-5">
              {/* Files */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Shared Files ({meta?.files?.length || 0})
                </h2>
                <div className="space-y-2">
                  {(meta?.files || []).map((f, i) => (
                    <FileCard key={i} file={f} index={i} />
                  ))}
                </div>
              </motion.div>

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
                    <QRCode value={shareLink} size={160} bgColor="var(--qr-bg)" fgColor="var(--qr-fg)" level="M" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" style={{ background: 'rgba(0,0,0,0.05)' }}>
                      <Maximize2 size={20} style={{ color: 'var(--text-3)' }} />
                    </div>
                  </button>

                  {/* Code characters */}
                  <div className="flex justify-center gap-1.5 mb-4">
                    {(code || '').split('').map((ch, i) => (
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
                    <button className="btn-secondary flex-1 text-xs" onClick={copyLink}>
                      {copiedLink ? <Check size={14} /> : <ExternalLink size={14} />}
                      {copiedLink ? 'Copied!' : 'Copy link'}
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
                      href={`https://wa.me/?text=${encodeURIComponent(`Download my file: ${shareLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost justify-center"
                    >
                      <MessageCircle size={14} />WhatsApp
                    </a>
                    <a
                      href={`mailto:?subject=File%20for%20you&body=${encodeURIComponent(`Download here: ${shareLink}`)}`}
                      className="btn-ghost justify-center"
                    >
                      <Mail size={14} />Email
                    </a>
                    <a
                      href={`/download/${code}`}
                      className="btn-ghost justify-center"
                    >
                      <Monitor size={14} />This device
                    </a>
                  </div>
                </div>

                {/* Countdown */}
                <div className="surface-card p-5 text-center">
                  <CountdownRing secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} size={130} />

                  <div className="mt-4 flex gap-2">
                    <button
                      className="btn-ghost flex-1 text-xs"
                      onClick={handleExtend}
                      disabled={extended}
                    >
                      <Clock size={13} />
                      {extended ? 'Extended' : '+10 min'}
                    </button>
                    <button
                      className="btn-ghost flex-1 text-xs hover:!text-red-500"
                      onClick={handleDelete}
                    >
                      <Trash2 size={13} />
                      {confirmDelete ? 'Confirm?' : 'Cancel'}
                    </button>
                  </div>
                </div>

                {/* Burn badge */}
                {meta?.burnAfterDownload && (
                  <div className="p-3 rounded-xl text-center" style={{ background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.15)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
                      🔥 Burn after download enabled — file will delete after first download
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
