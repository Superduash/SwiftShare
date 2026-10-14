import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ContentPageLayout from '../../components/ContentPageLayout'
import { FileCode, Copy, Terminal, Shield, Zap, Sparkles, Smartphone, Monitor, Globe, CheckCircle2, ArrowRight } from 'lucide-react'

export default function SnippetSharePage() {
  return (
    <ContentPageLayout
      title="Free Online Clipboard & Text Sharing"
      seoTitle="Online Clipboard & Snippet Share — Sync Text Across Devices (No Sign-Up)"
      description="The fastest free online clipboard to copy and paste text, code, notes, and links between your phone, PC, and Mac instantly. No accounts, zero app installs, and auto-expiring privacy."
      badge="Free Online Clipboard"
    >
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          The Fastest Online Clipboard for Phone, PC &amp; Mac
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Need to copy a 2FA authentication code, long URL, Wi-Fi password, SSH public key, or terminal snippet from your laptop to your smartphone without emailing yourself or pasting it into noisy chat channels? SwiftShare functions as a private, cross-device <strong>online clipboard</strong> that connects your devices instantly.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Simply paste or type your text into the <strong>Share Text</strong> tab, grab the generated 6-digit code or scan the QR code with your phone camera, and click <strong>Copy to Clipboard</strong> on the other device.
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
            Ready to copy-paste between devices?
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            Paste text or code snippet now and get an instant 6-digit code.
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

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[
          {
            icon: Copy,
            color: 'var(--accent)',
            title: 'Seamless Online Clipboard',
            desc: 'True universal clipboard functionality across Android, iOS, Windows, macOS, and Linux right in your web browser.'
          },
          {
            icon: Terminal,
            color: 'var(--accent)',
            title: 'Up to 256 KB Capacity',
            desc: 'Generous capacity for extensive logs, JSON configs, Markdown documents, and source code files with monospace display.'
          },
          {
            icon: Shield,
            color: 'var(--danger)',
            title: 'Self-Destructing Snippets',
            desc: 'Enable Burn Mode so sensitive credentials, passwords, or tokens vanish from the servers forever once copied.'
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
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

      {/* Common Use Cases Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-4 pt-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          Why Use an Online Clipboard?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {[
            {
              icon: Smartphone,
              title: 'Phone to PC Copy & Paste',
              desc: 'Copy SMS verification codes, links, or address details from your mobile browser and instantly paste them on your workstation.'
            },
            {
              icon: Monitor,
              title: 'PC to Phone Code Transfer',
              desc: 'Send complex commands, passwords, or authentication keys to your phone without typing them manually on a touch keyboard.'
            },
            {
              icon: Globe,
              title: 'Zero Registration Required',
              desc: 'No need to create an account, verify an email, or install browser extensions. It works on any device with a browser.'
            },
            {
              icon: Zap,
              title: 'Editable Snippets',
              desc: 'Directly edit, modify, or format your text snippet before generating your transfer code.'
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
    </ContentPageLayout>
  )
}

