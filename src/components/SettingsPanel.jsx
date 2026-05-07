import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, Clock, Trash2, Info, Check, Activity, Volume2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { getSettings, saveSettings, clearTransfers } from '../utils/storage'
import toast from 'react-hot-toast'

const EXPIRY_OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 60, label: '1 hour' },
  { value: 300, label: '5 hours' },
]

const THEME_OPTIONS = [
  { value: 'sunset',      label: 'Sunrise',      color: '#F07020',  light: false },
  { value: 'sunset-dark', label: 'Sunset',       color: '#C85A10',  light: false },
  { value: 'dark', label: 'Dark', color: '#1A1A1E', light: false },
  { value: 'light', label: 'Light', color: '#F0F0F2', light: true },
  { value: 'midnight', label: 'Midnight', color: '#1440A0', light: false },
  { value: 'sakura', label: 'Sakura', color: '#F472B6', light: true },
  { value: 'lavender', label: 'Lavender', color: '#A78BFA', light: false },
  { value: 'forest', label: 'Forest', color: '#00D87C', light: false },
  { value: 'volcanic', label: 'Volcanic', color: '#CC1010', light: false },
]

export default function SettingsPanel({ open, onClose }) {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState(getSettings)

  useEffect(() => {
    const syncSettings = () => setSettings(getSettings())
    window.addEventListener('swiftshare:settings-changed', syncSettings)
    if (open) syncSettings()
    return () => window.removeEventListener('swiftshare:settings-changed', syncSettings)
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Apply reduce motion class to body
  useEffect(() => {
    if (settings.reducedMotion) {
      document.body.classList.add('reduce-motion')
    } else {
      document.body.classList.remove('reduce-motion')
    }
  }, [settings.reducedMotion])

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
                <div className="grid grid-cols-3 gap-3">
                  {THEME_OPTIONS.map(opt => {
                    const isActive = theme === opt.value
                    // Swatches with light backgrounds need dark checkmarks
                    const checkmarkColor = opt.light ? '#111827' : '#FFFFFF'

                    return (
                      <button
                        key={opt.value}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                        style={{
                          background: isActive ? 'var(--accent-soft)' : 'transparent',
                          border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                        onClick={() => setTheme(opt.value)}
                        aria-label={`Switch to ${opt.label} theme`}
                      >
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div
                            className="w-12 h-12 rounded-full transition-all"
                            style={{
                              backgroundColor: opt.color,
                              border: '1px solid var(--border-strong)',
                              boxShadow: isActive ? `0 0 0 3px var(--accent-soft)` : 'none',
                            }}
                          />
                          {isActive && (
                            <div
                              className="absolute inset-0 flex items-center justify-center"
                              style={{ color: checkmarkColor }}
                            >
                              <Check size={16} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span
                          className="text-xs font-medium text-center"
                          style={{ color: isActive ? 'var(--accent)' : 'var(--text-3)' }}
                        >
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
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

              {/* Preferences */}
              <div className="mb-8">
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--text-3)' }}>
                  Preferences
                </label>
                <div className="space-y-2">
                  {/* Reduce Motion */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: 'transparent',
                      border: `1px solid var(--border)`,
                    }}
                    onClick={() => update({ reducedMotion: !settings.reducedMotion })}
                  >
                    <Activity size={16} style={{ color: 'var(--text-3)' }} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                        Reduce Motion
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                        Disable UI animations for better performance
                      </p>
                    </div>
                    <div
                      className="w-10 h-6 rounded-full relative transition-all"
                      style={{ background: settings.reducedMotion ? 'var(--accent)' : 'var(--border-strong)' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full absolute top-1 transition-all"
                        style={{
                          background: '#fff',
                          left: settings.reducedMotion ? '22px' : '4px',
                        }}
                      />
                    </div>
                  </button>

                  {/* Sound Effects */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: 'transparent',
                      border: `1px solid var(--border)`,
                    }}
                    onClick={() => update({ soundEnabled: !settings.soundEnabled })}
                  >
                    <Volume2 size={16} style={{ color: 'var(--text-3)' }} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                        Sound Effects
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                        Play subtle sounds on success
                      </p>
                    </div>
                    <div
                      className="w-10 h-6 rounded-full relative transition-all"
                      style={{ background: settings.soundEnabled ? 'var(--accent)' : 'var(--border-strong)' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full absolute top-1 transition-all"
                        style={{
                          background: '#fff',
                          left: settings.soundEnabled ? '22px' : '4px',
                        }}
                      />
                    </div>
                  </button>
                </div>
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
                <p className="text-xs italic font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
                  "Simple, yet too effective."
                </p>
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
