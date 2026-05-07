import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Edit2, Save, X, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SharedTextDisplay({ 
  textContent, 
  title, 
  isPasswordProtected, 
  isUnlocked,
  onUnlock,
  allowEdit = false,
  onSave
}) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(textContent || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    setEditedContent(textContent || '')
  }, [textContent])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
    }
  }, [isEditing])

  async function handleCopy() {
    if (!isUnlocked) {
      toast.error('Unlock to copy text')
      return
    }

    try {
      await navigator.clipboard.writeText(textContent)
      setCopied(true)
      toast.success('Text copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy text')
    }
  }

  function handleEdit() {
    if (!isUnlocked) {
      toast.error('Unlock to edit text')
      return
    }
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setEditedContent(textContent)
    setIsEditing(false)
  }

  async function handleSaveEdit() {
    if (onSave) {
      try {
        await onSave(editedContent)
        setIsEditing(false)
        toast.success('Text updated!')
      } catch {
        toast.error('Failed to save changes')
      }
    }
  }

  async function handleUnlockSubmit(e) {
    e?.preventDefault()
    if (!password.trim()) {
      toast.error('Please enter password')
      return
    }

    setUnlocking(true)
    try {
      await onUnlock(password)
      setPassword('')
    } catch (err) {
      // Error handling done by parent
    } finally {
      setUnlocking(false)
    }
  }

  const displayContent = isEditing ? editedContent : textContent

  return (
    <motion.div
      className="surface-card overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {isPasswordProtected && !isUnlocked && (
            <Lock size={16} style={{ color: 'var(--warning)' }} />
          )}
          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
            {title || 'Shared Text'}
          </h3>
        </div>

        {isUnlocked && (
          <div className="flex items-center gap-2 shrink-0">
            {allowEdit && !isEditing && (
              <button
                className="btn-icon"
                onClick={handleEdit}
                aria-label="Edit text"
                title="Edit text"
              >
                <Edit2 size={16} />
              </button>
            )}
            {!isEditing && (
              <button
                className="btn-icon"
                onClick={handleCopy}
                aria-label="Copy text"
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isPasswordProtected && !isUnlocked ? (
          /* Password unlock form - NO REAL TEXT SHOWN */
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            {/* Locked placeholder - NO real text, just visual indicator */}
            <div 
              className="relative p-8 rounded-xl text-center flex flex-col items-center justify-center gap-4"
              style={{ 
                background: 'var(--bg-sunken)',
                minHeight: '200px'
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--warning-soft)' }}
                >
                  <Lock size={32} style={{ color: 'var(--warning)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
                    Text Content Locked
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Enter password to view content
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--warning-soft)' }}>
                <Lock size={14} style={{ color: 'var(--warning)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
                  Password Required
                </span>
              </div>

              <div className="w-full max-w-sm">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to unlock..."
                    className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    disabled={unlocking}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword 
                      ? <EyeOff size={16} style={{ color: 'var(--text-4)' }} />
                      : <Eye size={16} style={{ color: 'var(--text-4)' }} />
                    }
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full mt-2"
                  disabled={!password.trim() || unlocking}
                >
                  {unlocking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Unlock Text
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : isEditing ? (
          /* Edit mode */
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all resize-none font-mono"
              style={{
                background: 'var(--bg-sunken)',
                border: '1.5px solid var(--accent)',
                color: 'var(--text)',
                minHeight: '200px',
                maxHeight: '400px',
              }}
            />
            <div className="flex items-center gap-2">
              <button
                className="btn-primary flex-1"
                onClick={handleSaveEdit}
              >
                <Save size={16} />
                Save Changes
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={handleCancelEdit}
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Display mode */
          <div 
            className="p-4 rounded-xl font-mono text-sm whitespace-pre-wrap break-words"
            style={{ 
              background: 'var(--bg-sunken)',
              color: 'var(--text-2)',
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            {displayContent || 'No content'}
          </div>
        )}
      </div>

      {/* Footer info */}
      {isUnlocked && !isEditing && (
        <div className="px-4 pb-4">
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
            {textContent?.length || 0} characters • {new Blob([textContent || '']).size} bytes
          </p>
        </div>
      )}
    </motion.div>
  )
}
