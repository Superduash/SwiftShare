import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminLogin } from '../../services/adminApi'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryAfter, setRetryAfter] = useState(0)

  const navigate = useNavigate()

  useEffect(() => {
    // Check if already logged in
    const token = sessionStorage.getItem('swiftshare_admin_token') || localStorage.getItem('swiftshare_admin_token')
    if (token) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [navigate])

  // Countdown timer for 429 lockout
  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAfter])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await adminLogin(username.trim(), password)
      toast.success('Admin authenticated successfully')
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.error || 'Authentication failed'
      const retry = err.response?.data?.retryAfter || 0

      if (status === 429) {
        setRetryAfter(retry || 60)
        setError(`Too many failed attempts. Locked for ${retry || 60} seconds.`)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-[var(--text)]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SwiftShare Admin</h1>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Restricted area. All access attempts are monitored and logged.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-2.5 p-3 mb-5 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
              {retryAfter > 0 && (
                <div className="font-mono mt-1 text-[11px]">
                  Unlocks in: {retryAfter}s
                </div>
              )}
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)]" htmlFor="admin-username">
              Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                required
                disabled={loading || retryAfter > 0}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin username"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)]" htmlFor="admin-password">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={loading || retryAfter > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full pl-10 pr-10 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-[var(--text-3)] hover:text-[var(--text)] transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || retryAfter > 0}
            className="w-full mt-2 py-2.5 bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent)]/20"
          >
            {loading ? 'Authenticating...' : retryAfter > 0 ? `Locked (${retryAfter}s)` : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
