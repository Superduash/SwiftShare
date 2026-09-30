import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { Flame, Clock, Trash2, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react'

export default function SelfDestructPage() {
  return (
    <ContentPageLayout
      title="Self-Destructing File Sharing &amp; Burn Mode"
      seoTitle="Self-Destructing File Sharing — Auto-Expiring & Burn Mode"
      description="Send confidential files with automatic expiration countdown timers and Burn-After-Download mode. Files are permanently purged after retrieval."
      badge="Ephemeral Transfer"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          How Self-Destructing File Transfer Protects Privacy
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Leaving files indefinitely on cloud drives or messaging channels creates security risks and data leaks. SwiftShare enforces an ephemeral architecture: files only exist as long as necessary to complete the transfer, after which both the object storage files and database metadata are purged.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--danger)' }}>
            <Flame size={20} />
          </div>
          <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>Burn-After-Download Mode</h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            When Burn Mode is enabled, the transfer link is single-use. The instant the recipient finishes streaming or downloading the file, the server executes a deletion order across Cloudflare R2 and marks the transfer record claimed. Subsequent attempts immediately show an unavailable state.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--warning)' }}>
            <Clock size={20} />
          </div>
          <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>Time-Based Auto-Expiration</h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            You choose an expiration timer: <strong>10 minutes</strong> for urgent exchanges, <strong>1 hour</strong> for standard sharing, or <strong>5 hours</strong> for longer workflows. When the countdown reaches zero, background cleanup jobs automatically purge the file binaries.
          </p>
        </div>
      </div>

      <section className="space-y-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          What Gets Deleted Upon Expiration?
        </h2>
        <div className="p-5 rounded-xl border space-y-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-2)' }}>
              <strong>Binary Files in Storage:</strong> All uploaded files and chunks are deleted from Cloudflare R2 object storage.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-2)' }}>
              <strong>Sensitive Metadata:</strong> Password hashes, ownership authentication tokens, and QR data URIs are stripped from the database.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-2)' }}>
              <strong>Inline Text Snippets:</strong> Pasted text content is purged so expired snippets cannot be retrieved.
            </p>
          </div>
        </div>
      </section>
    </ContentPageLayout>
  )
}
