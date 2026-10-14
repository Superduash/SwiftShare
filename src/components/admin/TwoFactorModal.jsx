import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, ShieldCheck, ShieldAlert, X, Copy, Check, QrCode, Key,
  Download, RefreshCw, AlertTriangle, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fetch2FAStatus, setup2FA, verify2FA, disable2FA } from '../../services/adminApi'

export default function TwoFactorModal({ isOpen, onClose, onStatusChange }) {
  const [status, setStatus] = useState({ enabled: false, confirmedAt: null, backupCodesRemaining: 0 })
  const [loading, setLoading] = useState(true)
  const [setupData, setSetupData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  // Disable flow
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disabling, setDisabling] = useState(false)

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await fetch2FAStatus()
      setStatus(data)
      if (onStatusChange) onStatusChange(data.enabled)
    } catch (err) {
      toast.error('Failed to load 2FA status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStatus()
      setSetupData(null)
      setVerificationCode('')
      setShowDisableConfirm(false)
      setDisablePassword('')
      setDisableCode('')
    }
  }, [isOpen])

  const handleStartSetup = async () => {
    setLoading(true)
    try {
      const data = await setup2FA()
      setSetupData(data)
      setVerificationCode('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    if (e) e.preventDefault()
    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit code from your authenticator app')
      return
    }

    setVerifying(true)
    try {
      await verify2FA(verificationCode.trim())
      toast.success('Two-factor authentication activated!')
      setSetupData(null)
      await loadStatus()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid verification code')
    } finally {
      setVerifying(false)
    }
  }

  const handleCopyKey = () => {
    if (!setupData?.secret) return
    navigator.clipboard.writeText(setupData.secret)
    setCopiedKey(true)
    toast.success('Secret key copied')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleCopyCodes = () => {
    if (!setupData?.backupCodes) return
    const text = setupData.backupCodes.join('\n')
    navigator.clipboard.writeText(text)
    setCopiedCodes(true)
    toast.success('Backup codes copied')
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  const handleDownloadCodes = () => {
    if (!setupData?.backupCodes) return
    const content = `SwiftShare Admin Backup Recovery Codes\nGenerated: ${new Date().toISOString()}\n\nEach code can only be used once:\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes in a secure, confidential place.`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swiftshare-admin-backup-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  const handleDisable = async (e) => {
    e.preventDefault()
    if (!disablePassword.trim() && !disableCode.trim()) {
      toast.error('Please enter admin password or 2FA code to confirm')
      return
    }

    setDisabling(true)
    try {
      await disable2FA({
        password: disablePassword.trim(),
        token: disableCode.trim(),
      })
      toast.success('2FA has been disabled')
      setShowDisableConfirm(false)
      setDisablePassword('')
      setDisableCode('')
      await loadStatus()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to disable 2FA')
    } finally {
      setDisabling(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[var(--surface-card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${status.enabled ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">Two-Factor Authentication (2FA)</h2>
              <p className="text-xs text-[var(--text-3)]">TOTP Authenticator App Security (RFC 6238)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-3)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-3)]">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <span className="text-xs">Checking security status...</span>
          </div>
        ) : status.enabled && !setupData && !showDisableConfirm ? (
          /* State 1: 2FA is currently ENABLED */
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/20 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[var(--success)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[var(--text)]">2FA Protection is Active</h4>
                <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">
                  Your administrator account is protected with a time-based one-time password (TOTP). Signing in requires your password and your authenticator device.
                </p>
                {status.confirmedAt && (
                  <p className="text-[11px] text-[var(--text-3)] mt-2">
                    Active since: {new Date(status.confirmedAt).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-2)]">Remaining Backup Recovery Codes:</span>
              <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] text-[var(--text)]">
                {status.backupCodesRemaining} available
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowDisableConfirm(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                Disable Two-Factor Authentication
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : showDisableConfirm ? (
          /* State 2: Disable Confirmation Form */
          <form onSubmit={handleDisable} className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[var(--danger)]">Disable 2FA Security?</h4>
                <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
                  Disabling 2FA leaves your admin account protected by password alone. To confirm, enter your current admin password or a valid 6-digit authenticator code.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-2)]">Current Admin Password</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="text-center text-[11px] text-[var(--text-3)] font-medium">─ OR ─</div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-2)]">6-Digit Authenticator Code</label>
              <input
                type="text"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-center font-mono text-sm tracking-widest text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={disabling || (!disablePassword.trim() && !disableCode.trim())}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--danger)] hover:opacity-90 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {disabling ? 'Disabling...' : 'Confirm Disable 2FA'}
              </button>
              <button
                type="button"
                onClick={() => setShowDisableConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : !setupData ? (
          /* State 3: 2FA NOT enabled yet -> Initial setup prompt */
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3.5">
              <ShieldAlert className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-[var(--text)]">Two-Factor Authentication is Recommended</h4>
                <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed">
                  Add an extra layer of defense to the SwiftShare admin panel. You can use any authenticator app like <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, <strong>Apple Passwords</strong>, or <strong>1Password</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <QrCode className="w-4 h-4 mx-auto text-[var(--accent)] mb-1" />
                <span className="text-[11px] font-semibold text-[var(--text)]">1. Scan QR Code</span>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">Use your mobile app</p>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <Key className="w-4 h-4 mx-auto text-[var(--accent)] mb-1" />
                <span className="text-[11px] font-semibold text-[var(--text)]">2. Save Backup Codes</span>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">Emergency recovery</p>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <ShieldCheck className="w-4 h-4 mx-auto text-[var(--success)] mb-1" />
                <span className="text-[11px] font-semibold text-[var(--text)]">3. Enter Code</span>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">Verify & Activate</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartSetup}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-lg shadow-[var(--accent)]/20 cursor-pointer"
            >
              Set Up Authenticator App Now
            </button>
          </div>
        ) : (
          /* State 4: Setup in progress (QR code + secret + backup codes + verification) */
          <div className="flex flex-col gap-5">
            {/* Step 1: QR Code & Secret */}
            <div className="flex flex-col items-center p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text)] mb-3 text-center">
                Step 1: Scan this QR code with your authenticator app
              </span>
              {setupData.qrCodeDataUrl ? (
                <div className="p-2 bg-white rounded-2xl shadow-md border border-[var(--border)] mb-3">
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="w-44 h-44 rounded-xl"
                  />
                </div>
              ) : null}

              <div className="w-full mt-1">
                <div className="text-[11px] text-[var(--text-3)] mb-1 text-center">
                  Can't scan? Enter this key manually:
                </div>
                <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border)]">
                  <code className="text-xs font-mono font-semibold tracking-wider text-[var(--text)] break-all select-all">
                    {setupData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--accent)] transition-colors cursor-pointer flex-shrink-0"
                    title="Copy Secret"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Backup Codes */}
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text)]">
                  Step 2: Save Emergency Recovery Codes
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCodes}
                    className="px-2 py-1 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-2)] hover:text-[var(--text)] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedCodes ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCodes}
                    className="px-2 py-1 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-2)] hover:text-[var(--text)] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Download (.txt)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-3)] mb-3">
                Each code can be used once if you lose your phone.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-xs">
                {setupData.backupCodes?.map((code, idx) => (
                  <div key={idx} className="p-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] text-center text-[var(--text-2)] font-semibold select-all">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Verify & Activate */}
            <form onSubmit={handleVerify} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3">
              <label className="text-xs font-semibold text-[var(--text)]" htmlFor="verify-totp-input">
                Step 3: Enter the 6-digit code shown in your app
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="verify-totp-input"
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="flex-1 px-4 py-2.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl text-center font-mono text-base tracking-widest text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={verifying || verificationCode.trim().length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[var(--accent)]/20"
                >
                  {verifying ? 'Activating...' : 'Activate 2FA'}
                </button>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  )
}
