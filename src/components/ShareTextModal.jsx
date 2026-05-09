import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Lock, Eye, EyeOff, Flame, Clock, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import Spinner from './Spinner'

function ShareTextModal({ open, onClose, onShare }) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [expiry, setExpiry] = useState(60)
  const [burn, setBurn] = useState(false)
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sharing, setSharing] = useState(false)
  const textareaRef = useRef(null)

  const MAX_LENGTH = 256 * 1024 // 256 KB
  const charCount = content.length
  const byteCount = new Blob([content]).size
  const isOverLimit = byteCount > MAX_LENGTH

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [open])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setContent('')
      setTitle('')
      setExpiry(60)
      setBurn(false)
      setPasswordProtected(false)
      setPassword('')
      setShowPassword(false)
      setSharing(false)
    }
  }, [open])

  // Paste handler
  useEffect(() => {
    if (!open) return

    const handlePaste = (e) => {
      // Only handle if textarea is not focused (global paste)
      if (document.activeElement === textareaRef.current) return
      
      const text = e.clipboardData?.getData('text')
      if (text && !content) {
        e.preventDefault()
        setContent(text)
        toast.success('Text pasted!')
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [open, content])

  const handleShare = useCallback(async () => {
    if (!content.trim()) {
      toast.error('Please enter some text')
      return
    }

    if (isOverLimit) {
      toast.error('Text is too large (max 256 KB)')
      return
    }

    if (passwordProtected && !password.trim()) {
      toast.error('Please enter a password')
      return
    }

    setSharing(true)
    try {
      await onShare({
        content,
        title: title.trim() || 'Text Snippet',
        expiryMinutes: expiry,
        burnAfterDownload: burn,
        passwordProtected,
        password: passwordProtected ? password : undefined,
      })
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to share text')
    } finally {
      setSharing(false)
    }
  }, [content, title, expiry, burn, passwordProtected, password, isOverLimit, onShare, onClose])

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 rounded-2xl overflow-hidden w-full max-w-2xl h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[90vh] flex flex-col share-text-modal"
            style={{ background: 'var(--bg-raised)' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-3 sm:p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <FileText size={18} style={{ color: 'var(--accent)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                  Share Text
                </h2>
              </div>
              <button className="btn-icon" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 space-y-4">
              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My snippet"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--bg-sunken)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Text content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
                    Content
                  </label>
                  <span 
                    className="text-xs font-mono tabular-nums" 
                    style={{ color: isOverLimit ? 'var(--danger)' : 'var(--text-4)' }}
                  >
                    {formatBytes(byteCount)} / 256 KB
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or type your text here... (Ctrl+V to paste)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all resize-none font-mono share-textarea"
                  style={{
                    background: 'var(--bg-sunken)',
                    border: `1.5px solid ${isOverLimit ? 'var(--danger)' : 'var(--border)'}`,
                    color: 'var(--text)',
                    minHeight: '200px',
                    maxHeight: '400px',
                  }}
                  onFocus={(e) => { if (!isOverLimit) e.target.style.borderColor = 'var(--accent)' }}
                  onBlur={(e) => { if (!isOverLimit) e.target.style.borderColor = 'var(--border)' }}
                />
                {isOverLimit && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                    Text is too large. Please reduce to 256 KB or less.
                  </p>
                )}
              </div>

              {/* Expiry selector */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Expires in
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: 10, label: '10 min' },
                    { value: 60, label: '1 hour' },
                    { value: 300, label: '5 hours' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: expiry === opt.value ? 'var(--accent-soft)' : 'transparent',
                        border: `1.5px solid ${expiry === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                        color: expiry === opt.value ? 'var(--accent)' : 'var(--text-2)',
                      }}
                      onClick={() => setExpiry(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

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
                <Flame size={16} style={{ color: burn ? 'var(--danger)' : 'var(--text-4)' }} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: burn ? 'var(--danger)' : 'var(--text-2)' }}>
                    Burn after reading
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>Deletes after first view</p>
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

              {/* Password toggle */}
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
                  <Lock size={16} style={{ color: passwordProtected ? 'var(--accent)' : 'var(--text-4)' }} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold" style={{ color: passwordProtected ? 'var(--accent)' : 'var(--text-2)' }}>
                      Password protect
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>Require password to view</p>
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

                {/* Password input */}
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                className="btn-secondary flex-1 w-full"
                onClick={onClose}
                disabled={sharing}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 w-full"
                onClick={handleShare}
                disabled={!content.trim() || isOverLimit || sharing || (passwordProtected && !password.trim())}
              >
                {sharing ? (
                  <>
                    <Spinner size={16} />
                    Sharing...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Share Text
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(ShareTextModal)
