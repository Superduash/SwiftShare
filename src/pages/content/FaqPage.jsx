import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { HelpCircle, ChevronRight } from 'lucide-react'

export default function FaqPage() {
  const faqs = [
    {
      q: 'What are the file size and transfer limits?',
      a: 'You can upload up to 10 files per transfer with a combined total size of up to 100 MB. In text mode, snippets up to 256 KB are supported.'
    },
    {
      q: 'How long do files stay available?',
      a: 'You can choose between 10 minutes, 1 hour, or 5 hours. If Burn Mode is enabled, the transfer is permanently deleted immediately after the first successful download.'
    },
    {
      q: 'Do I or the recipient need an account?',
      a: 'No. SwiftShare requires zero registration, no passwords to register, and no email addresses. Just drop your file, share the 6-digit code or QR code, and download.'
    },
    {
      q: 'How does nearby device sharing work?',
      a: 'When two or more devices are connected to the same local Wi-Fi or office network subnet, active transfers with nearby sharing enabled are visible on the Receive page for one-click downloading.'
    },
    {
      q: 'Is SwiftShare completely free?',
      a: 'Yes, SwiftShare is 100% free to use for temporary file sharing within the stated 100 MB limit.'
    },
    {
      q: 'What happens if I enter the wrong password too many times?',
      a: 'SwiftShare enforces a 5-attempt security limit. After 5 incorrect password submissions, progressive exponential backoff locks further attempts to prevent automated brute-force attacks.'
    },
    {
      q: 'Are any file types blocked?',
      a: 'Yes. To protect users from malicious payloads, common executable extensions (.exe, .bat, .cmd, .scr, .vbs) are blocked by the upload filter.'
    }
  ]

  return (
    <ContentPageLayout
      title="Frequently Asked Questions"
      seoTitle="Frequently Asked Questions — SwiftShare"
      description="Find clear, honest answers regarding file limits, expiration, privacy, device compatibility, and download mechanics on SwiftShare."
      badge="FAQ & Help"
    >
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <details
            key={idx}
            className="group p-4 sm:p-5 rounded-xl border transition-colors open:bg-opacity-50"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          >
            <summary className="font-bold text-sm sm:text-base cursor-pointer flex items-center justify-between list-none" style={{ color: 'var(--text)' }}>
              <span>{faq.q}</span>
              <span className="text-xs ml-2 text-gray-400 group-open:rotate-90 transition-transform">▸</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed border-t pt-3" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </ContentPageLayout>
  )
}
