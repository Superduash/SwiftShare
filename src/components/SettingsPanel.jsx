import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, Clock, Trash2, Info, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { getSettings, saveSettings, clearTransfers } from '../utils/storage'
import toast from 'react-hot-toast'

const EXPIRY_OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 60, label: '1 hour' },
  { value: 300, label: '5 hours' },
]

const THEME_OPTIONS = [
  { value: 'terracotta', label: 'Terracotta', color: '#E06D53' },
  { value: 'dark', label: 'Dark', color: '#FFFFFF' },
  { value: 'light', label: 'Light', color: '#000000' },
  { value: 'ocean', label: 'Ocean', color: '#2B6CB0' },
]

export default function SettingsPanel({ open, onClose }) {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState(getSettings)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const [confirmClear, setConfirmClear] = useState(false)

  function update(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(patch)
  }

  function handleClearHistory() {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTransfers()
    setConfirmClear(false)
    toast.success('Transfer history cleared')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-sm overflow-y-auto"
            style={{ background: 'var(--settings-bg)', borderLeft: '1px solid var(--border)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>Settings</h2>
                <button className="btn-icon" onClick={onClose} aria-label="Close settings">
                  <X size={20} />
                </button>
              </div>

              {/* Theme */}
              <div className="mb-8">
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--text-3)' }}>
                  Theme
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {THEME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                      style={{
                        background: theme === opt.value ? 'var(--accent-soft)' : 'transparent',
                        border: `2px solid ${theme === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                      onClick={() => setTheme(opt.value)}
                      aria-label={`Switch to ${opt.label} theme`}
                    >
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-full transition-all"
                          style={{
                            background: opt.color,
                            boxShadow: theme === opt.value ? `0 0 0 3px var(--accent-soft)` : 'none',
                          }}
                        />
                        {theme === opt.value && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ color: opt.value === 'dark' ? '#0F1014' : '#FFFFFF' }}
                          >
                            <Check size={18} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: theme === opt.value ? 'var(--accent)' : 'var(--text-3)' }}
                      >
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default expiry */}
              <div className="mb-8">
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <Clock size={13} />
                  Default Expiry
                </label>
                <div className="flex gap-2">
                  {EXPIRY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: settings.defaultExpiry === opt.value ? 'var(--accent-soft)' : 'transparent',
                        color: settings.defaultExpiry === opt.value ? 'var(--accent)' : 'var(--text-3)',
                        border: `1px solid ${settings.defaultExpiry === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                      onClick={() => update({ defaultExpiry: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Burn toggle */}
              <div className="mb-8">
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <Flame size={13} />
                  Burn After Download
                </label>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: settings.defaultBurn ? 'var(--accent-soft)' : 'transparent',
                    border: `1px solid ${settings.defaultBurn ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                  onClick={() => update({ defaultBurn: !settings.defaultBurn })}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                    {settings.defaultBurn ? 'Enabled by default' : 'Disabled by default'}
                  </span>
                  <div
                    className="w-10 h-6 rounded-full relative transition-all"
                    style={{ background: settings.defaultBurn ? 'var(--accent)' : 'var(--border-strong)' }}
                  >
                    <div
                      className="w-4 h-4 rounded-full absolute top-1 transition-all"
                      style={{
                        background: '#fff',
                        left: settings.defaultBurn ? '22px' : '4px',
                      }}
                    />
                  </div>
                </button>
              </div>

              {/* Clear history */}
              <div className="mb-8">
                <button
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: confirmClear ? 'var(--danger)' : 'var(--danger-soft)',
                    color: confirmClear ? '#fff' : 'var(--danger)',
                    border: '1px solid transparent',
                  }}
                  onClick={handleClearHistory}
                >
                  <Trash2 size={15} />
                  {confirmClear ? 'Confirm — Clear All?' : 'Clear Transfer History'}
                </button>
              </div>

              {/* About */}
              <div
                className="p-4 rounded-xl"
                style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>About SwiftShare</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  Zero-login temporary file sharing. Files are stored securely and auto-delete after your chosen expiry.
                  No accounts, no permanent storage, no tracking.
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-4)' }}>
                  Built with React, Node.js, Cloudflare R2, MongoDB, and Gemini AI.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
