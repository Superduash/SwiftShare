import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Copy, Check, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

function getCatClass(category) {
  const map = {
    Notes: 'cat-notes', Assignment: 'cat-assignment', Invoice: 'cat-invoice',
    Report: 'cat-report', Code: 'cat-code', Image: 'cat-image',
    Video: 'cat-video', Audio: 'cat-audio', Presentation: 'cat-presentation',
    Spreadsheet: 'cat-spreadsheet', Other: 'cat-other',
  }
  return map[category] || 'cat-other'
}

export default function AISummaryCard({ ai, loading = false }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (ai?.suggestedName) {
      navigator.clipboard.writeText(ai.suggestedName)
      setCopied(true)
      toast.success('Filename copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading && !ai) {
    return (
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 skeleton rounded" />
          <div className="w-24 h-4 skeleton rounded" />
        </div>
        <div className="w-full h-3 skeleton rounded" />
        <div className="w-3/4 h-3 skeleton rounded" />
        <div className="w-1/2 h-3 skeleton rounded" />
      </div>
    )
  }

  if (!ai) return null

  return (
    <AnimatePresence>
      <motion.div
        className="glass-card p-4 border border-border-color"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        style={{ borderColor: 'rgba(139,92,246,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center">
              <Sparkles size={13} className="text-accent-purple" />
            </div>
            <span className="text-text-primary font-bold text-sm">AI Analysis</span>
          </div>
          {ai.category && (
            <span className={`badge ${getCatClass(ai.category)}`}>
              <Tag size={8} />
              {ai.category}
            </span>
          )}
        </div>

        {/* Summary */}
        {ai.summary && (
          <p className="text-text-muted text-xs leading-relaxed mb-3">{ai.summary}</p>
        )}

        {/* Image description */}
        {ai.imageDescription && (
          <p className="text-text-muted text-xs leading-relaxed mb-3 italic">"{ai.imageDescription}"</p>
        )}

        {/* Suggested filename */}
        {ai.suggestedName && (
          <div className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2 border border-border-color">
            <span className="text-text-dim text-xs flex-1 font-mono truncate">{ai.suggestedName}</span>
            <button className="btn-icon w-6 h-6" onClick={handleCopy}>
              {copied ? <Check size={11} className="text-accent-green" /> : <Copy size={11} />}
            </button>
          </div>
        )}

        {/* Gemini badge */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-color">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          <span className="text-text-dim text-xs">Powered by Gemini 2.5 Flash</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
