import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowRight, MapPin } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Page not found</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="app-main-offset">
        <div className="page-shell-narrow py-20 text-center">
          <motion.div
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 18 }}
          >
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-3xl"
              style={{ background: 'var(--accent-soft)' }}
            >
              <MapPin size={32} style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-3" style={{ color: 'var(--text)' }}>
              Page not found
            </h1>
            <p className="text-sm leading-relaxed mb-8 max-w-xs mx-auto" style={{ color: 'var(--text-3)' }}>
              This page doesn&apos;t exist. You might have followed an old link or mistyped the URL.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="btn-primary" onClick={() => navigate('/')}>
                <Home size={16} />
                Go home
              </button>
              <button className="btn-secondary" onClick={() => navigate('/join')}>
                Enter a code
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
