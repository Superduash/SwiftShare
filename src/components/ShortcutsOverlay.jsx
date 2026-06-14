import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { group: 'Global',   key: '?',         desc: 'Show this shortcuts panel' },
  { group: 'Global',   key: 'Esc',       desc: 'Close modals / dialogs' },
  { group: 'Sender',   key: 'Ctrl+C',    desc: 'Copy transfer code' },
  { group: 'Sender',   key: 'Ctrl+V',    desc: 'Paste screenshot / file' },
  { group: 'Sender',   key: 'Ctrl+L',    desc: 'Copy share link' },
  { group: 'Receiver', key: 'Space / Enter', desc: 'Download files' },
]

export default function ShortcutsOverlay({ open, onClose }) {
  if (!open) return null

  const groups = [...new Set(SHORTCUTS.map(s => s.group))]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            className="relative z-10 rounded-2xl p-6 max-w-sm w-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>
                Keyboard Shortcuts
              </h2>
              <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            {groups.map(group => (
              <div key={group} className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                   style={{ color: 'var(--text-4)' }}>{group}</p>
                <div className="space-y-1.5">
                  {SHORTCUTS.filter(s => s.group === group).map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <span className="text-sm" style={{ color: 'var(--text-3)' }}>{s.desc}</span>
                      <kbd className="font-mono text-[11px] px-2 py-1 rounded-lg shrink-0"
                           style={{ background: 'var(--bg-sunken)', color: 'var(--text-2)',
                                    border: '1px solid var(--border)' }}>
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
