import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Flame, FileQuestion, Home, ArrowRight, Search } from 'lucide-react'

const CODE_LENGTH = 6
const VALID_CODE_CHARS = /[A-HJ-KM-NP-Z2-9]/

const STATES = {
  expired: {
    icon: Clock,
    color: 'var(--warning)',
    title: 'Transfer Expired',
    desc: 'This transfer is no longer available.',
    tip: 'The expiration time has been reached.',
  },
  burned: {
    icon: Flame,
    color: 'var(--danger)',
    title: 'Transfer Unavailable',
    desc: 'This burn transfer has already been claimed.',
    tip: 'The files are no longer available.',
  },
  claimed: {
    icon: Flame,
    color: 'var(--danger)',
    title: 'Transfer Unavailable',
    desc: 'This burn transfer has already been claimed.',
    tip: 'The files are no longer available.',
  },
  notfound: {
    icon: FileQuestion,
    color: 'var(--text-3)',
    title: 'Transfer Not Found',
    desc: 'No active transfer matches this code.',
    tip: 'Check the code and try again.',
  },
  cancelled: {
    icon: FileQuestion,
    color: 'var(--danger)',
    title: 'Transfer Deleted',
    desc: 'This transfer was removed by the sender.',
    tip: '',
  },
  deleted: {
    icon: FileQuestion,
    color: 'var(--danger)',
    title: 'Transfer Deleted',
    desc: 'This transfer was removed by the sender.',
    tip: '',
  },
}

export default function ExpiredPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reason = params.get('reason') || 'expired'
  const state = STATES[reason] || STATES.expired

  const [codeInput, setCodeInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { document.title = `${state.title.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim()} \u00b7 SwiftShare` }, [state.title])

  function handleCodeSubmit(e) {
    e?.preventDefault()
    const clean = codeInput.toUpperCase().replace(/[^A-HJ-KM-NP-Z2-9]/g, '').slice(0, CODE_LENGTH)
    if (clean.length === CODE_LENGTH) {
      navigate(`/download/${clean}`)
    }
  }

  function handleCodeChange(e) {
    const raw = e.target.value.toUpperCase().replace(/[^A-HJ-KM-NP-Z2-9]/g, '').slice(0, CODE_LENGTH)
    setCodeInput(raw)
  }

  const Icon = state.icon

  return (
    <div className="min-h-screen">
      <main className="app-main-offset">
        <div className="page-shell-narrow py-20 text-center">
          <motion.div
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 18 }}
          >
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: `${state.color}12` }}
            >
              <Icon size={32} style={{ color: state.color }} />
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-3" style={{ color: 'var(--text)' }}>
              {state.title}
            </h1>
            <p className="text-sm leading-relaxed mb-2 max-w-xs mx-auto" style={{ color: 'var(--text-3)' }}>
              {state.desc}
            </p>
            {state.tip && (
              <p className="text-xs leading-relaxed mb-8 max-w-xs mx-auto" style={{ color: 'var(--text-4)' }}>
                {state.tip}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <button className="btn-primary" onClick={() => navigate('/')}>
                <Home size={16} />
                Share New Files
              </button>
              <button className="btn-secondary" onClick={() => navigate('/join')}>
                Enter Another Code
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Quick code entry */}
            <div
              className="max-w-xs mx-auto p-4 rounded-2xl"
              style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-3)' }}>
                Have another code? Try it here:
              </p>
              <form onSubmit={handleCodeSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={codeInput}
                  onChange={handleCodeChange}
                  placeholder="ABC123"
                  maxLength={CODE_LENGTH}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-center font-mono font-bold uppercase tracking-[0.25em] outline-none transition-all"
                  style={{
                    background: 'var(--bg)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--text)',
                    letterSpacing: '0.2em',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                  aria-label="Transfer code"
                />
                <button
                  type="submit"
                  className="btn-primary !px-3"
                  disabled={codeInput.length !== CODE_LENGTH}
                  aria-label="Go to transfer"
                >
                  <Search size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
