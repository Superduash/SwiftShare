import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ContentPageLayout from '../../components/ContentPageLayout'
import { HelpCircle, ChevronDown } from 'lucide-react'

export default function FaqPage() {
  const [openFaq, setOpenFaq] = useState(null)

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
      q: 'Can I use SwiftShare as an online clipboard to copy and paste between phone and PC?',
      a: 'Yes! SwiftShare is one of the fastest online clipboards available. Select the "Share Text" tab on your computer, paste your text, links, code, or notes, and scan the QR code or type the 6-digit code on your phone to copy it directly to your mobile clipboard. It works across any browser without installing apps or signing up.'
    },
    {
      q: 'Is SwiftShare completely free?',
      a: 'Yes, SwiftShare is 100% free to use for temporary file sharing and clipboard sync within the stated limits.'
    },
    {
      q: 'What happens if I enter the wrong password too many times?',
      a: 'SwiftShare enforces a 5-attempt security limit. After 5 incorrect password submissions, progressive exponential backoff locks further attempts to prevent automated brute-force attacks.'
    },
    {
      q: 'Are any file types blocked?',
      a: 'Yes. To protect users from malicious payloads, common executable extensions (.exe, .bat, .cmd, .scr, .vbs) are blocked by the upload filter.'
    },
    {
      q: 'Are files end-to-end encrypted on the client side?',
      a: 'All data is encrypted in transit using TLS 1.3 to protect against network interception, and passwords are salted and hashed with bcrypt. However, files are stored temporarily on Cloudflare R2 and are not client-side end-to-end (zero-knowledge) encrypted. For maximum privacy, files are automatically deleted upon expiry or first download in Burn Mode.'
    }
  ]

  return (
    <ContentPageLayout
      title="Frequently Asked Questions"
      seoTitle="Frequently Asked Questions — SwiftShare"
      description="Find clear, honest answers regarding file limits, expiration, privacy, device compatibility, and download mechanics on SwiftShare."
      badge="FAQ & Help"
    >
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openFaq === idx
          return (
            <div
              key={idx}
              className="rounded-2xl border transition-all duration-200 overflow-hidden"
              style={{
                background: isOpen ? 'var(--bg-elevated)' : 'var(--surface)',
                borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
                boxShadow: isOpen ? '0 4px 20px -2px var(--accent-soft)' : 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors"
                style={{ touchAction: 'manipulation' }}
                aria-expanded={isOpen}
              >
                <span className="font-bold text-sm sm:text-base leading-snug" style={{ color: 'var(--text)' }}>
                  {faq.q}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: isOpen ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                    color: isOpen ? 'var(--accent)' : 'var(--text-3)',
                  }}
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                      <p
                        className="text-xs sm:text-sm leading-relaxed pt-3 border-t"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </ContentPageLayout>
  )
}
