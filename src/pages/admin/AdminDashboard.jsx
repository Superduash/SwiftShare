import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Radio,
  Server, Shield, LogOut, RefreshCw, Sparkles, ChevronDown,
  Clock, ShieldAlert, Zap, Palette, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

import OverviewPanel from '../../components/admin/OverviewPanel'
import TrafficPanel from '../../components/admin/TrafficPanel'
import TransfersPanel from '../../components/admin/TransfersPanel'
import LivePanel from '../../components/admin/LivePanel'
import SystemPanel from '../../components/admin/SystemPanel'
import AuditPanel from '../../components/admin/AuditPanel'
import ShareSnapshotModal from '../../components/admin/ShareSnapshotModal'
import { checkAdminSession, adminLogout, adminLogoutAll, fetchOverview } from '../../services/adminApi'
import { useTheme } from '../../context/ThemeContext'

const THEME_OPTIONS = [
  { value: 'sunset', label: 'Sunset', color: '#C85A10' },
  { value: 'sunrise', label: 'Sunrise', color: '#F07020' },
  { value: 'dark', label: 'Dark', color: '#1A1A1E' },
  { value: 'light', label: 'Light', color: '#F0F0F2' },
  { value: 'midnight', label: 'Midnight', color: '#1440A0' },
  { value: 'sakura', label: 'Sakura', color: '#F472B6' },
  { value: 'lavender', label: 'Lavender', color: '#A78BFA' },
  { value: 'lavender-mist', label: 'Lavender Mist', color: '#8B5CF6' },
  { value: 'forest', label: 'Forest', color: '#00D87C' },
  { value: 'forest-mist', label: 'Forest Mist', color: '#059669' },
  { value: 'volcanic', label: 'Volcanic', color: '#CC1010' },
  { value: 'ember', label: 'Ember', color: '#DC2626' },
]

