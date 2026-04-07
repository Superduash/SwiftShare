import React from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

export default function LoadingScreen({ message = 'Loading...', subtext = null }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary">
      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Blob decorations */}
      <div className="blob-cyan top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
      <div className="blob-purple bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Spinning rings */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Ring 3 - outermost */}
          <motion.div
            className="absolute w-32 h-32 rounded-full border border-accent-cyan/10"
            style={{ borderTopColor: 'rgba(34,211,238,0.5)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          {/* Ring 2 */}
          <motion.div
            className="absolute w-24 h-24 rounded-full border border-accent-cyan/15"
            style={{ borderTopColor: 'rgba(34,211,238,0.6)', borderRightColor: 'rgba(34,211,238,0.2)' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
          {/* Ring 1 - innermost */}
          <motion.div
            className="absolute w-16 h-16 rounded-full border border-accent-purple/20"
            style={{ borderTopColor: 'rgba(139,92,246,0.8)', borderBottomColor: 'rgba(139,92,246,0.3)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />

          {/* Center icon */}
          <motion.div
            className="relative z-10 w-10 h-10 rounded-xl bg-bg-elevated border border-border-color flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap size={18} className="text-accent-cyan" />
          </motion.div>
        </div>

        {/* Logo */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Swift<span className="text-accent-cyan">Share</span>
          </h1>
          <p className="text-text-muted text-sm mt-2">{message}</p>
          {subtext && (
            <p className="text-text-dim text-xs mt-1 max-w-xs text-center">{subtext}</p>
          )}
        </motion.div>

        {/* Pulse dots */}
        <div className="flex gap-2">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent-cyan"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
