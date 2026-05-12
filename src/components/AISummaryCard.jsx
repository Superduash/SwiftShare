// frontend/src/components/AISummaryCard.jsx
//
// Clean smart-preview card.
//
// Renders (in order):
//   1. Header strip — "AI Analysis" badge + model name + copy button
//   2. Top tags row — semantic category pills with emoji icons (3–5 max)
//   3. Overall summary — one natural sentence, slightly larger text
//   4. Expandable per-file list — filename + one clean summary line
//
// REMOVED from previous versions:
//   - per-file tags (keyword dump)
//   - key_points (bullet noise)
//   - risk flags / detected intent / image description
//   - track/artist/album sections
//
// Backend contract (new aiAnalyzer.js):
//   ai = {
//     overallSummary, summary, overall_summary,   // any of these = the same thing
//     topTags: [{ key, label, icon }],
//     tags: ["📚 Notes", "🎬 Media"],              // legacy string form
//     files: [{ filename, name, summary }],
//     model, provider, _model, _provider,
//     warning?: "AI analysis unavailable",         // present if AI failed
//   }

import React, { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, FileText, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Tag pill (inline, no external dependency) ────────────────────────────────

function TagPill({ icon, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        border: '1px solid var(--accent-soft)',
        whiteSpace: 'nowrap',
      }}
    >
      {icon ? <span style={{ fontSize: '13px', lineHeight: 1 }}>{icon}</span> : null}
      <span>{label}</span>
    </span>
  )
}

// Accept either the new {icon, label} shape or the legacy "📚 Notes" string
// shape. Returns a uniform array of {icon, label} objects.
function normalizeTags(ai) {
  if (Array.isArray(ai?.topTags) && ai.topTags.length > 0) {
    return ai.topTags
      .map((t) => {
        if (t && typeof t === 'object') {
          return { icon: t.icon || '', label: String(t.label || '').trim() }
        }
        return parseLegacyTagString(String(t || ''))
      })
      .filter((t) => t && t.label)
  }
  if (Array.isArray(ai?.tags) && ai.tags.length > 0) {
    return ai.tags
      .map((t) => (t && typeof t === 'object'
        ? { icon: t.icon || '', label: String(t.label || '').trim() }
        : parseLegacyTagString(String(t || ''))))
      .filter((t) => t && t.label)
  }
  return []
}

// "📚 Notes" → { icon: "📚", label: "Notes" }
// Falls back to label-only if no leading emoji is present.
function parseLegacyTagString(s) {
  const trimmed = String(s || '').trim()
  if (!trimmed) return null
  // Match a leading non-word char cluster (emoji) followed by space + label
  const m = trimmed.match(/^([^\w\s][^\s]*)\s+(.+)$/)
  if (m) return { icon: m[1], label: m[2].trim() }
  return { icon: '', label: trimmed }
}

// ── Summary cleanup (safety net — backend already sanitizes) ─────────────────
// Strips a small set of leftover phrasings if any provider slips through.

const STRIP_PHRASES_RE = /\b(this file (?:contains|is)|appears to be|in summary,?|to summarize,?|overall,?)\b/gi

function cleanText(text) {
  return String(text || '')
    .replace(STRIP_PHRASES_RE, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:]+/, '')
    .trim()
}

// ── Main card ────────────────────────────────────────────────────────────────