export default function AdminDashboard() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [range, setRange] = useState('7d')
  const [adminUser, setAdminUser] = useState('Admin')
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [overviewData, setOverviewData] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  const themeMenuRef = useRef(null)

  // Validate session on mount & listen for unauthorized events
  useEffect(() => {
    checkAdminSession()
      .then((data) => {
        setAdminUser(data.username || 'Admin')
      })
      .catch(() => {
        toast.error('Session expired. Please sign in.')
        navigate('/admin', { replace: true })
      })

    const handleUnauthorized = () => {
      toast.error('Admin session ended')
      navigate('/admin', { replace: true })
    }

    window.addEventListener('swiftshare:admin-unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('swiftshare:admin-unauthorized', handleUnauthorized)
    }
  }, [navigate])

  // Inactivity auto-logout: 30 minutes with 60s warning
  useEffect(() => {
    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
    const WARNING_TIME_MS = 29 * 60 * 1000

    let warningToastId = null
    let timeoutId = null
    let warningTimerId = null

    const resetTimer = () => {
      if (warningToastId) {
        toast.dismiss(warningToastId)
        warningToastId = null
      }
      clearTimeout(timeoutId)
      clearTimeout(warningTimerId)

      warningTimerId = setTimeout(() => {
        warningToastId = toast(
          (t) => (
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-bold">Inactivity Notice</span>
              <span>You will be logged out in 60 seconds due to inactivity.</span>
            </div>
          ),
          { duration: 60000, icon: '⏱️' }
        )
      }, WARNING_TIME_MS)

      timeoutId = setTimeout(() => {
        toast.error('Logged out due to 30 minutes of inactivity.')
        adminLogout().finally(() => navigate('/admin', { replace: true }))
      }, INACTIVITY_LIMIT_MS)
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
      clearTimeout(timeoutId)
      clearTimeout(warningTimerId)
    }
  }, [navigate])

  // Periodic timer for "Updated X s ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [lastUpdated])

  // Close dropdown menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setShowThemeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleManualRefresh = () => {
    setLastUpdated(Date.now())
    setSecondsAgo(0)
    setRefreshKey((k) => k + 1)
  }

  const handleLogout = async () => {
    try {
      await adminLogout()
    } finally {
      toast.success('Signed out')
      navigate('/admin', { replace: true })
    }
  }

  const handleLogoutAll = async () => {
    try {
      await adminLogoutAll()
      toast.success('All sessions terminated')
    } finally {
      navigate('/admin', { replace: true })
    }
  }

  const handleOpenShare = async () => {
    try {
      const data = await fetchOverview(range)
      setOverviewData(data)
      setShowShareModal(true)
    } catch {
      toast.error('Failed to prepare snapshot')
    }
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'traffic', label: 'Traffic', icon: TrendingUp },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'live', label: 'Live Stream', icon: Radio, pulse: true },
    { id: 'system', label: 'System Health', icon: Server },
    { id: 'audit', label: 'Audit Log', icon: Shield },
  ]

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)] pb-20 md:pb-0 transition-colors duration-300">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--surface-card)] p-5 justify-between select-none">
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center logo-icon shadow-lg shadow-[var(--accent)]/20"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 2px 8px var(--accent-glow)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease'
              }}
              aria-hidden="true"
            >
              <Zap size={18} color="var(--logo-icon, var(--accent-contrast, #fff))" strokeWidth={2.5} />
            </div>
            <div>
              <h1
                className="font-display font-bold text-base leading-tight tracking-tight"
                style={{
                  background: 'var(--logo-gradient, linear-gradient(135deg, var(--text) 0%, var(--accent) 100%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SwiftShare
              </h1>
              <span className="text-[10px] font-mono text-[var(--accent)] uppercase font-semibold">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                      : 'text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.pulse && (
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User / Session Footer */}
        <div className="pt-4 border-t border-[var(--border)] relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[var(--surface-hover)] text-xs text-[var(--text-2)] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-bold text-xs">
                {adminUser.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-[var(--text)]">{adminUser}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--text-3)]" />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-16 left-0 right-0 p-1.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] shadow-2xl flex flex-col gap-1 z-30">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
              <button
                onClick={handleLogoutAll}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] font-medium transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Terminate All Sessions
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text)] capitalize">
              {activeTab.replace('-', ' ')}
            </h2>

            {/* Mobile Header Logout */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--danger)]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Range Selector */}
            <div className="flex items-center bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] text-xs">
              {[
                { id: '24h', label: '24h' },
                { id: '7d', label: '7d' },
                { id: '30d', label: '30d' },
                { id: '90d', label: '90d' },
                { id: 'all', label: 'All' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    range === r.id
                      ? 'bg-[var(--accent)] text-white font-semibold shadow-sm'
                      : 'text-[var(--text-3)] hover:text-[var(--text)]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Promotional Snapshot Button */}
            <button
              onClick={handleOpenShare}
              className="px-3 py-1.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Share Snapshot
            </button>

            {/* Theme Switcher Button & Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-2)] transition-colors flex items-center gap-1.5"
                title={`Current Theme: ${theme}`}
                aria-label="Change Theme"
              >
                <Palette className="w-3.5 h-3.5" />
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                  style={{ background: THEME_OPTIONS.find((t) => t.value === theme)?.color || 'var(--accent)' }}
                />
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] shadow-2xl flex flex-col gap-1 z-40 backdrop-blur-xl">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
                    Select Theme
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {THEME_OPTIONS.map((opt) => {
                      const isSelected = theme === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setTheme(opt.value)
                            setShowThemeMenu(false)
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                              : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                              style={{ background: opt.color }}
                            />
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Button & Status */}
            <button
              onClick={handleManualRefresh}
              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-2)] transition-colors"
              title={`Updated ${secondsAgo}s ago`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Panel Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && <OverviewPanel key={refreshKey} range={range} />}
          {activeTab === 'traffic' && <TrafficPanel key={refreshKey} range={range} />}
          {activeTab === 'transfers' && <TransfersPanel key={refreshKey} range={range} />}
          {activeTab === 'live' && <LivePanel key={refreshKey} />}
          {activeTab === 'system' && <SystemPanel key={refreshKey} />}
          {activeTab === 'audit' && <AuditPanel key={refreshKey} />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface-card)] border-t border-[var(--border)] px-2 py-2 flex justify-around backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-3)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Promotional Snapshot Modal */}
      {showShareModal && (
        <ShareSnapshotModal
          overviewData={overviewData}
          range={range}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
