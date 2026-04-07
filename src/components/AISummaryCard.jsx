import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Copy, Check, FileText, Image, Video, FileArchive,
  Music, BookOpen, Code, Presentation, Table2
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_ICONS = {
  document: FileText, image: Image, video: Video, archive: FileArchive,
  audio: Music, ebook: BookOpen, code: Code, presentation: Presentation,
  spreadsheet: Table2, default: FileText,
}

function getCategoryIcon(cat) {
  if (!cat) return CATEGORY_ICONS.default
  const key = cat.toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v
  }
  return CATEGORY_ICONS.default
}

export default function AISummaryCard({ ai, loading = false }) {
  const [copied, setCopied] = useState(false)

  function copySuggestedName() {
    if (!ai?.suggestedName) return
    navigator.clipboard.writeText(ai.suggestedName).then(() => {
      setCopied(true)
      toast.success('Filename copied')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const CatIcon = ai?.category ? getCategoryIcon(ai.category) : Sparkles

  return (
    <motion.div
      className="rounded-2xl p-4 overflow-hidden relative"
      style={{
        background: 'var(--ai-bg)',
        border: '1px solid var(--ai-border)',
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
            <Sparkles size={14} style={{ color: 'var(--ai-icon)' }} />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>AI Analysis</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--text-3)' }}>
          Gemini 2.5 Flash
        </span>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-2">
              <div className="shimmer-block h-4 w-3/4" />
              <div className="shimmer-block h-4 w-full" />
              <div className="shimmer-block h-4 w-1/2" />
            </div>
            <p className="text-xs mt-3 animate-pulse-soft" style={{ color: 'var(--text-4)' }}>
              Analyzing with AI...
            </p>
          </motion.div>
        ) : ai ? (
          <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Category badge */}
            {ai.category && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="badge">
                  <CatIcon size={12} />
                  {ai.category}
                </div>
              </div>
            )}

            {/* Summary */}
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
              {ai.summary || 'No summary available.'}
            </p>

            {/* Image description */}
            {ai.imageDescription && (
              <div className="p-2.5 rounded-lg mb-3" style={{ background: 'var(--info-soft)', border: '1px solid rgba(8,145,178,0.15)' }}>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--info)' }}>What's in the image</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{ai.imageDescription}</p>
              </div>
            )}

            {/* Suggested name */}
            {ai.suggestedName && (
              <button
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all hover:opacity-80"
                style={{ background: 'var(--accent-soft)', border: '1px solid transparent' }}
                onClick={copySuggestedName}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Suggested filename</p>
                  <p className="text-xs font-mono font-medium truncate" style={{ color: 'var(--accent)' }}>{ai.suggestedName}</p>
                </div>
                {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} style={{ color: 'var(--text-4)' }} />}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.p key="empty" className="text-sm" style={{ color: 'var(--text-4)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            AI summary will appear after upload.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
