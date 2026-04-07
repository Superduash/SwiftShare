import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { getFileMetadata } from '../services/api'
import Navbar from '../components/Navbar'
import NearbyDevices from '../components/NearbyDevices'
import ErrorState from '../components/ErrorState'
import { extractErrorCode } from '../utils/errors'

const CODE_LENGTH = 6
// Same alphabet as backend: excludes 0, O, 1, I, L to avoid ambiguity
const VALID_CODE_CHARS = /[A-HJ-KM-NP-Z2-9]/

export default function JoinPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const prefill = (params.get('code') || '').toUpperCase().replace(/[^A-HJ-KM-NP-Z2-9]/g, '').slice(0, CODE_LENGTH)

  const [chars, setChars] = useState(() => {
    const arr = Array(CODE_LENGTH).fill('')
    prefill.split('').forEach((c, i) => { arr[i] = c })
    return arr
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRefs = useRef([])

  useEffect(() => {
    document.title = 'Receive a file · SwiftShare'
  }, [])

  // Auto-focus first empty
  useEffect(() => {
    const firstEmpty = chars.findIndex(c => !c)
    if (firstEmpty >= 0) inputRefs.current[firstEmpty]?.focus()
  }, [])

  // Auto-submit when complete
  useEffect(() => {
    if (chars.every(c => c) && chars.length === CODE_LENGTH) {
      handleSubmit(chars.join(''))
    }
  }, [chars])

  function handleChange(idx, value) {
    const ch = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!ch) return

    // Filter to valid code characters (excludes 0, O, 1, I, L)
    const filtered = ch.split('').filter(c => VALID_CODE_CHARS.test(c)).join('')
    if (!filtered) return

    // Handle paste
    if (filtered.length > 1) {
      const pasted = filtered.slice(0, CODE_LENGTH).split('')
      const next = [...chars]
      pasted.forEach((c, i) => {
        if (idx + i < CODE_LENGTH) next[idx + i] = c
      })
      setChars(next)
      const focusIdx = Math.min(idx + pasted.length, CODE_LENGTH - 1)
      inputRefs.current[focusIdx]?.focus()
      return
    }

    const next = [...chars]
    next[idx] = filtered[0]
    setChars(next)
    if (idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace') {
      if (chars[idx]) {
        const next = [...chars]
        next[idx] = ''
        setChars(next)
      } else if (idx > 0) {
        const next = [...chars]
        next[idx - 1] = ''
        setChars(next)
        inputRefs.current[idx - 1]?.focus()
      }
    }
    if (e.key === 'Enter') {
      const code = chars.join('')
      if (code.length === CODE_LENGTH) handleSubmit(code)
    }
  }

  async function handleSubmit(code) {
    if (loading || code.length !== CODE_LENGTH) return
    setLoading(true)
    setError(null)
    try {
      await getFileMetadata(code)
      navigate(`/download/${code}`)
    } catch (err) {
      const errCode = extractErrorCode(err)
      if (errCode === 'TRANSFER_EXPIRED') {
        navigate('/expired?reason=expired', { replace: true })
      } else if (errCode === 'ALREADY_DOWNLOADED') {
        navigate('/expired?reason=burned', { replace: true })
      } else {
        setError(errCode)
        setLoading(false)
        // Shake animation
        const el = document.getElementById('code-input-row')
        if (el) { el.classList.add('animate-shake'); setTimeout(() => el.classList.remove('animate-shake'), 500) }
      }
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-14">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl mb-2" style={{ color: 'var(--text)' }}>
              Receive a file
            </h1>
            <p className="text-base" style={{ color: 'var(--text-3)' }}>
              Enter the 6-character code from the sender
            </p>
          </motion.div>

          {/* OTP Input */}
          <motion.div
            id="code-input-row"
            className="flex justify-center gap-2 sm:gap-3 mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {chars.map((ch, i) => (
              <motion.input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="text"
                maxLength={6}
                value={ch}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono font-bold text-xl sm:text-2xl rounded-xl outline-none transition-all"
                style={{
                  background: 'var(--code-char-bg)',
                  border: `2px solid ${ch ? 'var(--accent)' : error ? 'var(--danger)' : 'var(--code-char-border)'}`,
                  color: 'var(--accent)',
                  caretColor: 'var(--accent)',
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                autoComplete="off"
                aria-label={`Code digit ${i + 1}`}
              />
            ))}
          </motion.div>

          {/* Alphabet hint */}
          <p className="text-center text-xs mb-4" style={{ color: 'var(--text-4)' }}>
            Letters A–Z (except O, I, L) and numbers 2–9
          </p>

          {/* Error */}
          {error && (
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ErrorState code={error} />
            </motion.div>
          )}

          {/* Submit button */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              className="btn-primary mx-auto px-10"
              onClick={() => handleSubmit(chars.join(''))}
              disabled={loading || chars.some(c => !c)}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Checking...</>
              ) : (
                <>Get file <ArrowRight size={16} /></>
              )}
            </button>
          </motion.div>

          {/* Nearby Devices */}
          <NearbyDevices />
        </div>
      </main>
    </div>
  )
}
