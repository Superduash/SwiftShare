import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings, Zap, ArrowLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import { useConnectionHealth } from '../context/ConnectionHealthContext'
import SettingsPanel from './SettingsPanel'

export default function Navbar() {
  const { theme } = useTheme()
  const { isConnected } = useSocket()
  const { status: connectionStatus } = useConnectionHealth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  // Show banner offset when connection banner is visible
  const bannerVisible = connectionStatus !== 'connected'

  return (
    <>
      {/* Spacer for connection banner so navbar doesn't overlap it */}
      {bannerVisible && <div style={{ height: '40px' }} aria-hidden="true" />}

      <nav
        className="fixed left-0 right-0 z-50 backdrop-blur-xl"
        style={{
          top: bannerVisible ? '40px' : '0',
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          transition: 'top 0.25s ease',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <Link to="/" className="btn-icon" aria-label="Back to home">
                <ArrowLeft size={18} />
              </Link>
            )}
            <Link to="/" className="flex items-center gap-2 group" aria-label="SwiftShare home">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'var(--accent)', boxShadow: '0 2px 8px var(--accent-glow)' }}
                aria-hidden="true"
              >
                <Zap size={16} color={theme === 'dark' ? '#0F1014' : '#fff'} strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-lg hidden sm:inline" style={{ color: 'var(--text)' }}>
                SwiftShare
              </span>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Connection status indicator */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 mr-1 rounded-lg transition-colors"
              style={{
                background: isConnected ? 'var(--success-soft)' : 'var(--warning-soft)',
              }}
              title={isConnected ? 'Connected to server' : 'Connecting to server...'}
              role="status"
              aria-label={isConnected ? 'Connected to server' : 'Connecting to server'}
            >
              <div
                className="w-2 h-2 rounded-full transition-all duration-500"
                style={{
                  background: isConnected ? 'var(--success)' : 'var(--warning)',
                  boxShadow: isConnected ? '0 0 6px rgba(22,163,74,0.4)' : '0 0 6px rgba(234,179,8,0.4)',
                  animation: isConnected ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
                aria-hidden="true"
              />
              <span className="text-xs font-medium hidden sm:inline" style={{
                color: isConnected ? 'var(--success)' : 'var(--warning)'
              }}>
                {isConnected ? 'Live' : 'Syncing'}
              </span>
            </div>

            {/* Settings */}
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
