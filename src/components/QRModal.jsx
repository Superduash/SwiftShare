import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2 } from 'lucide-react'
import QRCode from 'react-qr-code'

export default function QRModal({ open, onClose, value, code }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="relative z-10 rounded-3xl p-8 text-center max-w-sm w-full"
            style={{ background: 'var(--bg-raised)' }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button className="absolute top-4 right-4 btn-icon" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>

            <h3 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>Scan to Download</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Point your camera at this code</p>

            <div className="inline-block p-5 rounded-2xl mb-6" style={{ background: 'var(--qr-bg)', border: '1px solid var(--border)' }}>
              <QRCode
                value={value || ''}
                size={220}
                bgColor="var(--qr-bg)"
                fgColor="var(--qr-fg)"
                level="M"
              />
            </div>

            {code && (
              <div className="flex justify-center gap-1.5">
                {code.split('').map((ch, i) => (
                  <div
                    key={i}
                    className="w-10 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg"
                    style={{ background: 'var(--code-char-bg)', border: '1px solid var(--code-char-border)', color: 'var(--accent)' }}
                  >
                    {ch}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