function AISummaryCard({ ai, loading = false }) {
  const [showFiles, setShowFiles] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const summary = useMemo(
    () => cleanText(ai?.overallSummary || ai?.summary || ai?.overall_summary),
    [ai]
  )

  const tags = useMemo(() => normalizeTags(ai), [ai])

  const fileList = useMemo(() => {
    const raw = Array.isArray(ai?.files) ? ai.files : []
    return raw.map((f) => ({
      filename: f?.filename || f?.name || 'Untitled file',
      summary: cleanText(f?.summary),
    }))
  }, [ai])

  const modelLabel = ai?.model || ai?._model || ''
  const hasAi = Boolean(ai)
  const aiFailedSoftly = hasAi && !summary && Boolean(ai?.warning)
  const errorMessage = cleanText(ai?.warning || ai?.error)

  // "Still working..." after 10s of loading
  useEffect(() => {
    if (!loading) {
      setTimedOut(false)
      return undefined
    }
    const t = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(t)
  }, [loading])

  const handleCopy = useCallback(async () => {
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
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'var(--ai-bg)',
        border: '1px solid var(--ai-border)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="p-4 sm:p-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-soft)' }}
            >
              <Sparkles size={15} style={{ color: 'var(--ai-icon, var(--accent))' }} aria-hidden="true" />
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text)' }}>
              AI Analysis
            </span>
            {modelLabel && !loading && (
              <span
                className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  background: 'var(--bg-sunken)',
                  color: 'var(--text-4)',
                  border: '1px solid var(--border)',
                }}
              >
                {modelLabel}
              </span>
            )}
          </div>
          {summary && !loading && (
            <button
              className="btn-icon !w-7 !h-7"
              onClick={handleCopy}
              title="Copy summary"
              aria-label="Copy AI summary"
            >
              {copied
                ? <Check size={13} style={{ color: 'var(--success)' }} />
                : <Copy size={13} style={{ color: 'var(--text-4)' }} />}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex gap-2 mb-3">
                <div className="shimmer-block h-6 w-16 rounded-full" />
                <div className="shimmer-block h-6 w-20 rounded-full" />
                <div className="shimmer-block h-6 w-14 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="shimmer-block h-4 w-11/12" />
                <div className="shimmer-block h-4 w-3/4" />
              </div>
              <p
                className="text-xs mt-3 animate-pulse-soft"
                style={{ color: 'var(--text-4)' }}
              >
                Generating preview...
              </p>
              {timedOut && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
                  Taking longer than usual — still working.
                </p>
              )}
            </motion.div>
          ) : hasAi ? (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* ── Top tags (semantic, upload-level) ────────────────────── */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((t, i) => (
                    <TagPill key={`${t.label}-${i}`} icon={t.icon} label={t.label} />
                  ))}
                </div>
              )}

              {/* ── Overall summary ──────────────────────────────────────── */}
              {summary ? (
                <p
                  className="text-[15px] leading-relaxed"
                  style={{ color: 'var(--text-2)' }}
                >
                  {summary}
                </p>
              ) : aiFailedSoftly ? (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--danger-soft)',
                    border: '1px solid rgba(239,68,68,0.18)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                    AI summary unavailable
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    {errorMessage || 'AI analysis did not complete in time.'}
                  </p>
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: 'var(--text-4)' }}
                >
                  AI analysis completed but no summary was generated.
                </p>
              )}

              {/* ── Per-file expandable list ─────────────────────────────── */}
              {fileList.length > 0 && (
                <div className="mt-4">
                  <button
                    className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ color: 'var(--accent)' }}
                    onClick={() => setShowFiles((v) => !v)}
                    aria-expanded={showFiles}
                  >
                    <FileText size={12} aria-hidden="true" />
                    {showFiles ? 'Hide' : 'Show'} per-file preview ({fileList.length})
                    {showFiles
                      ? <ChevronUp size={12} aria-hidden="true" />
                      : <ChevronDown size={12} aria-hidden="true" />}
                  </button>
                  <AnimatePresence>
                    {showFiles && (
                      <motion.div
                        className="mt-2 space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                      >
                        {fileList.map((f, i) => (
                          <div
                            key={`${f.filename}-${i}`}
                            className="p-3 rounded-xl"
                            style={{
                              background: 'var(--bg-sunken)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: 'var(--text)' }}
                              title={f.filename}
                            >
                              {f.filename}
                            </p>
                            <p
                              className="text-[13px] mt-1 leading-relaxed"
                              style={{ color: 'var(--text-3)' }}
                            >
                              {f.summary || 'No preview available.'}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm" style={{ color: 'var(--text-4)' }}>
                AI summary will appear after upload.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default memo(AISummaryCard)
