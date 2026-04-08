import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Plus, X, Flame, Shield, Zap, Clock, Cpu, QrCode,
  ArrowRight, Clipboard, AlertTriangle, FileText, Lock, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useSocket } from '../context/SocketContext'
import { useTransfer } from '../context/TransferContext'
import { uploadFiles, uploadClipboard } from '../services/api'
import { getSettings } from '../utils/storage'
import { saveTransfer } from '../utils/storage'
import { formatBytes } from '../utils/format'
import { playUploadSuccess } from '../utils/sound'
import Navbar from '../components/Navbar'
import FileCard from '../components/FileCard'
import ExpirySelector from '../components/ExpirySelector'
import ProgressBar from '../components/ProgressBar'
import RecentTransfers from '../components/RecentTransfers'
import NearbyDevices from '../components/NearbyDevices'

const BLOCKED_EXTS = new Set(['.exe', '.bat', '.sh', '.cmd', '.msi', '.scr', '.com', '.vbs', '.ps1', '.jar'])
const MAX_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_FILES = 5

const FEATURES = [
  { icon: Shield, title: 'No Sign-Up', desc: 'Share without accounts' },
  { icon: Clock, title: 'Self-Destruct', desc: 'Gone when the timer ends' },
  { icon: Flame, title: 'Burn Mode', desc: 'Vanishes after one grab' },
  { icon: Cpu, title: 'AI Insights', desc: 'Understands your files' },
  { icon: QrCode, title: 'QR Codes', desc: 'Point, scan, done' },
  { icon: Zap, title: 'Live Updates', desc: 'Real-time progress' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { socket, isConnected, socketId } = useSocket()
  const { uploadState, setUploadProgress, startUpload, setError } = useTransfer()

  const settings = getSettings()
  const [files, setFiles] = useState([])
  const [expiry, setExpiry] = useState(settings.defaultExpiry || 60)
  const [burn, setBurn] = useState(settings.defaultBurn || false)
  const [uploading, setUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const fileInputRef = useRef(null)
  const uploadHandledRef = useRef(false)

  // Password strength calculation
  function getPasswordStrength(pwd) {
    if (!pwd) return null
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    
    if (score <= 1) return { level: 'weak', label: 'Not recommended', color: 'var(--danger)' }
    if (score === 2 || score === 3) return { level: 'medium', label: 'Okay', color: 'var(--warning)' }
    return { level: 'strong', label: 'Strong password', color: 'var(--success)' }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleUploadSuccess = useCallback((payload) => {
    const transferCode = payload?.code
    if (!transferCode || uploadHandledRef.current) {
      return
    }

    uploadHandledRef.current = true
    setUploading(false)

    const fname = files[0]?.name || 'file'
    const normalizedTransferCode = String(transferCode).trim().toUpperCase()
    const transferSnapshot = { ...payload, code: normalizedTransferCode }
    saveTransfer({
      code: normalizedTransferCode,
      filename: fname,
      isSender: true,
      status: transferSnapshot?.status,
      expiresAt: transferSnapshot?.expiresAt,
      createdAt: transferSnapshot?.createdAt,
      files: transferSnapshot?.files,
      ai: transferSnapshot?.ai,
      transfer: transferSnapshot,
    })

    // Navigate first to avoid any transient audio API issues blocking route transition.
    navigate(`/sender/${normalizedTransferCode}`, { state: { transferData: transferSnapshot } })

    // Play success sound after navigation commit.
    window.setTimeout(() => {
      const currentSettings = getSettings()
      if (currentSettings.soundEnabled) {
        playUploadSuccess()
      }
    }, 0)
  }, [files, navigate])

  // Title
  useEffect(() => { document.title = 'SwiftShare — Files sent, not stored' }, [])

  // Socket listeners for upload
  useEffect(() => {
    if (!socket) return
    const onProgress = ({ percent, speed }) => {
      setUploadPercent(percent || 0)
      setUploadSpeed(speed || 0)
    }
    const onComplete = (payload) => handleUploadSuccess(payload)
    socket.on('upload-progress', onProgress)
    socket.on('upload-complete', onComplete)
    return () => {
      socket.off('upload-progress', onProgress)
      socket.off('upload-complete', onComplete)
    }
  }, [socket, handleUploadSuccess])

  // Clipboard paste
  useEffect(() => {
    const onPaste = async (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const blob = item.getAsFile()
          if (!blob) return
          const reader = new FileReader()
          reader.onload = async () => {
            try {
              setUploading(true)
              uploadHandledRef.current = false
              const imageDataUrl = typeof reader.result === 'string' ? reader.result : ''
              const clipOpts = {}
              if (passwordProtected && password.trim()) {
                clipOpts.passwordProtected = true
                clipOpts.password = password
              }
              const response = await uploadClipboard(imageDataUrl, burn, socketId, clipOpts)
              handleUploadSuccess(response)
            } catch (err) {
              setUploading(false)
              if (!shouldSuppressUploadError(err)) {
                toast.error(getUploadErrorMessage(err))
              }
            }
          }
          reader.readAsDataURL(blob)
          return
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [burn, socketId, passwordProtected, password])

  // Validation
  function validateFile(file) {
    const ext = '.' + (file.name || '').split('.').pop().toLowerCase()
    if (BLOCKED_EXTS.has(ext)) return `${file.name}: blocked file type`
    if (file.size > MAX_SIZE) return `${file.name}: exceeds 100 MB limit`
    return null
  }

  const onDrop = useCallback((accepted) => {
    const combined = [...files, ...accepted].slice(0, MAX_FILES)
    const errors = combined.map(validateFile).filter(Boolean)
    if (errors.length) {
      errors.forEach(e => toast.error(e))
      return
    }
    setFiles(combined)
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: files.length > 0,
    multiple: true,
  })

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function totalSize() {
    return files.reduce((s, f) => s + (f.size || 0), 0)
  }

  function getUploadErrorMessage(err) {
    const status = Number(err?.response?.status || 0)
    const backendError = err?.response?.data?.error
    const backendMessage = typeof backendError === 'string'
      ? backendError
      : (backendError?.message || err?.response?.data?.message || '')
    const errorCode = String(err?.code || '').toUpperCase()
    const transportMessage = String(err?.message || '').toLowerCase()

    if (!err?.response) {
      if (errorCode === 'ECONNABORTED' || /timeout/i.test(transportMessage)) {
        return 'Upload is taking longer than expected. Please wait a moment and retry.'
      }
      return 'Upload connection was interrupted. Please retry once.'
    }

    if (status === 429) {
      return backendMessage || 'Rate limit active: Please wait a moment before sending more files.'
    }

    return backendMessage || 'Upload failed. Please try again.'
  }

  function shouldSuppressUploadError(err) {
    // If socket already confirmed completion, ignore late transport-level failures.
    if (uploadHandledRef.current) return true
    if (String(err?.code || '').toUpperCase() === 'ERR_CANCELED') return true
    return false
  }

  async function handleUpload() {
    if (!files.length) return toast.error('Select at least one file')
    if (!isConnected) return toast.error('Server is waking up. Please wait a moment and try again.')

    setUploading(true)
    setUploadPercent(0)
    uploadHandledRef.current = false

    let uploadSucceeded = false
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      formData.append('expiryMinutes', expiry)
      formData.append('burnAfterDownload', burn)
      if (passwordProtected && password.trim()) {
        formData.append('passwordProtected', 'true')
        formData.append('password', password)
      }
      if (socketId) formData.append('socketId', socketId)

      const response = await uploadFiles(formData)

      // Strict success validation: never navigate without a valid transfer code.
      const transferCode = typeof response?.code === 'string' ? response.code.trim() : ''
      if (!transferCode) {
        throw new Error('Upload response was incomplete. Please try again.')
      }

      uploadSucceeded = true
      handleUploadSuccess({ ...response, code: transferCode })
    } catch (err) {
      if (!shouldSuppressUploadError(err)) {
        toast.error(getUploadErrorMessage(err))
      }
    } finally {
      // Always release spinner on failure; successful path is handled by handleUploadSuccess/navigation.
      if (!uploadSucceeded) {
        setUploading(false)
      }
    }
  }

  const hasFiles = files.length > 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

          {/* Desktop: split layout */}
          <div className="lg:grid lg:grid-cols-5 lg:gap-10">

            {/* ═══ LEFT: Upload Zone (60%) ═══ */}
            <div className="lg:col-span-3">
              {/* Hero text */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight mb-2" style={{ color: 'var(--text)' }}>
                  Simple,<br />
                  <span style={{ color: 'var(--accent)' }}>yet too effective.</span>
                </h1>
                <p className="text-base sm:text-lg mb-2" style={{ color: 'var(--text-3)' }}>
                  Send files instantly like a message.
                </p>
                <p
                  className="text-sm font-medium tracking-wide bg-clip-text text-transparent bg-gradient-to-r"
                  style={{
                    backgroundImage: 'linear-gradient(to right, var(--accent), var(--accent-hover))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Works on any device, anywhere.
                </p>
              </motion.div>

              {/* Drop zone */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div
                  {...getRootProps()}
                  className={`drop-zone relative ${isDragActive ? 'active' : ''} ${hasFiles ? 'p-5' : 'p-8 sm:p-12'}`}
                  style={{ minHeight: hasFiles ? 'auto' : '260px' }}
                >
                  <input {...getInputProps()} />

                  {!hasFiles ? (
                    <div className="text-center">
                      <motion.div
                        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-medium)' }}
                        animate={isDragActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <Upload size={28} style={{ color: 'var(--accent)' }} />
                      </motion.div>
                      <p className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>
                        {isDragActive ? 'Drop it here!' : 'Drop files here'}
                      </p>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                        or click to browse · Ctrl+V to paste images
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                        Max 100 MB per file · Up to 5 files
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* File list */}
                      <div className="space-y-2 mb-4">
                        {files.map((f, i) => (
                          <FileCard key={i} file={f} index={i} showRemove onRemove={removeFile} />
                        ))}
                      </div>

                      {/* Add more */}
                      {files.length < MAX_FILES && (
                        <button
                          className="btn-ghost w-full justify-center"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                        >
                          <Plus size={14} />
                          Add more files ({files.length}/{MAX_FILES})
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || [])
                          onDrop(newFiles)
                          e.target.value = ''
                        }}
                      />

                      {/* Size info */}
                      <p className="text-xs text-center mt-2" style={{ color: 'var(--text-4)' }}>
                        {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize())} total
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Upload controls */}
              <AnimatePresence>
                {hasFiles && !uploading && (
                  <motion.div
                    className="mt-5 space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ExpirySelector value={expiry} onChange={setExpiry} />

                    {/* Burn toggle */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{
                        background: burn ? 'var(--danger-soft)' : 'transparent',
                        border: `1.5px solid ${burn ? 'var(--danger)' : 'var(--border)'}`,
                      }}
                      onClick={() => setBurn(!burn)}
                    >
                      <Flame size={18} style={{ color: burn ? 'var(--danger)' : 'var(--text-4)' }} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold" style={{ color: burn ? 'var(--danger)' : 'var(--text-2)' }}>
                          Burn after download
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>This action is permanent after first download</p>
                      </div>
                      <div
                        className="w-10 h-6 rounded-full relative transition-all"
                        style={{ background: burn ? 'var(--danger)' : 'var(--border-strong)' }}
                      >
                        <div
                          className="w-4 h-4 rounded-full absolute top-1 transition-all"
                          style={{ background: '#fff', left: burn ? '22px' : '4px' }}
                        />
                      </div>
                    </button>

                    {/* Password protection toggle */}
                    <div>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{
                          background: passwordProtected ? 'var(--accent-soft)' : 'transparent',
                          border: `1.5px solid ${passwordProtected ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                        onClick={() => {
                          setPasswordProtected(!passwordProtected)
                          if (passwordProtected) { setPassword(''); setShowPassword(false) }
                        }}
                      >
                        <Lock size={18} style={{ color: passwordProtected ? 'var(--accent)' : 'var(--text-4)' }} />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold" style={{ color: passwordProtected ? 'var(--accent)' : 'var(--text-2)' }}>
                            Password protect
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-4)' }}>Only people with the password can download</p>
                        </div>
                        <div
                          className="w-10 h-6 rounded-full relative transition-all"
                          style={{ background: passwordProtected ? 'var(--accent)' : 'var(--border-strong)' }}
                        >
                          <div
                            className="w-4 h-4 rounded-full absolute top-1 transition-all"
                            style={{ background: '#fff', left: passwordProtected ? '22px' : '4px' }}
                          />
                        </div>
                      </button>

                      {/* Password input field */}
                      <AnimatePresence>
                        {passwordProtected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="relative mt-2">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter a password..."
                                maxLength={64}
                                className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all"
                                style={{
                                  background: 'var(--bg-sunken)',
                                  border: '1.5px solid var(--border)',
                                  color: 'var(--text)',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
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

                            {/* Password strength indicator */}
                            {passwordStrength && (
                              <motion.div
                                className="mt-2 px-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                              >
                                {/* Progress bar */}
                                <div className="h-1 rounded-full mb-1.5" style={{ background: 'var(--border)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: passwordStrength.level === 'weak' ? '33%' : passwordStrength.level === 'medium' ? '66%' : '100%',
                                      background: passwordStrength.color,
                                    }}
                                  />
                                </div>
                                {/* Label */}
                                <div className="flex items-center justify-between">
                                  <p className="text-xs transition-colors duration-300" style={{ color: passwordStrength.color }}>
                                    {passwordStrength.label}
                                  </p>
                                  {/* Suggestion for large files */}
                                  {passwordStrength.level === 'weak' && totalSize() > 10 * 1024 * 1024 && (
                                    <p className="text-[10px]" style={{ color: 'var(--text-4)' }}>
                                      Consider stronger for large files
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Upload button */}
                    <button
                      className="btn-primary w-full text-base"
                      onClick={handleUpload}
                      disabled={passwordProtected && !password.trim()}
                    >
                      <Upload size={18} />
                      Share {files.length} file{files.length !== 1 ? 's' : ''}
                    </button>
                    <p className="text-[11px] text-center" style={{ color: 'var(--text-4)' }}>Share the code before leaving this page</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload progress */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    className="mt-5 surface-card p-5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ProgressBar percent={uploadPercent} speed={uploadSpeed} label="Uploading..." />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Receive section (mobile) */}
              <div className="mt-8 lg:hidden">
                <button
                  className="btn-secondary w-full"
                  onClick={() => navigate('/join')}
                >
                  <Clipboard size={16} />
                  Receive a file
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* ═══ RIGHT: Secondary info (40%) ═══ */}
            <div className="lg:col-span-2 mt-10 lg:mt-0 space-y-6">
              {/* Receive CTA (desktop) */}
              <motion.button
                className="hidden lg:flex w-full items-center gap-3 surface-card p-4 group cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
                whileHover={{ scale: 1.01, borderColor: 'var(--accent)' }}
                onClick={() => navigate('/join')}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                  <Clipboard size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Receive a file</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Enter a code to grab your file</p>
                </div>
                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }} />
              </motion.button>

              {/* Features grid */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Why SwiftShare</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(({ icon: Icon, title, desc }, idx) => (
                    <motion.div
                      key={title}
                      className="surface-card-flat p-3 group"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                    >
                      <Icon size={16} className="mb-1.5" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-4)' }}>{desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Recent Transfers */}
              <RecentTransfers />

              {/* Nearby Devices */}
              <NearbyDevices />

              {/* How it works */}
              <motion.div
                className="surface-card p-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-4)' }}>How it works</h3>
                <div className="space-y-4">
                  {[
                    { step: '1', label: 'Drop your file', desc: 'Drag, drop, or paste — that\'s it' },
                    { step: '2', label: 'Share the code', desc: 'Send the 6-digit code or scan the QR' },
                    { step: '3', label: 'Done', desc: 'They download, then the file disappears' },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-xs"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                      >
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
