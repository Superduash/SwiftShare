import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, Clock, Trash2, Info, Check, Activity, Volume2, Shuffle, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { getSettings, saveSettings, clearTransfers } from '../utils/storage'
import toast from 'react-hot-toast'
import { useFocusTrap } from '../hooks/useFocusTrap'

const EXPIRY_OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 60, label: '1 hour' },
  { value: 300, label: '5 hours' },
]

export default function SettingsPanel({ open, onClose }) {
  const { theme, mode, isDark, random, themes, setMode, pickTheme, setRandom, shuffle } = useTheme()
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

  const modalRef = useRef(null)
  useFocusTrap(modalRef, open)

  const [confirmClear, setConfirmClear] = useState(false)

  function update(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(patch)

    if ('reducedMotion' in patch) {
      const enabling = Boolean(patch.reducedMotion)
      document.body.classList.toggle('reduce-motion', enabling)
      if (enabling) {
        document.getAnimations().forEach(a => {
          try { a.cancel() } catch (_) {}
        })
      }
      window.dispatchEvent(new CustomEvent('swiftshare:settings-changed'))
    }
  }

  function handleClearHistory() {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTransfers()
    setConfirmClear(false)
    toast.success('Transfer history cleared', { id: 'clear-history' })
  }

  const isRandomTheme = settings.randomTheme !== false

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="settings-wrapper" className="fixed inset-0 z-[80] overflow-hidden" style={{ pointerEvents: 'none' }}>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            aria-hidden="true"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Slide-over panel */}
          <motion.div
            key="settings-panel"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="fixed top-0 right-0 bottom-0 z-[81] w-full max-w-sm overflow-y-auto overflow-x-hidden shadow-2xl"
            style={{
              background: 'var(--settings-bg)',
              borderLeft: '1px solid var(--border)',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              pointerEvents: 'auto'
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
          >
            <div className="p-4 sm:p-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>Settings</h2>
                <button className="btn-icon" onClick={onClose} aria-label="Close settings">
                  <X size={20} />
                </button>
              </div>

              {/* Appearance / Theme */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-3)' }}>
                    Appearance
                  </label>
                </div>

                {/* Segmented control: Dark | Light */}
                <div className="flex p-1 rounded-xl mb-4" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${isDark ? 'shadow-sm' : ''}`}
                    style={{
                      background: isDark ? 'var(--surface)' : 'transparent',
                      color: isDark ? 'var(--accent)' : 'var(--text-3)',
                    }}
                    onClick={() => setMode('dark')}
                  >
                    <Moon size={14} />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${!isDark ? 'shadow-sm' : ''}`}
                    style={{
                      background: !isDark ? 'var(--surface)' : 'transparent',
                      color: !isDark ? 'var(--accent)' : 'var(--text-3)',
                    }}
                    onClick={() => setMode('light')}
                  >
                    <Sun size={14} />
                    <span>Light</span>
                  </button>
                </div>

                {/* Random Theme Switch & Shuffle */}
                <div
                  className="w-full p-3 mb-4 rounded-xl transition-all"
                  style={{
                    background: random ? 'var(--accent-soft)' : 'transparent',
                    border: `1.5px solid ${random ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: random ? 'var(--accent)' : 'var(--surface-hover)',
                          color: random ? 'var(--on-accent, #fff)' : 'var(--text-3)',
                        }}
                      >
                        <Shuffle size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: random ? 'var(--accent)' : 'var(--text)' }}>
                          Random theme
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={random}
                      aria-label="Toggle random theme"
                      onClick={() => setRandom(!random)}
                      className="w-10 h-6 rounded-full relative transition-all cursor-pointer"
                      style={{
                        minWidth: '40px',
                        minHeight: '24px',
                        width: '40px',
                        height: '24px',
                        padding: 0,
                        background: random
                          ? (isDark ? '#3F3F46' : 'var(--accent)')
                          : 'var(--border-strong)',
                        border: `1px solid ${isDark ? '#52525B' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full absolute top-1 transition-all"
                        style={{
                          background: isDark ? '#FAFAFA' : '#FFFFFF',
                          left: random ? '22px' : '4px',
                        }}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] mb-2.5 leading-snug" style={{ color: 'var(--text-3)' }}>
                    Picks a new {mode} theme each time you open SwiftShare.
                  </p>
                  <button
                    type="button"
                    disabled={!random}
                    onClick={shuffle}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    <Shuffle size={12} className={random ? 'text-[var(--accent)]' : ''} />
                    <span>Shuffle now</span>
                  </button>
                </div>

                {/* 12-Theme Two-Column Paired Grid */}
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-4)' }}>
                  <span>Dark</span>
                  <span>Light</span>
                </div>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="radiogroup"
                  aria-label="Theme selection"
                >
                  {themes.filter(t => t.mode === 'dark').map(darkTheme => {
                    const lightTheme = themes.find(t => t.id === darkTheme.pair) || darkTheme
                    return [darkTheme, lightTheme].map(opt => {
                      const isActive = theme === opt.id
                      const mainColor = opt.swatch[0]
                      const checkColor = opt.mode === 'light' ? '#000000' : '#FFFFFF'

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          className="flex items-center gap-2 p-2 rounded-xl transition-all text-left relative min-w-0"
                          style={{
                            background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                            border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                          }}
                          onClick={() => {
                            pickTheme(opt.id)
                          }}
                          aria-label={`Switch to ${opt.label} theme`}
                        >
                          {/* Main color swatch box */}
                          <div
                            className="relative w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border shadow-xs"
                            style={{
                              background: mainColor,
                              borderColor: 'var(--border)',
                            }}
                          >
                            {isActive && (
                              <Check size={14} strokeWidth={3.5} style={{ color: checkColor }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span
                              className="text-xs font-semibold block truncate"
                              style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}
                            >
                              {opt.label}
                            </span>
                          </div>

                          {isActive && random && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter"
                              style={{ background: 'var(--accent)', color: 'var(--on-accent, #fff)' }}
                            >
                              Auto
                            </span>
                          )}
                        </button>
                      )
                    })
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

              {/* Preferences */}
              <div className="mb-8">
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--text-3)' }}>
                  Preferences
                </label>
                <div className="space-y-2">
                  {/* Optimize Performance */}
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
                        Optimize in one-click!
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
                <p className="text-xs italic font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
                  "Simple, yet too effective."
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  Zero-login temporary file sharing. Files are stored securely and auto-delete after your chosen expiry.
                  No accounts, no permanent storage, no tracking.
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-4)' }}>
                  Built with React, Node.js, Cloudflare R2, and MongoDB.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
