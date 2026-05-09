import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import Spinner from './Spinner'

function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <motion.div
          className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 20px var(--accent-glow)' }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap size={24} color="#fff" />
        </motion.div>
        <p className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>SwiftShare</p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>{message}</p>
        <div className="mt-6 flex justify-center">
          <Spinner size={24} style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  )
}

export default memo(LoadingScreen)
