import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings, Zap, ArrowLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useConnectionHealth } from '../context/ConnectionHealthContext'
import SettingsPanel from './SettingsPanel'

// Mapping from connection FSM state → status pill in the navbar.
//   connected    → green "Live" (real-time channel up)
//   syncing      → yellow "Syncing" (server up, link establishing)
//   waking       → yellow "Waking" (cold-starting backend)
//   reconnecting → yellow "Reconnecting" (lost link, retrying)
//   offline      → red "Offline" (no network)
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

export default function Navbar() {
  const { theme } = useTheme()
  const { status } = useConnectionHealth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  const pill = STATUS_PILL[status] || STATUS_PILL.syncing
  const tone = TONE_VARS[pill.tone] || TONE_VARS.warning

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-50 backdrop-blur-xl"
        style={{
          top: 'calc(var(--safe-top) + var(--connection-banner-height))',
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          transition: 'top 0.25s ease, background 0.25s ease, border-color 0.25s ease',
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
            <Link to="/" className="flex items-center gap-2 group" aria-label="SwiftShare home">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 logo-icon"
                style={{ 
                  background: 'var(--accent)', 
                  boxShadow: '0 2px 8px var(--accent-glow)',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease'
                }}
                aria-hidden="true"
              >
                <Zap size={16} color={theme === 'dark' ? '#0F1014' : '#fff'} strokeWidth={2.5} />
              </div>
              <span 
                className="font-display font-bold text-lg hidden sm:inline transition-all duration-300 group-hover:tracking-wide" 
                style={{ color: 'var(--text)' }}
              >
                SwiftShare
              </span>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-2 py-1 mr-1 rounded-lg transition-colors"
              style={{ background: tone.bg }}
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

            <button
              className="btn-icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
