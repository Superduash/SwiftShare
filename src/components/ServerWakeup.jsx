import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Loader2 } from 'lucide-react'
import { pingServer } from '../services/api'

export default function ServerWakeup() {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setDots(d => (d + 1) % 4), 500)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <motion.div
        className="surface-card p-8 text-center max-w-sm w-full"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap size={24} style={{ color: 'var(--warning)' }} />
        </motion.div>
        <h2 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>
          Waking up the server{'.'.repeat(dots)}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          Free tier servers sleep after inactivity. This takes about 30 seconds on first load.
        </p>
        <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-4)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs font-medium">Connecting...</span>
        </div>
      </motion.div>
    </div>
  )
}
