import React from 'react'
import { motion } from 'framer-motion'
import ContentPageLayout from '../../components/ContentPageLayout'
import { Upload, Key, Download, Flame, Lock, QrCode, Shield, Clock } from 'lucide-react'

export default function HowItWorksPage() {
  return (
    <ContentPageLayout
      title="How SwiftShare Works"
      seoTitle="How SwiftShare Works — Step-by-Step File & Text Sharing"
      description="Transfer files and text securely across phones, laptops, and tablets using short 6-digit codes and instant QR scans without creating an account."
      badge="Step-by-Step Guide"
    >
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          The 3-Step Sharing Process
        </h2>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4 }}
            className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Upload size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>1. Select &amp; Configure</h3>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Drag and drop up to 10 files (100 MB total) or paste text snippets up to 256 KB. Choose an expiration timer (10m, 1h, 5h) and optional password protection.
            </p>
          </motion.div>

          <motion.div 
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4 }}
            className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Key size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>2. Share Code or QR</h3>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              SwiftShare generates a unique 6-character transfer code and scannable QR code. Share the code or display the QR code for nearby camera scans.
            </p>
          </motion.div>

          <motion.div 
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4 }}
            className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Download size={20} />
            </div>
            <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>3. Download the File</h3>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
              The recipient opens SwiftShare on any browser, enters the 6-character code, and downloads the file directly at the available transfer speed.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section className="space-y-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Transfer Modes &amp; Privacy Safeguards
        </h2>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }} className="p-4 rounded-xl border flex items-start gap-3.5 surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Flame className="shrink-0 mt-0.5" size={20} style={{ color: 'var(--danger)' }} />
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>Burn-After-Download Mode</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                When enabled, the transfer is permanently deleted from storage the moment the recipient completes their download. Single-use access prevents unauthorized re-downloads.
              </p>
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }} className="p-4 rounded-xl border flex items-start gap-3.5 surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Lock className="shrink-0 mt-0.5" size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>Password Protection</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Set a custom passphrase for sensitive transfers. Passwords are securely hashed with bcrypt server-side, with rate limiting to prevent brute-force attempts.
              </p>
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }} className="p-4 rounded-xl border flex items-start gap-3.5 surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Clock className="shrink-0 mt-0.5" size={20} style={{ color: 'var(--warning)' }} />
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>Automated Expiration</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Every transfer has a strict expiration window. Once the countdown timer ends, files and metadata are automatically purged from the backend.
              </p>
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }} className="p-4 rounded-xl border flex items-start gap-3.5 surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Shield className="shrink-0 mt-0.5" size={20} style={{ color: 'var(--success)' }} />
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>TLS 1.3 Transport Encryption</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                All traffic between your browser and our servers is encrypted in transit using modern TLS 1.3 encryption, protecting uploads from eavesdropping.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Supported File Types &amp; Sizes
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          SwiftShare supports all standard media, documents, images, audio files, videos, archives (ZIP, TAR, 7Z), and code snippets. To protect users, dangerous executable formats (.exe, .bat, .cmd, .scr, .vbs) are automatically blocked.
        </p>
      </section>
    </ContentPageLayout>
  )
}
