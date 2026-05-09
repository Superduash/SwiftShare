import React, { useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2 } from 'lucide-react'
import { QRCode } from 'react-qr-code'

function QRModal({ open, onClose, value, code }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="relative z-10 rounded-3xl p-5 sm:p-8 text-center max-w-sm w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-none overflow-auto"
            style={{ background: 'var(--bg-raised)' }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            role="dialog"
            aria-modal="true"
            aria-label="QR code to scan for download"
          >
            <button className="absolute top-3 right-3 sm:top-4 sm:right-4 btn-icon" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>

            <h3 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>Scan to Download</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>Point your camera at this code</p>

            <div className="inline-block p-3 sm:p-5 rounded-2xl mb-6 max-w-full overflow-hidden" style={{ background: 'var(--qr-bg)', border: '1px solid var(--border)' }}>
              <QRCode
                value={value || ''}
                size={Math.max(160, Math.min(220, window.innerWidth * 0.5))}
                bgColor="var(--qr-bg)"
                fgColor="var(--qr-fg)"
                level="M"
                aria-label={`QR code for transfer ${code || ''}`}
              />
            </div>

            {code && (
              <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 max-w-full">
                {code.split('').map((ch, i) => (
                  <div
                    key={i}
                    className="w-7 h-9 sm:w-10 sm:h-12 rounded-xl flex items-center justify-center font-mono font-bold text-sm sm:text-lg"
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

export default memo(QRModal)
