import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'

const SHORTCUTS = [
  { group: 'Global', key: 'Esc', desc: 'Close modals / dialogs' },
  { group: 'Sender', key: 'Ctrl+C', desc: 'Copy transfer code' },
  { group: 'Sender', key: 'Ctrl+V', desc: 'Paste screenshot / file' },
  { group: 'Sender', key: 'Ctrl+L', desc: 'Copy share link' },
  { group: 'Receiver', key: 'Space / Enter', desc: 'Download files' },
]

export default function ShortcutsOverlay({ open, onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, open)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) {
        onClose?.()
      }
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const groups = [...new Set(SHORTCUTS.map(s => s.group))]

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="shortcuts-wrapper" className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
          {/* Backdrop */}
          <motion.div
            key="shortcuts-backdrop"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Modal Card */}
          <motion.div
            key="shortcuts-card"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard Shortcuts"
            className="relative z-10 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              pointerEvents: 'auto'
            }}
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Keyboard size={15} />
                </div>
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                className="btn-icon"
                onClick={onClose}
                aria-label="Close keyboard shortcuts"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {groups.map(group => (
                <div key={group}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-4)' }}
                  >
                    {group}
                  </p>
                  <div className="space-y-1.5">
                    {SHORTCUTS.filter(s => s.group === group).map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                          {s.desc}
                        </span>
                        <kbd
                          className="font-mono text-[11px] px-2 py-1 rounded-lg shrink-0 font-semibold"
                          style={{
                            background: 'var(--bg-sunken)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {s.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
