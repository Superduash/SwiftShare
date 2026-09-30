import React, { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Spinner from './Spinner'

function LoadingScreen({ message = 'Loading...' }) {
  const [showSubtext, setShowSubtext] = useState(false);
 
  // Prevent subtext from flashing if the server responds instantly
  useEffect(() => {
    const timer = setTimeout(() => setShowSubtext(true), 1500);
    return () => clearTimeout(timer);
  }, []);
 
  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 z-[9999]"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center">
        {/* Pulsing Glass Container */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center relative overflow-hidden"
          style={{ 
            background: 'var(--surface-card)',
            boxShadow: '0 8px 32px var(--shadow-sm)',
            border: '1px solid var(--border)'
          }}
        >
          {/* Subtle breathing glow */}
          <motion.div
            className="absolute inset-0 opacity-20 mix-blend-screen"
            style={{ background: 'var(--accent)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
          <Spinner size={28} style={{ color: 'var(--accent)', position: 'relative', zIndex: 1 }} />
        </div>
        
        <h2
          className="text-lg font-bold tracking-tight mb-2"
          style={{ color: 'var(--text)' }}
        >
          {message}
        </h2>
        
        {/* Fixed height to prevent layout jump when text appears */}
        <div className="h-6">
          <AnimatePresence>
            {showSubtext && (
              <p
                className="text-sm max-w-[240px] mx-auto"
                style={{ color: 'var(--text-3)' }}
              >
                Waking up server, please wait...
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default memo(LoadingScreen)
