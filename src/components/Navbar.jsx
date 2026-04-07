import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Settings, Zap, ArrowLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import SettingsPanel from './SettingsPanel'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { isConnected } = useSocket()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
        style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <Link to="/" className="btn-icon" aria-label="Back home">
                <ArrowLeft size={18} />
              </Link>
            )}
            <Link to="/" className="flex items-center gap-2 group">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(232,99,74,0.25)' }}
              >
                <Zap size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-lg hidden sm:inline" style={{ color: 'var(--text)' }}>
                SwiftShare
              </span>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Connection dot */}
            <div className="flex items-center gap-1.5 px-2 py-1 mr-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: isConnected ? 'var(--success)' : 'var(--warning)',
                  boxShadow: isConnected ? '0 0 6px rgba(22,163,74,0.4)' : '0 0 6px rgba(217,119,6,0.4)',
                }}
              />
              <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--text-3)' }}>
                {isConnected ? 'Connected' : 'Connecting'}
              </span>
            </div>

            {/* Theme toggle */}
            <motion.button
              className="btn-icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {theme === 'light' ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun size={18} />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Settings */}
            <button className="btn-icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
