import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Upload, X, Send, ArrowRight, Zap,
  Flame, FileText, Image,
  Video, Archive, File, RefreshCw
} from 'lucide-react'
import { uploadFiles, uploadClipboard, getNearbyDevices, getStats, pingServer } from '../services/api'
import { useSocket } from '../context/SocketContext'
import { useTransfer } from '../context/TransferContext'
import ProgressBar from '../components/ProgressBar'
import LoadingScreen from '../components/LoadingScreen'

function formatBytes(b) {
  if (!b) return '0 B'
  const u = ['B','KB','MB','GB'], i = Math.floor(Math.log(b)/Math.log(1024))
  return `${(b/Math.pow(1024,i)).toFixed(i?1:0)} ${u[i]}`
}

function getFileIcon(type='') {
  if (type.includes('pdf'))       return { Icon: FileText, color: '#F87171' }
  if (type.startsWith('image/'))  return { Icon: Image,    color: '#34D399' }
  if (type.startsWith('video/'))  return { Icon: Video,    color: '#A78BFA' }
  if (type.includes('zip'))       return { Icon: Archive,  color: '#FB923C' }
  return                                 { Icon: File,     color: '#8B90AA' }
}

function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (err.isNetworkError) return 'Network error. Check your connection and try again.'

  if (err.code === 'FILE_TOO_LARGE') {
    return 'This file is too large. Maximum size is 50MB.'
  }

  if (err.code === 'TOO_MANY_FILES') {
    return 'Too many files selected. You can upload up to 10 files.'
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return 'One or more selected files are not allowed.'
  }

  if (err.code === 'RATE_LIMIT_EXCEEDED') {
    return 'Too many requests. Please wait a moment and try again.'
  }

  return err.message || fallback
}

const BLOCKED = ['.exe','.bat','.sh','.cmd','.msi','.scr','.vbs','.ps1']
const isBlocked = f => BLOCKED.includes('.'+f.name.split('.').pop().toLowerCase())

