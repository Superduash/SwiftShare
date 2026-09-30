import React, { useState, memo, useCallback, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings, Zap, ArrowLeft, Sun, Moon, Keyboard, Download } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useConnectionHealth } from '../context/ConnectionHealthContext'
import SettingsPanel from './SettingsPanel'
import ShortcutsOverlay from './ShortcutsOverlay'

const STATUS_PILL = {
  connected:    { label: 'Live',         tone: 'success', pulse: false },
  syncing:      { label: 'Syncing',      tone: 'warning', pulse: true  },
  waking:       { label: 'Waking',       tone: 'warning', pulse: true  },
  reconnecting: { label: 'Reconnecting', tone: 'warning', pulse: true  },
  offline:      { label: 'Offline',      tone: 'danger',  pulse: true  },
}

const TONE_VARS = {
  success: { bg: 'var(--success-soft)', fg: 'var(--success)', glow: '0 0 6px rgba(22,163,74,0.4)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)', glow: '0 0 6px rgba(234,179,8,0.4)' },
  danger:  { bg: 'var(--danger-soft)',  fg: 'var(--danger)',  glow: '0 0 6px rgba(220,38,38,0.4)' },
}

function Navbar() {
  const { isDark, toggleThemeMode } = useTheme()
  const { status } = useConnectionHealth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const handleInstallable = () => setIsInstallable(true)
    if (window.__swiftshare_pwa_prompt) setIsInstallable(true)
    window.addEventListener('swiftshare:pwa-installable', handleInstallable)
    return () => window.removeEventListener('swiftshare:pwa-installable', handleInstallable)
  }, [])

  const handleInstallClick = () => {
    if (window.__swiftshare_pwa_prompt) {
      window.__swiftshare_pwa_prompt.prompt()
      window.__swiftshare_pwa_prompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setIsInstallable(false)
        }
        window.__swiftshare_pwa_prompt = null
      })
    }
  }

  const pill = STATUS_PILL[status] || STATUS_PILL.syncing
  const tone = TONE_VARS[pill.tone] || TONE_VARS.warning

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-50 backdrop-blur-xl bg-nav-bg"
        style={{
          top: 'calc(var(--safe-top) + var(--connection-banner-height))',
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          transition: 'top 0.25s ease, background 0.3s ease, border-color 0.3s ease',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="page-shell-wide flex items-center justify-between" style={{ height: 'var(--navbar-height)' }}>
          {/* Left */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <Link to="/" className="btn-icon" aria-label="Back to home">
                <ArrowLeft size={18} />
              </Link>
            )}
            <Link to="/" className="flex items-center gap-2 group" aria-label="SwiftShare home" aria-current={isHome ? 'page' : undefined}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center logo-icon"
                style={{ 
                  background: 'var(--accent)', 
                  boxShadow: '0 2px 8px var(--accent-glow)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease'
                }}
                aria-hidden="true"
              >
                <Zap size={16} color="var(--logo-icon, var(--accent-contrast, #fff))" strokeWidth={2.5} />
              </div>
              <span
                className="font-display font-bold text-lg transition-all duration-300 group-hover:tracking-wide"
                style={{
                  background: 'var(--logo-gradient, linear-gradient(135deg, var(--text) 0%, var(--accent) 100%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SwiftShare
              </span>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Dark / Light Mode Toggle */}
            <button
              className="btn-icon"
              onClick={toggleThemeMode}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ marginRight: '2px', position: 'relative', zIndex: 1000 }}
            >
              {isDark ? (
                <Sun size={16} style={{ color: 'var(--accent)' }} />
              ) : (
                <Moon size={16} style={{ color: 'var(--text-3)' }} />
              )}
            </button>

            {/* Shortcuts button */}
            <button
              className="hidden md:inline-flex btn-ghost btn-sm mr-1 hide-on-touch"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-sunken)' }}
              onClick={openShortcuts}
              aria-label="View shortcuts"
            >
              <Keyboard size={14} />
              <span className="text-[10px] font-semibold tracking-wide uppercase">Shortcuts</span>
            </button>

            {/* Install App button (PWA) */}
            {isInstallable && (
              <button
                className="inline-flex btn-ghost btn-sm mr-1"
                style={{ border: '1px solid var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }}
                onClick={handleInstallClick}
                aria-label="Install App"
                title="Install App"
              >
                <Download size={14} />
                <span className="hidden md:inline text-[10px] font-semibold tracking-wide uppercase ml-1.5">Install App</span>
              </button>
            )}

            {/* Connection status pill — only shown when there is an active connection issue */}
            {status !== 'connected' && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 mr-1 rounded-lg transition-colors"
                style={{ background: tone.bg, position: 'relative', zIndex: 1000 }}
                title={`${pill.label} — ${status}`}
                role="status"
                aria-label={pill.label}
              >
                <div
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    background: tone.fg,
                    boxShadow: tone.glow,
                    animation: pill.pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                  }}
                  aria-hidden="true"
                />
                <span className="text-xs font-medium hidden sm:inline" style={{ color: tone.fg }}>
                  {pill.label}
                </span>
              </div>
            )}

            <button
              className="btn-icon"
              onClick={openSettings}
              aria-label="Open settings"
              style={{ position: 'relative', zIndex: 1000, pointerEvents: 'auto' }}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <SettingsPanel open={settingsOpen} onClose={closeSettings} />
      <ShortcutsOverlay open={shortcutsOpen} onClose={closeShortcuts} />
    </>
  )
}

export default memo(Navbar)
