import React from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <motion.div
        className="card p-8 text-center max-w-md w-full"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap size={22} style={{ color: '#818CF8' }} />
        </motion.div>
        <p style={{ color: 'var(--text)', fontWeight: 600 }}>{message}</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>Please wait a moment</p>
      </motion.div>
    </div>
  )
}
