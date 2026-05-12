import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * TagList Component
 * Displays tags with overflow handling (+N indicator)
 * Shows tooltip on hover/tap with remaining tags
 * 
 * @param {string[]} tags - Array of tag strings
 * @param {number} maxVisible - Maximum number of tags to show inline (default: 5)
 * @param {string} size - Size variant: 'sm' | 'md' (default: 'sm')
 * @param {string} variant - Style variant: 'default' | 'accent' | 'primary' (default: 'default')
 */
function TagList({ tags = [], maxVisible = 5, size = 'sm', variant = 'default' }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const overflowRef = useRef(null)
  
  if (!Array.isArray(tags) || tags.length === 0) {
    return null
  }
  
  const visibleTags = tags.slice(0, maxVisible)
  const overflowTags = tags.slice(maxVisible)
  const overflowCount = overflowTags.length
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  }
  
  const variantStyles = {
    default: {
      background: 'var(--accent-soft)',
      color: 'var(--text-3)',
    },
    accent: {
      background: 'var(--accent-soft)',
      color: 'var(--accent)',
    },
    primary: {
      background: 'var(--primary-soft)',
      color: 'var(--primary)',
    },
  }
  
  const handleOverflowHover = (e) => {
    if (overflowCount === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      top: rect.bottom + 4,
      left: rect.left,
    })
    setShowTooltip(true)
  }
  
  const handleOverflowLeave = () => {
    setShowTooltip(false)
  }
  
  useEffect(() => {
    // Close tooltip on scroll
    const handleScroll = () => setShowTooltip(false)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleTags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={`rounded ${sizeClasses[size]} font-medium whitespace-nowrap`}
          style={variantStyles[variant]}
        >
          {tag}
        </span>
      ))}
      
      {overflowCount > 0 && (
        <>
          <span
            ref={overflowRef}
            className={`rounded ${sizeClasses[size]} font-bold whitespace-nowrap cursor-help`}
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
            }}
            onMouseEnter={handleOverflowHover}
            onMouseLeave={handleOverflowLeave}
            onTouchStart={handleOverflowHover}
            title={`${overflowCount} more: ${overflowTags.join(', ')}`}
          >
            +{overflowCount}
          </span>
          
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                className="fixed z-[9999] rounded-lg shadow-lg p-2 max-w-xs"
                style={{
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  pointerEvents: 'none',
                }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex flex-wrap gap-1">
                  {overflowTags.map((tag, index) => (
                    <span
                      key={`tooltip-${tag}-${index}`}
                      className={`rounded ${sizeClasses[size]} font-medium whitespace-nowrap`}
                      style={variantStyles[variant]}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export default TagList
