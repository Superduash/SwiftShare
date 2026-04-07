import React, { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { ArrowLeft, Download, Zap, AlertTriangle, Check, FileText, Image } from 'lucide-react'
import { getFileMetadata, downloadFile, downloadSingleFile, previewUrl } from '../services/api'
import { useSocket } from '../context/SocketContext'
import FileCard from '../components/FileCard'
import AISummaryCard from '../components/AISummaryCard'
import CountdownRing from '../components/CountdownRing'
import ProgressBar from '../components/ProgressBar'

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function fireConfetti() {
  confetti({ particleCount: 80, spread: 70, origin: { x: 0.2, y: 0.6 }, colors: ['#22D3EE', '#8B5CF6', '#10B981'] })
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.8, y: 0.6 }, colors: ['#22D3EE', '#F59E0B', '#10B981'] })
  }, 200)
}

export default function DownloadPage() {
  const { code } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { socket, joinRoom } = useSocket()

  const [fileData, setFileData] = useState(location.state?.fileData || null)
  const [secondsRemaining, setSecondsRemaining] = useState(null)
  const [expired, setExpired] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloaded, setDownloaded] = useState(false)
  const [loading, setLoading] = useState(!fileData)
  const [previewError, setPreviewError] = useState(false)
  const downloadedRef = useRef(false)

  // Fetch metadata if not in state
  useEffect(() => {
    if (!fileData) {
      getFileMetadata(code)
        .then(data => {
          setFileData(data)
          if (data.secondsRemaining != null) setSecondsRemaining(data.secondsRemaining)
          setLoading(false)
        })
        .catch(err => {
          const msg = err.message || ''
          if (msg.toLowerCase().includes('expired')) navigate('/expired', { state: { reason: 'expired' } })
          else if (msg.toLowerCase().includes('already')) navigate('/expired', { state: { reason: 'burned' } })
          else navigate('/expired', { state: { reason: 'notfound' } })
        })
    } else {
      if (fileData.secondsRemaining != null) setSecondsRemaining(fileData.secondsRemaining)
      setLoading(false)
    }
  }, [code])

  // Socket
  useEffect(() => {
    if (!code) return
    joinRoom(code)
  }, [code, joinRoom])

  useEffect(() => {
    if (!socket) return
    const onCountdown = ({ secondsRemaining: s }) => setSecondsRemaining(s)
    const onExpired = () => {
      setExpired(true)
      toast.error('Transfer expired')
    }
    const onProgress = ({ percent }) => {
      setDownloadPercent(percent || 0)
      if (percent >= 100 && !downloadedRef.current) {
        downloadedRef.current = true
        setDownloaded(true)
        fireConfetti()
        toast.success('Transfer complete! 🎉')
      }
    }

    socket.on('countdown-tick', onCountdown)
    socket.on('transfer-expired', onExpired)
    socket.on('download-progress', onProgress)

    return () => {
      socket.off('countdown-tick', onCountdown)
      socket.off('transfer-expired', onExpired)
      socket.off('download-progress', onProgress)
    }
  }, [socket])

  const handleDownload = () => {
    downloadFile(code)
    // Simulate progress start for UX
    setDownloadPercent(5)
  }

  const handleDownloadSingle = (idx) => {
    downloadSingleFile(code, idx)
    setDownloadPercent(5)
  }

  const files = fileData?.files || []
  const isSingleFile = files.length === 1
  const firstFile = files[0]
  const isImage = firstFile?.type?.startsWith('image/')
  const isPdf = firstFile?.type?.includes('pdf') || firstFile?.icon === 'pdf'

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl skeleton mx-auto" />
          <div className="w-48 h-4 skeleton rounded mx-auto" />
          <div className="w-32 h-3 skeleton rounded mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="blob-cyan fixed bottom-0 right-0 translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-4 py-10">

        {/* Nav */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button className="btn-ghost flex items-center gap-2 text-sm py-2 px-3" onClick={() => navigate('/join')}>
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent-cyan" />
            <span className="text-text-primary font-bold text-sm">Swift<span className="text-accent-cyan">Share</span></span>
          </div>
        </motion.div>

        {/* Expired banner */}
        <AnimatePresence>
          {expired && (
            <motion.div className="expired-banner flex items-center gap-2 mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AlertTriangle size={14} />
              This transfer has expired.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success state */}
        <AnimatePresence>
          {downloaded && (
            <motion.div
              className="glass-card p-5 mb-5 text-center"
              style={{ borderColor: 'rgba(16,185,129,0.3)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-accent-green/10 border border-accent-green/25 flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-accent-green" />
              </div>
              <h3 className="text-text-primary font-bold text-lg">Transfer Complete!</h3>
              <p className="text-text-muted text-sm mt-1">File received successfully</p>
              {fileData?.senderDeviceName && (
                <p className="text-text-dim text-xs mt-2">Sent from: {fileData.senderDeviceName}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* File preview */}
        {isSingleFile && isImage && !previewError && (
          <motion.div
            className="glass-card p-3 mb-5 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <img
              src={previewUrl(code, 0)}
              alt={firstFile.name}
              className="w-full rounded-xl object-cover max-h-64"
              onError={() => setPreviewError(true)}
            />
          </motion.div>
        )}

        {isSingleFile && isPdf && (
          <motion.div
            className="glass-card p-4 mb-5 flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <FileText size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-text-primary font-semibold text-sm">{firstFile.name}</p>
              <p className="text-text-muted text-xs">PDF · {formatBytes(firstFile.size)}</p>
            </div>
          </motion.div>
        )}

        {/* Main card */}
        <motion.div
          className="glass-card p-6 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-text-primary font-bold text-lg">
                {isSingleFile ? firstFile?.name : `${files.length} files`}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-text-muted text-sm">{formatBytes(fileData?.totalSize)}</span>
                {fileData?.senderDeviceName && (
                  <>
                    <span className="text-text-dim">·</span>
                    <span className="text-text-dim text-xs">From {fileData.senderDeviceName}</span>
                  </>
                )}
              </div>
            </div>
            {secondsRemaining !== null && (
              <CountdownRing secondsRemaining={secondsRemaining} totalSeconds={600} size={80} />
            )}
          </div>

          {/* Multi file list */}
          {!isSingleFile && (
            <div className="space-y-2 mb-5">
              {files.map((file, i) => (
                <FileCard
                  key={i}
                  file={file}
                  index={i}
                  onPreview={() => window.open(previewUrl(code, i), '_blank')}
                  onDownloadSingle={() => handleDownloadSingle(i)}
                  showDownload
                />
              ))}
            </div>
          )}

          {/* Download progress */}
          {downloadPercent > 0 && !downloaded && (
            <ProgressBar
              percent={downloadPercent}
              label="Downloading..."
              color="#22D3EE"
              className="mb-5"
            />
          )}

          {/* Download button */}
          {!downloaded && (
            <motion.button
              className="btn-primary w-full flex items-center justify-center gap-2 text-base"
              onClick={handleDownload}
              disabled={expired}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Download size={18} />
              {isSingleFile ? `Download ${firstFile?.name || 'File'}` : `Download All (ZIP)`}
            </motion.button>
          )}

          {/* Burn notice */}
          {fileData?.burnAfterDownload && !downloaded && (
            <p className="text-center text-accent-red text-xs mt-3 flex items-center justify-center gap-1">
              🔥 One-time only — file deletes after download
            </p>
          )}

          {/* New transfer button after download */}
          {downloaded && (
            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={() => navigate('/')}>
              <Zap size={16} />
              Send Your Own File
            </button>
          )}
        </motion.div>

        {/* AI summary */}
        {fileData?.ai && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AISummaryCard ai={fileData.ai} />
          </motion.div>
        )}
      </div>
    </div>
  )
}
