import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ContextMenu({ open, x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    
    // Use capture phase to ensure it runs before other click handlers
    window.addEventListener('mousedown', onClickOutside, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onClickOutside, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose])

  // Prevent default context menu on the context menu itself
  const handleContextMenu = (e) => {
    e.preventDefault()
  }

  // Clamp to viewport
  const style = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 200),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 9990,
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="menu"
          aria-label="File actions"
          style={{ 
            ...style, 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 12, 
            padding: '4px', 
            minWidth: 180, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)' 
          }}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          onContextMenu={handleContextMenu}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            ) : (
              <button
                key={i}
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                style={{
                  color: item.danger ? 'var(--danger)' : 'var(--text-2)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={(e) => { 
                  e.stopPropagation()
                  item.action() 
                  onClose() 
                }}
              >
                {item.icon && <item.icon size={14} />}
                {item.label}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
