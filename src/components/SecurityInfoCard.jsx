import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ChevronDown, Flame, Lock, EyeOff, ShieldCheck } from 'lucide-react'

export default function SecurityInfoCard({ burnAfterDownload, passwordProtected }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="surface-card p-4 mb-6">
      <button 
        className="w-full flex items-center justify-between text-left group"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: 'var(--success)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Security info
          </span>
        </div>
        <ChevronDown 
          size={16} 
          style={{ color: 'var(--text-4)' }} 
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)', marginTop: '12px' }}>
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  Files auto-delete from our servers as soon as the timer expires.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <EyeOff size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  No tracking, no accounts required, no permanent storage.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Lock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  {passwordProtected 
                    ? 'This transfer is protected by a custom password.'
                    : 'End-to-end encrypted in transit (TLS 1.3).'}
                </p>
              </div>
              {burnAfterDownload && (
                <div className="flex items-start gap-2.5">
                  <Flame size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>
                    Burn Mode Enabled — This transfer will be permanently removed after it is claimed.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
