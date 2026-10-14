import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ContentPageLayout from '../../components/ContentPageLayout'
import {
  ClipboardCopy,
  Smartphone,
  Monitor,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  QrCode,
  Flame,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react'

export default function OnlineClipboardPage() {
  return (
    <ContentPageLayout
      title="Free Online Clipboard & Text Sync"
      seoTitle="Online Clipboard — Copy & Paste Text Across Phone, PC & Mac | SwiftShare"
      description="Free online clipboard to copy and paste text, links, notes, and credentials across devices without sign-up, apps, or accounts. Instant 6-digit sync."
      badge="Universal Web Clipboard"
    >
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Copy &amp; Paste Text Between Any Phone, PC, or Mac Instantly
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Have you ever needed to move a 2FA authentication token, a long website link, a complex Wi-Fi password, or a quick note from your phone to your computer? Emailing yourself or pasting into chat apps is slow, clutters message threads, and creates security risks. SwiftShare acts as your <strong>instant online clipboard</strong>—free, browser-based, and zero signup.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Simply paste your text, receive a standard <strong>6-digit code</strong> or QR code, open SwiftShare on the other device, and your clipboard text is copied with a single tap.
        </p>
      </motion.section>

      {/* Interactive Quick Launch CTA */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all"
        style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}
      >
        <div className="text-center sm:text-left">
          <h3 className="font-bold text-sm sm:text-base" style={{ color: 'var(--text)' }}>
            Launch the Online Clipboard
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            Paste text on one device, retrieve it on another with a 6-digit code.
          </p>
        </div>
        <Link
          to="/?action=text"
          className="btn-primary w-full sm:w-auto py-2.5 px-5 text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Zap size={16} />
          <span>Open Online Clipboard</span>
          <ArrowRight size={14} />
        </Link>
      </motion.div>

      {/* 3 Step Walkthrough */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="space-y-4 pt-2"
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          How to Use the Online Clipboard in 3 Simple Steps
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Paste Your Text',
              desc: 'Click "Share Text" on the homepage, paste your note, URL, or credentials into the clipboard editor, and click Share.'
            },
            {
              step: '2',
              title: 'Get 6-Digit Code or QR',
              desc: 'SwiftShare generates a quick 6-digit transfer code (e.g. 482 910) and an instant QR code you can scan with a mobile camera.'
            },
            {
              step: '3',
              title: 'Receive & Auto-Copy',
              desc: 'On the target device, enter the 6 digits or scan the QR. Tap "Copy to Clipboard" and your text is ready to paste anywhere.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border relative flex flex-col justify-between"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <div>
                <span
                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold mb-3"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  {item.step}
                </span>
                <h4 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>{item.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[
          {
            icon: ClipboardCopy,
            color: 'var(--accent)',
            title: 'Universal Device Sync',
            desc: 'Works seamlessly across iOS Safari, Android Chrome, Windows, macOS, and Linux without installing third-party apps.'
          },
          {
            icon: Clock,
            color: 'var(--accent)',
            title: 'Auto-Expiring Sessions',
            desc: 'Transfers expire automatically after 10m, 1h, or 24h. Once expired, notes are permanently purged from server memory.'
          },
          {
            icon: Flame,
            color: 'var(--danger)',
            title: 'Burn After Copy',
            desc: 'Enable Burn Mode for passwords, tokens, or private secrets so the transfer is erased forever as soon as the recipient copies it.'
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className="p-5 rounded-2xl border transition-all duration-200 hover:border-[var(--accent)]"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm"
              style={{ background: 'var(--accent-soft)', color: item.color }}
            >
              <item.icon size={20} />
            </div>
            <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>{item.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Use Cases Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-4 pt-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          Popular Online Clipboard Use Cases
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {[
            {
              icon: Smartphone,
              title: 'Mobile to Computer Link Sharing',
              desc: 'Read an interesting article or found a product on your phone? Send the link to your PC browser in seconds.'
            },
            {
              icon: Monitor,
              title: 'PC to Phone Credentials',
              desc: 'Move complex passwords, two-factor backup keys, or recovery phrases to your mobile device without typo errors.'
            },
            {
              icon: Lock,
              title: 'Password-Protected Text',
              desc: 'Optionally lock sensitive clipboard notes with a custom passphrase hashed with bcrypt on the server.'
            },
            {
              icon: Globe,
              title: 'No App Installs or Extensions',
              desc: 'No account registration, no background telemetry, and zero extensions to keep your browser fast and private.'
            }
          ].map((card, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2, borderColor: 'var(--accent)' }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border flex items-start gap-3 transition-all"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <card.icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--accent)]" />
              <div>
                <strong className="text-[var(--text)] block mb-0.5">{card.title}</strong>
                <span className="text-[var(--text-2)] leading-relaxed">{card.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Internal Navigation Links */}
      <section className="pt-4 border-t text-xs space-y-2" style={{ borderColor: 'var(--border)' }}>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>Related Tools &amp; Guides:</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/share-text-and-code-snippets" className="px-3 py-1.5 rounded-lg border text-[var(--accent)] hover:border-[var(--accent)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            Code Snippet Pastebin →
          </Link>
          <Link to="/share-files-with-qr-code" className="px-3 py-1.5 rounded-lg border text-[var(--text-2)] hover:text-[var(--text)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            QR Code File Sharing
          </Link>
          <Link to="/how-it-works" className="px-3 py-1.5 rounded-lg border text-[var(--text-2)] hover:text-[var(--text)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            How SwiftShare Works
          </Link>
          <Link to="/join" className="px-3 py-1.5 rounded-lg border text-[var(--text-2)] hover:text-[var(--text)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            Receive Text or Files
          </Link>
        </div>
      </section>
    </ContentPageLayout>
  )
}
