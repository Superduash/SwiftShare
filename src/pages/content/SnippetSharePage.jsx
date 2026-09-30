import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { FileCode, Copy, Terminal, Shield, Zap, Sparkles } from 'lucide-react'

export default function SnippetSharePage() {
  return (
    <ContentPageLayout
      title="Share Text &amp; Code Snippets Instantly"
      seoTitle="Share Text & Code Snippets — Fast Temporary Pastebin"
      description="Share formatted text, code blocks, logs, API keys, and configurations up to 256 KB across devices with syntax-ready display and auto-destruction."
      badge="Instant Text & Pastebin"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Fast Cross-Device Text and Snippet Sharing
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Need to copy a 2FA code, SSH public key, terminal snippet, or Wi-Fi password from your laptop to your phone without pasting it into third-party chat apps? SwiftShare includes a dedicated text sharing mode designed for fast copy-pasting.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Terminal size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Up to 256 KB Capacity</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Plenty of room for large logs, JSON configs, Markdown documents, and source code files.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Copy size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>One-Click Copy</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Recipients get a dedicated &quot;Copy to Clipboard&quot; button and clean monospace formatting for instant use.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--danger)' }}>
            <Shield size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Auto-Burn Snippets</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Pair with Burn Mode so temporary passwords or secrets vanish forever the second the recipient views them.
          </p>
        </div>
      </div>
    </ContentPageLayout>
  )
}
