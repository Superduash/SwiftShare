import React from 'react'
import { motion } from 'framer-motion'
import ContentPageLayout from '../../components/ContentPageLayout'
import { ShieldCheck, Lock, Key, Clock, Ban, Server, AlertTriangle } from 'lucide-react'

export default function SecurityPage() {
  return (
    <ContentPageLayout
      title="Security &amp; Architecture Overview"
      seoTitle="Security Architecture & Trust — SwiftShare"
      description="Transparent security practices: TLS 1.3 in-transit encryption, bcrypt password protection, signed download tokens, blocked file types, and automated R2 deletion."
      badge="Technical Transparency"
      badgeColor="var(--success)"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Our Security Principles
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          SwiftShare is engineered around the principle of minimal data retention. We provide an honest technical breakdown of what protections are active, how files are handled, and what limits exist.
        </p>
      </section>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4 }} className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--success)' }}>
            <ShieldCheck size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>TLS 1.3 In-Transit Encryption</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            All transfers are transmitted exclusively over HTTPS using TLS 1.3, protecting data from eavesdropping and man-in-the-middle inspection during transit.
          </p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4 }} className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Lock size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Bcrypt Password Hashing</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            When a transfer is password-protected, the password is securely hashed with bcrypt using salted rounds on our backend. Passwords are never logged or stored in plaintext.
          </p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4 }} className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Key size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>HMAC-Signed Download Tokens</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            File downloads require short-lived HMAC-signed tokens to ensure only authorized clients can trigger object streaming from Cloudflare R2.
          </p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4 }} className="p-5 rounded-xl border surface-card-flat" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--danger)' }}>
            <Ban size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Malicious Executable Filtering</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Uploads of executable formats (.exe, .bat, .cmd, .scr, .vbs, .pif) are blocked by default to prevent distribution of malware and phishing payloads.
          </p>
        </motion.div>
      </motion.div>

      <section className="space-y-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Important Security Boundaries (Honest Disclosure)
        </h2>
        <div className="p-5 rounded-xl border space-y-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text)' }}>Not Client-Side End-to-End Encrypted</h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Files are stored temporarily on server-side Cloudflare R2 object storage during the transfer window and delivered over TLS 1.3 HTTPS. While encrypted in transit, files are not encrypted with client-side Zero-Knowledge keys. Do not upload classified or unlawful materials.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <Clock size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text)' }}>Strict Auto-Purging</h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Files are automatically and irreversibly deleted from Cloudflare R2 when the timer expires or when claimed via Burn Mode.
              </p>
            </div>
          </div>
        </div>
      </section>
    </ContentPageLayout>
  )
}