// ── Nearby pill ─────────────────────────────────────────────────────────
function NearbyPill() {
  const [devices, setDevices] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getNearbyDevices().then(d => setDevices(d?.devices || [])).catch(()=>{})
    const t = setInterval(() => getNearbyDevices().then(d => setDevices(d?.devices||[])).catch(()=>{}), 12000)
    return () => clearInterval(t)
  }, [])

  if (!devices.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 flex-wrap justify-center"
    >
      {devices.slice(0,3).map((d,i) => (
        <button
          key={i}
          onClick={() => navigate(`/join?code=${d.code}`)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
          style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', color:'#818CF8' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {d.deviceName} · {d.fileCount} file{d.fileCount!==1?'s':''}
        </button>
      ))}
      <span className="text-xs" style={{ color:'var(--text-3)' }}>nearby on your WiFi</span>
    </motion.div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { socket, socketId, isConnected } = useSocket()
  const { startUpload, setUploadData, setError } = useTransfer()

  const [files, setFiles] = useState([])
  const [burn, setBurn] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pct, setPct] = useState(0)
  const [speedTxt, setSpeedTxt] = useState('')
  const [isWakingServer, setIsWakingServer] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [animatedStats, setAnimatedStats] = useState({
    totalTransfers: 0,
    totalFiles: 0,
    totalDownloads: 0,
    totalUsers: 0,
  })

  useEffect(() => {
    let cancelled = false
    let retryId = null

    const checkServer = async () => {
      const { ok, latencyMs } = await pingServer()
      if (cancelled) return

      if (ok && latencyMs <= 3000) {
        setIsWakingServer(false)
        return
      }

      setIsWakingServer(true)
      retryId = setTimeout(checkServer, 3000)
    }

    checkServer()

    return () => {
      cancelled = true
      if (retryId) clearTimeout(retryId)
    }
  }, [])

  useEffect(() => {
    let active = true
    const startedAt = Date.now()

    const finishLoading = () => {
      const remaining = Math.max(0, 1000 - (Date.now() - startedAt))
      setTimeout(() => {
        if (active) {
          setStatsLoading(false)
        }
      }, remaining)
    }

    getStats()
      .then((data) => {
        if (!active) return
        setStats(data)
      })
      .catch((err) => {
        if (!active) return
        toast.error(getApiErrorMessage(err, 'Unable to load live stats right now.'), { id: 'stats-error' })
      })
      .finally(finishLoading)

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!stats) return

    const targets = {
      totalTransfers: Number(stats.totalTransfers || 0),
      totalFiles: Number(stats.totalFiles || 0),
      totalDownloads: Number(stats.totalDownloads || 0),
      totalUsers: Number(stats.totalUsers || 0),
    }

    const start = Date.now()
    const duration = 1500
    const interval = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / duration)

      setAnimatedStats({
        totalTransfers: Math.floor(targets.totalTransfers * progress),
        totalFiles: Math.floor(targets.totalFiles * progress),
        totalDownloads: Math.floor(targets.totalDownloads * progress),
        totalUsers: Math.floor(targets.totalUsers * progress),
      })

      if (progress >= 1) {
        clearInterval(interval)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [stats])

  // Socket: progress
  useEffect(() => {
    if (!socket) return
    const onProg  = ({ percent, speed }) => { setPct(percent||0); if(speed) setSpeedTxt(`${speed} MB/s`) }
    const onDone  = (data) => { setUploadData(data); navigate(`/sender/${data.code}`, { state:{ transferData:data }}) }
    socket.on('upload-progress', onProg)
    socket.on('upload-complete', onDone)
    return () => { socket.off('upload-progress', onProg); socket.off('upload-complete', onDone) }
  }, [socket, navigate, setUploadData])

  // Clipboard paste
  useEffect(() => {
    const onPaste = async (e) => {
      for (const item of e.clipboardData?.items||[]) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile()
          if (!f) return
          const reader = new FileReader()
          reader.onload = async (ev) => {
            try {
              setUploading(true); startUpload()
              const r = await uploadClipboard(ev.target.result, burn, socketId||'')
              setUploadData(r); navigate(`/sender/${r.code}`, { state:{ transferData:r }})
            } catch(err) { toast.error(getApiErrorMessage(err)); setError() } finally { setUploading(false) }
          }
          reader.readAsDataURL(f)
          toast('📋 Image pasted — uploading...')
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [burn, socketId])

  const onDrop = useCallback((accepted) => {
    const bad = accepted.filter(isBlocked)
    if (bad.length) { toast.error(`Blocked: ${bad.map(f=>f.name).join(', ')}`); return }
    setFiles(prev => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })

  const handleSend = async () => {
    if (!files.length || uploading) return
    setUploading(true); setPct(0); startUpload()
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      fd.append('burnAfterDownload', String(burn))
      fd.append('senderSocketId', socketId||'')
      await uploadFiles(fd)
    } catch(err) {
      toast.error(getApiErrorMessage(err)); setError(); setUploading(false); setPct(0)
    }
  }

  const removeFile = (i) => setFiles(prev => prev.filter((_,idx)=>idx!==i))

  if (isWakingServer) {
    return (
      <LoadingScreen message="Waking up server... this takes ~30 seconds on first load" />
    )
  }

  return (
    <div className="min-h-screen" style={{ background:'var(--bg)' }}>
      {/* Grid texture */}
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none" />

      {/* Ambient glows */}
      <div className="fixed pointer-events-none" style={{
        top:'-20%', right:'-10%', width:'500px', height:'500px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
        filter:'blur(40px)'
      }}/>
      <div className="fixed pointer-events-none" style={{
        bottom:'-15%', left:'-10%', width:'400px', height:'400px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 65%)',
        filter:'blur(40px)'
      }}/>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── NAV ── */}
        <motion.nav
          className="flex items-center justify-between mb-16 sm:mb-20"
          initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)' }}>
              <Zap size={14} style={{ color:'#818CF8' }}/>
            </div>
            <span className="font-heading text-lg" style={{ color:'var(--text)', letterSpacing:'-0.02em' }}>
              Swift<span style={{ color:'#818CF8' }}>Share</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={isConnected
                ? { background:'rgba(52,211,153,0.08)', color:'#34D399', border:'1px solid rgba(52,211,153,0.15)' }
                : { background:'rgba(248,113,113,0.08)', color:'var(--red)', border:'1px solid rgba(248,113,113,0.15)' }
              }>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: isConnected ? '#34D399' : 'var(--red)',
                  boxShadow: isConnected ? '0 0 6px #34D399' : 'none' }}/>
              {isConnected ? 'Live' : 'Offline'}
            </div>
            <button className="btn-ghost text-sm py-2 px-4" onClick={() => navigate('/join')}>
              Receive File
            </button>
          </div>
        </motion.nav>

        {/* ── HERO ── */}
        <motion.div
          className="mb-10 sm:mb-12"
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45, delay:0.05 }}
        >
          <h1 className="font-display mb-4 leading-none"
            style={{ fontSize:'clamp(44px, 9vw, 72px)', letterSpacing:'-0.04em', lineHeight:'1.0' }}>
            <span style={{ color:'var(--text)' }}>Transfer</span>
            <br />
            <span className="text-gradient">anything.</span>
          </h1>
          <p style={{ color:'var(--text-2)', fontSize:'16px', lineHeight:'1.6', fontFamily:"'Inter', sans-serif" }}>
            No login. No install. Files auto-delete after delivery.
          </p>
        </motion.div>

        {/* ── UPLOAD AREA ── */}
        <motion.div
          className="mb-5"
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45, delay:0.1 }}
        >
          {!uploading && !files.length ? (
            /* ── Empty zone ── */
            <div
              {...getRootProps()}
              className={`upload-zone w-full py-12 sm:py-16 px-8 text-center ${isDragActive?'dragging':''}`}
            >
              <input {...getInputProps()} />
              <AnimatePresence mode="wait">
                {isDragActive ? (
                  <motion.div
                    key="drag"
                    initial={{ opacity:0, scale:0.96 }}
                    animate={{ opacity:1, scale:1 }}
                    exit={{ opacity:0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)' }}
                      animate={{ scale:[1,1.08,1] }}
                      transition={{ duration:0.6, repeat:Infinity }}
                    >
                      <Upload size={28} style={{ color:'#818CF8' }}/>
                    </motion.div>
                    <div>
                      <p className="font-heading text-xl" style={{ color:'#818CF8' }}>Drop to upload</p>
                      <p style={{ color:'var(--text-3)', fontSize:'13px', marginTop:'4px' }}>Release to start</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity:0 }}
                    animate={{ opacity:1 }}
                    exit={{ opacity:0 }}
                    className="flex flex-col items-center gap-5"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                      <Upload size={22} style={{ color:'var(--text-3)' }}/>
                    </div>

                    <div>
                      <p className="font-heading text-xl mb-1" style={{ color:'var(--text)' }}>
                        Drop files here
                      </p>
                      <p style={{ color:'var(--text-3)', fontSize:'13px' }}>
                        or click anywhere to browse
                      </p>
                    </div>

                    {/* The explicit CTA button */}
                    <div
                      className="flex items-center gap-2 px-7 py-3 rounded-xl pointer-events-none font-heading text-sm"
                      style={{ background:'var(--accent)', color:'#fff', letterSpacing:'-0.01em' }}
                    >
                      <Upload size={15}/>
                      Choose Files
                    </div>

                    <p style={{ color:'var(--text-3)', fontSize:'12px' }}>
                      All types · 100MB max · Up to 10 files · Ctrl+V to paste
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          ) : uploading ? (
            /* ── Upload in progress ── */
            <div className="card p-8 text-center">
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)' }}
                animate={{ rotate:360 }}
                transition={{ duration:2, repeat:Infinity, ease:'linear' }}
              >
                <RefreshCw size={22} style={{ color:'#818CF8' }}/>
              </motion.div>
              <p className="font-heading text-lg mb-1" style={{ color:'var(--text)' }}>Uploading…</p>
              <p style={{ color:'var(--text-2)', fontSize:'13px', marginBottom:'24px' }}>
                {files.length} file{files.length!==1?'s':''} · {formatBytes(files.reduce((s,f)=>s+f.size,0))}
              </p>
              <ProgressBar percent={pct} label="Progress" speed={speedTxt||null} color="#6366F1" />
              <p style={{ color:'var(--text-3)', fontSize:'12px', marginTop:'16px' }}>
                AI analyzing content in background…
              </p>
            </div>

          ) : (
            /* ── Files queued ── */
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading text-base" style={{ color:'var(--text)', letterSpacing:'-0.01em' }}>
                  {files.length} file{files.length!==1?'s':''} ready
                </span>
                <button
                  onClick={()=>setFiles([])}
                  style={{ color:'var(--text-3)', fontSize:'12px', background:'none', border:'none', cursor:'pointer' }}
                  onMouseEnter={e=>e.target.style.color='var(--red)'}
                  onMouseLeave={e=>e.target.style.color='var(--text-3)'}
                >
                  Clear all
                </button>
              </div>

              {/* File list */}
              <div className="space-y-2 mb-4 max-h-52 overflow-y-auto scroll-container">
                <AnimatePresence>
                  {files.map((f,i) => {
                    const { Icon, color } = getFileIcon(f.type)
                    return (
                      <motion.div
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 group"
                        style={{ background:'var(--bg-elevated)' }}
                        initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                        exit={{ opacity:0, x:8 }} transition={{ delay:i*0.04 }}
                      >
                        <Icon size={15} style={{ color, flexShrink:0 }}/>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium" style={{ color:'var(--text)' }}>{f.name}</p>
                          <p style={{ color:'var(--text-3)', fontSize:'11px' }}>{formatBytes(f.size)}</p>
                        </div>
                        <button className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={()=>removeFile(i)}>
                          <X size={11}/>
                        </button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Add more */}
              <div {...getRootProps()} className="rounded-xl px-4 py-3 text-center cursor-pointer mb-4 transition-colors"
                style={{ border:'1px dashed var(--border)' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(99,102,241,0.35)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
              >
                <input {...getInputProps()}/>
                <p style={{ color:'var(--text-3)', fontSize:'12px' }}>+ Add more files</p>
              </div>

              {/* Total */}
              <div className="flex justify-between text-xs mb-5" style={{ color:'var(--text-2)' }}>
                <span>Total</span>
                <span style={{ fontFamily:"'JetBrains Mono', monospace" }}>
                  {formatBytes(files.reduce((s,f)=>s+f.size,0))}
                </span>
              </div>

              <button className="btn-primary w-full justify-center text-base" onClick={handleSend} disabled={uploading}>
                <Send size={16}/>
                Send {files.length} file{files.length!==1?'s':''}
                <ArrowRight size={14}/>
              </button>
            </div>
          )}
        </motion.div>

        {/* ── BURN TOGGLE ── */}
        {!uploading && (
          <motion.div
            className="flex items-center justify-between px-5 py-4 rounded-2xl mb-10"
            style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
          >
            <div className="flex items-center gap-3">
              <Flame size={15} style={{ color:'var(--red)', flexShrink:0 }}/>
              <div>
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>Burn after download</p>
                <p style={{ color:'var(--text-3)', fontSize:'12px' }}>Deleted permanently on first download</p>
              </div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={burn} onChange={e=>setBurn(e.target.checked)}/>
              <span className="toggle-slider"/>
            </label>
          </motion.div>
        )}

        {/* ── NEARBY (only if devices found) ── */}
        <motion.div
          className="mb-12"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
        >
          <NearbyPill/>
        </motion.div>

        {/* ── HOW IT WORKS ── no cards, just numbered steps ── */}
        <motion.div
          className="mb-14"
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
        >
          <div className="divider-glow mb-10"/>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              ['01', 'Upload', 'Drop any file, any size up to 100MB'],
              ['02', 'Get code', 'Instant 6-digit code + QR generated'],
              ['03', 'Share', 'Send the code or scan the QR'],
              ['04', 'Auto-delete', 'File vanishes after 10 minutes'],
            ].map(([num, title, desc]) => (
              <div key={num} className="flex flex-col gap-2">
                <span className="font-display text-3xl leading-none" style={{
                  color:'transparent',
                  WebkitTextStroke:'1px rgba(99,102,241,0.25)',
                  fontVariantNumeric:'tabular-nums',
                }}>
                  {num}
                </span>
                <p className="font-heading text-sm" style={{ color:'var(--text)', letterSpacing:'-0.01em' }}>{title}</p>
                <p style={{ color:'var(--text-3)', fontSize:'12px', lineHeight:'1.5' }}>{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statsLoading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl px-3 py-3" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <div className="h-3 w-16 skeleton mb-2" />
                  <div className="h-6 w-20 skeleton" />
                </div>
              ))
            ) : (
              [
                ['Transfers', animatedStats.totalTransfers],
                ['Files', animatedStats.totalFiles],
                ['Downloads', animatedStats.totalDownloads],
                ['Users', animatedStats.totalUsers],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl px-3 py-3" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <p style={{ color:'var(--text-3)', fontSize:'11px' }}>{label}</p>
                  <p className="font-heading text-lg" style={{ color:'var(--text)' }}>
                    {stats ? Number(value).toLocaleString() : '--'}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* ── FOOTER ── */}
        <motion.div
          className="text-center"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
        >
          <p style={{ color:'var(--text-3)', fontSize:'12px' }}>
            SwiftShare · No login required · Files auto-deleted · Free forever
          </p>
        </motion.div>

      </div>
    </div>
  )
}
