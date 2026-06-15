import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { group: 'Global',   key: 'Esc',           desc: 'Close modals / dialogs' },
  { group: 'Sender',   key: 'Ctrl+C',        desc: 'Copy transfer code' },
  { group: 'Sender',   key: 'Ctrl+V',        desc: 'Paste screenshot / file' },
  { group: 'Sender',   key: 'Ctrl+L',        desc: 'Copy share link' },
  { group: 'Receiver', key: 'Space / Enter', desc: 'Download files' },
]

/**
 * ShortcutsOverlay — keyboard shortcuts dialog.
 * 
 * Accessibility (Task 14.8):
 *  - role="dialog" with aria-modal and aria-labelledby
 *  - Focus moves to the close button on open
 *  - Focus returns to the trigger on close
 *  - Escape closes the dialog
 *  - Backdrop click closes the dialog
 */
export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false)
  const closeButtonRef  = useRef(null)
  const triggerRef      = useRef(null) // element that opened the dialog

  const onClose = () => setOpen(false)

  useEffect(() => {
    const handleOpen = (e) => {
      triggerRef.current = e?.detail?.trigger || document.activeElement
      setOpen(true)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('swiftshare:open-shortcuts', handleOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('swiftshare:open-shortcuts', handleOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Move focus into dialog on open, restore on close
  useEffect(() => {
    if (open) {
      // Small delay so the element is in the DOM after AnimatePresence mounts
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 30)
      return () => clearTimeout(timer)
    } else {
      // Return focus to the trigger element
      try { triggerRef.current?.focus() } catch {}
    }
  }, [open])

  const groups = [...new Set(SHORTCUTS.map(s => s.group))]
  const dialogId = 'shortcuts-dialog-title'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-overlay"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogId}
            className="relative z-10 rounded-2xl p-6 max-w-sm w-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                id={dialogId}
                className="font-display font-bold text-lg"
                style={{ color: 'var(--text)' }}
              >
                Keyboard Shortcuts
              </h2>
              <button
                ref={closeButtonRef}
                className="btn-icon"
                onClick={onClose}
                aria-label="Close keyboard shortcuts"
              >
                <X size={18} />
              </button>
            </div>

            {groups.map(group => (
              <div key={group} className="mb-4">
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-4)' }}
                >
                  {group}
                </p>
                <dl className="space-y-1.5">
                  {SHORTCUTS.filter(s => s.group === group).map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <dt className="text-sm" style={{ color: 'var(--text-3)' }}>{s.desc}</dt>
                      <dd>
                        <kbd
                          className="font-mono text-[11px] px-2 py-1 rounded-lg shrink-0"
                          style={{
                            background: 'var(--bg-sunken)',
                            color: 'var(--text-2)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {s.key}
                        </kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
