import React, { useEffect, useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, FileText, Image, Video, FileArchive,
  Music, BookOpen, Code, Presentation, Table2, AlertTriangle, Target, Copy, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_ICONS = {
  document: FileText, image: Image, video: Video, archive: FileArchive,
  audio: Music, ebook: BookOpen, code: Code, presentation: Presentation,
  spreadsheet: Table2, media: Video, mixed: FileArchive, default: FileText,
}

function getCategoryIcon(cat) {
  if (!cat) return CATEGORY_ICONS.default
  const key = cat.toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v
  }
  return CATEGORY_ICONS.default
}

const BANNED_PHRASES_RE = /\b(this file contains|this file is a|appears to be|analyzed using|purpose inferred|cannot extract|cannot be previewed|binary content|image containing readable text|files centered on|code focused on application logic|captured text reads|media shared for media sharing|context derived from|in summary|to summarize|overall,?)\b/gi

function cleanSummary(text) {
  return String(text || '')
    .replace(BANNED_PHRASES_RE, '')
    .replace(/\b(mime|format|extension|file size)\b\s*[:\-]?/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*(kb|mb|gb|bytes?)\b/gi, '')
    .replace(/\bmetadata\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:]+/, '')
    .trim()
}

function cleanKeyPoints(points) {
  if (!Array.isArray(points)) return []

  return points
    .map((point) => cleanSummary(point))
    .filter((point) => point.length > 2)
    .filter((point) => !/^(pdf|image|video|audio|zip|txt|csv|docx?)\s*format$/i.test(point))
}

function AISummaryCard({ ai, loading = false }) {
  const [showFiles, setShowFiles] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const activeAi = ai

  const CatIcon = activeAi?.category ? getCategoryIcon(activeAi.category) : Sparkles
  const summary = cleanSummary(activeAi?.summary || activeAi?.overall_summary)
  const detectedIntent = activeAi?.detectedIntent || activeAi?.detected_intent
  const riskFlags = activeAi?.riskFlags || activeAi?.risk_flags || []
  const fileAnalysis = (activeAi?.files || []).map((file) => ({
    ...file,
    summary: cleanSummary(file?.summary),
    key_points: cleanKeyPoints(file?.key_points),
  }))
  // AI result with only a warning and no summary means the service was unavailable
  const isAiUnavailable = activeAi && !summary && !activeAi.category && Boolean(activeAi.warning)
  
  // Extract model name — show clean short label, no "Powered by AI" fallback
  const model = activeAi?.model
  const provider = activeAi?.provider
  const modelDisplay = (() => {
    if (!model) return provider || null
    // Strip org prefix for OpenRouter models (e.g. "meta-llama/llama-3.3-70b-versatile" → "llama-3.3-70b-versatile")
    const shortModel = model.includes('/') ? model.split('/').pop() : model
    // Strip ":free" suffix
    return shortModel.replace(/:free$/, '')
  })()

  useEffect(() => {
    if (!loading) {
      setTimedOut(false)
      return undefined
    }

    const timer = setTimeout(() => setTimedOut(true), 25000)
    return () => clearTimeout(timer)
  }, [loading])

  const handleCopySummary = useCallback(async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      toast.success('Summary copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }, [summary])

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
            <Sparkles size={14} style={{ color: 'var(--ai-icon)' }} aria-hidden="true" />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>AI Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {summary && !loading && (
            <button
              className="btn-icon !w-6 !h-6"
              onClick={handleCopySummary}
              title="Copy summary"
              aria-label="Copy AI summary"
            >
              {copied
                ? <Check size={12} style={{ color: 'var(--success)' }} />
                : <Copy size={12} style={{ color: 'var(--text-4)' }} />
              }
            </button>
          )}
          {modelDisplay && (
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full font-medium" 
              style={{ background: 'var(--accent-soft)', color: 'var(--text-3)' }}
              title={`${provider ? provider + ' · ' : ''}${model || ''}`}
            >
              {modelDisplay}
            </span>
          )}
        </div>
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
            {timedOut && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                Taking longer than usual... still working.
              </p>
            )}
          </motion.div>
        ) : activeAi ? (
          <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Category + Intent */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {activeAi.category && (
                <div className="badge">
                  <CatIcon size={12} aria-hidden="true" />
                  {activeAi.category}
                </div>
              )}
              {detectedIntent && (
                <div className="badge" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
                  <Target size={12} aria-hidden="true" />
                  {detectedIntent}
                </div>
              )}
            </div>

            {/* Summary */}
            {summary ? (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
                {summary}
              </p>
            ) : isAiUnavailable ? (
              <p className="text-sm leading-relaxed mb-3 italic" style={{ color: 'var(--text-4)' }}>
                AI summary currently unavailable.
              </p>
            ) : (
              <p className="text-sm leading-relaxed mb-3 italic" style={{ color: 'var(--text-4)' }}>
                AI analysis completed but no summary was generated.
              </p>
            )}

            {/* Risk flags */}
            {riskFlags.length > 0 && (
              <div className="p-2.5 rounded-lg mb-3" style={{ background: 'var(--warning-soft)', border: '1px solid rgba(217,119,6,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} style={{ color: 'var(--warning)' }} aria-hidden="true" />
                  <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Risk flags</p>
                </div>
                <ul className="text-xs space-y-0.5" style={{ color: 'var(--text-2)' }}>
                  {riskFlags.map((flag, i) => (
                    <li key={i}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Image description */}
            {activeAi.imageDescription && (
              <div className="p-2.5 rounded-lg mb-3" style={{ background: 'var(--info-soft)', border: '1px solid rgba(8,145,178,0.15)' }}>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--info)' }}>What's in the image</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{activeAi.imageDescription}</p>
              </div>
            )}

            {/* Per-file analysis */}
            {fileAnalysis.length > 0 && (
              <div className="mb-3">
                <button
                  className="text-xs font-semibold flex items-center gap-1 mb-2"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => setShowFiles(!showFiles)}
                  aria-expanded={showFiles}
                >
                  <FileText size={12} aria-hidden="true" />
                  {showFiles ? 'Hide' : 'Show'} per-file analysis ({fileAnalysis.length})
                </button>
                <AnimatePresence>
                  {showFiles && (
                    <motion.div
                      className="space-y-1.5"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {fileAnalysis.map((f, i) => (
                        <div key={i} className="p-2 rounded-lg" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{f.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{f.summary || 'No summary available.'}</p>
                          {f.key_points && f.key_points.length > 0 && (
                            <ul className="text-[10px] mt-1 space-y-0.5" style={{ color: 'var(--text-4)' }}>
                              {f.key_points.map((point, pi) => (
                                <li key={pi}>• {point}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm" style={{ color: 'var(--text-4)' }}>
              AI summary will appear after upload.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default memo(AISummaryCard)