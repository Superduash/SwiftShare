import React from 'react'
import { Sparkles } from 'lucide-react'

export default function AISummaryCard({ ai, loading = false }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={15} style={{ color: '#818CF8' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Summary</h3>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Analyzing files...</p>
      ) : ai ? (
        <>
          {ai.category ? (
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Category: <span style={{ color: 'var(--text-2)' }}>{ai.category}</span></p>
          ) : null}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{ai.summary || 'No summary available yet.'}</p>
          {ai.imageDescription ? (
            <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>Visual: <span style={{ color: 'var(--text-2)' }}>{ai.imageDescription}</span></p>
          ) : null}
          {ai.suggestedName ? (
            <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>Suggested name: <span style={{ color: 'var(--text-2)' }}>{ai.suggestedName}</span></p>
          ) : null}
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>AI summary will appear here.</p>
      )}
    </div>
  )
}
