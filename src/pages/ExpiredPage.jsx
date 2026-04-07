import React, { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Flame, FileQuestion, Home, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar'

const STATES = {
  expired: {
    icon: Clock,
    color: 'var(--warning)',
    title: 'Transfer expired',
    desc: 'This file has been automatically deleted. Ask the sender to share it again.',
    emoji: '⏰',
  },
  burned: {
    icon: Flame,
    color: 'var(--danger)',
    title: 'Burned after download',
    desc: 'This was a one-time transfer. The file was permanently deleted after the first download.',
    emoji: '🔥',
  },
  notfound: {
    icon: FileQuestion,
    color: 'var(--text-3)',
    title: 'Transfer not found',
    desc: 'This code doesn\'t match any active transfer. It may have expired or the code might be wrong.',
    emoji: '🔍',
  },
}

export default function ExpiredPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reason = params.get('reason') || 'expired'
  const state = STATES[reason] || STATES.expired
  const Icon = state.icon

  useEffect(() => { document.title = `${state.title} · SwiftShare` }, [state.title])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />

      <main className="pt-14">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-3xl"
              style={{ background: `${state.color}12` }}
            >
              {state.emoji}
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-3" style={{ color: 'var(--text)' }}>
              {state.title}
            </h1>
            <p className="text-sm leading-relaxed mb-8 max-w-xs mx-auto" style={{ color: 'var(--text-3)' }}>
              {state.desc}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="btn-primary" onClick={() => navigate('/')}>
                <Home size={16} />
                Share a new file
              </button>
              <button className="btn-secondary" onClick={() => navigate('/join')}>
                Enter another code
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
