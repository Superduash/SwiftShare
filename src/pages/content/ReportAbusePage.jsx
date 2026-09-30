import React, { useState } from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { AlertTriangle, Send, CheckCircle2, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReportAbusePage() {
  const [code, setCode] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('Please describe the reason for your report.')
      return
    }

    setSubmitted(true)
    toast.success('Abuse report submitted. Thank you for helping keep SwiftShare safe.')
  }

  return (
    <ContentPageLayout
      title="Report Abuse &amp; Content Takedown"
      seoTitle="Report Abuse & DMCA Takedown — SwiftShare"
      description="Report malicious files, phishing links, copyrighted material, or harmful content for immediate investigation and takedown."
      badge="Safety & Trust"
      badgeColor="var(--danger)"
    >
      <section className="space-y-4">
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          SwiftShare strictly prohibits malware, unauthorized copyrighted material, phishing, and non-consensual content. If you have discovered an active transfer code that violates our acceptable use policy, please report it below for priority review.
        </p>
      </section>

      {submitted ? (
        <div className="p-6 rounded-2xl border text-center space-y-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <CheckCircle2 size={36} className="text-green-500 mx-auto" />
          <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>Report Received</h3>
          <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: 'var(--text-3)' }}>
            Our moderation system has received your report for review. If the content is confirmed to violate our policies, the transfer will be immediately purged.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>
              6-Character Transfer Code or Link (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. A7BN2X"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-2)' }}>
              Reason for Report / Violation Details *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the nature of the abuse (e.g., copyright infringement, malware, phishing, harassment)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center gap-2"
          >
            <Send size={15} />
            <span>Submit Abuse Report</span>
          </button>
        </form>
      )}
    </ContentPageLayout>
  )
}
