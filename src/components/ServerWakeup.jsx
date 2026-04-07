import React from 'react'
import { motion } from 'framer-motion'
import { Server } from 'lucide-react'

export default function ServerWakeup({ onDismiss }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="blob-cyan top-1/3 left-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col items-center gap-6 text-center px-6 max-w-sm">
        {/* Spinning rings */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <motion.div
            className="absolute w-24 h-24 rounded-full"
            style={{ border: '2px solid transparent', borderTopColor: 'rgba(34,211,238,0.6)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-16 h-16 rounded-full"
            style={{ border: '1px solid transparent', borderTopColor: 'rgba(139,92,246,0.5)', borderBottomColor: 'rgba(139,92,246,0.2)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-color flex items-center justify-center">
            <Server size={16} className="text-accent-cyan" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-text-primary">Waking up SwiftShare...</h2>
          <p className="text-text-muted text-sm mt-2 leading-relaxed">
            Free tier servers sleep after inactivity.<br />
            This takes ~30 seconds.
          </p>
        </div>

        <div className="flex gap-1.5">
          {[0, 0.3, 0.6].map((delay, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-accent-cyan"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay }}
            />
          ))}
        </div>

        <p className="text-text-dim text-xs">
          You'll be redirected automatically once the server is ready
        </p>
      </div>
    </motion.div>
  )
}
