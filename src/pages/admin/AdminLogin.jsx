import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, Zap, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminLogin } from '../../services/adminApi'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryAfter, setRetryAfter] = useState(0)

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [isBackupMode, setIsBackupMode] = useState(false)
  const totpInputRef = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    // Check if already logged in
    const token = sessionStorage.getItem('swiftshare_admin_token') || localStorage.getItem('swiftshare_admin_token')
    if (token) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [navigate])

  // Focus 2FA input when 2FA mode is activated
  useEffect(() => {
    if (requires2FA && totpInputRef.current) {
      totpInputRef.current.focus()
    }
  }, [requires2FA, isBackupMode])

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
    if (e) e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    if (requires2FA && !totpCode.trim()) {
      setError(isBackupMode ? 'Please enter a backup recovery code' : 'Please enter the 6-digit authenticator code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await adminLogin(username.trim(), password, totpCode.trim())
      if (res.require2FA) {
        setRequires2FA(true)
        setError(null)
        setLoading(false)
        return
      }

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

  // Auto-submit when user enters 6-digit TOTP code
  const handleTotpChange = (e) => {
    const val = e.target.value
    if (!isBackupMode) {
      const digitsOnly = val.replace(/\D/g, '').slice(0, 6)
      setTotpCode(digitsOnly)
      if (digitsOnly.length === 6 && !loading) {
        // Schedule next-tick submit
        setTimeout(() => {
          adminLogin(username.trim(), password, digitsOnly)
            .then(() => {
              toast.success('Admin authenticated successfully')
              navigate('/admin/dashboard', { replace: true })
            })
            .catch((err) => {
              setError(err.response?.data?.error || 'Invalid 2FA code')
            })
        }, 50)
      }
    } else {
      setTotpCode(val.toUpperCase())
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center logo-icon mb-3 shadow-lg shadow-[var(--accent)]/25"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 4px 14px var(--accent-glow)',
            }}
            aria-hidden="true"
          >
            {requires2FA ? (
              <Shield size={24} color="var(--logo-icon, var(--accent-contrast, #fff))" strokeWidth={2.5} />
            ) : (
              <Zap size={24} color="var(--logo-icon, var(--accent-contrast, #fff))" strokeWidth={2.5} />
            )}
          </div>
          <h1
            className="font-display text-xl font-bold tracking-tight"
            style={{
              background: 'var(--logo-gradient, linear-gradient(135deg, var(--text) 0%, var(--accent) 100%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {requires2FA ? 'Two-Factor Authentication' : 'SwiftShare Admin'}
          </h1>
          <p className="text-xs text-[var(--text-3)] mt-1">
            {requires2FA
              ? (isBackupMode ? 'Enter one of your 8-character backup recovery codes' : 'Enter the 6-digit code from your authenticator app')
              : 'Restricted area. All access attempts are monitored and logged.'}
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

        <AnimatePresence mode="wait">
          {!requires2FA ? (
            <motion.form
              key="password-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
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
                className="w-full mt-2 py-2.5 bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent)]/20 cursor-pointer"
              >
                {loading ? 'Authenticating...' : retryAfter > 0 ? `Locked (${retryAfter}s)` : 'Sign In'}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="2fa-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-2)] flex items-center justify-between" htmlFor="admin-totp">
                  <span>{isBackupMode ? 'Backup Recovery Code' : '6-Digit Authenticator Code'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBackupMode(!isBackupMode)
                      setTotpCode('')
                      setError(null)
                    }}
                    className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    {isBackupMode ? 'Use Authenticator App' : 'Use Backup Code'}
                  </button>
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="absolute left-3.5 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
                  <input
                    id="admin-totp"
                    ref={totpInputRef}
                    type="text"
                    inputMode={isBackupMode ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    required
                    maxLength={isBackupMode ? 12 : 6}
                    disabled={loading || retryAfter > 0}
                    value={totpCode}
                    onChange={handleTotpChange}
                    placeholder={isBackupMode ? 'XXXX-XXXX' : '000000'}
                    className="w-full pl-10 pr-3.5 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-lg font-mono tracking-widest text-[var(--text)] text-center placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || retryAfter > 0 || !totpCode.trim()}
                className="w-full mt-2 py-2.5 bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent)]/20 cursor-pointer"
              >
                {loading ? 'Verifying 2FA...' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false)
                  setTotpCode('')
                  setError(null)
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text)] mt-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to credentials
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

