import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import ContentPageLayout from '../../components/ContentPageLayout'
import { FileCode, Terminal, Shield, Zap, Sparkles, Smartphone, Monitor, Globe, CheckCircle2, ArrowRight, Code2 } from 'lucide-react'

export default function SnippetSharePage() {
  return (
    <ContentPageLayout
      title="Share Code Snippets & Text Online"
      seoTitle="Share Code Snippets & Text Online — Free Temporary Pastebin | SwiftShare"
      description="Share code snippets, terminal commands, config files, and JSON with developers instantly. Syntax-friendly display, auto-expiry, and no registration required."
      badge="Developer Pastebin"
    >
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Lightweight, No-Signup Pastebin for Developers &amp; Teams
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Need to quickly send a terminal output log, a Docker configuration snippet, a SQL migration script, or a JSON payload to a colleague or another workstation? SwiftShare provides a distraction-free, ephemeral <strong>developer pastebin</strong> that requires no accounts, no logins, and leaves no permanent digital footprint.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Simply paste your code into the <strong>Share Text</strong> panel, choose an expiration timer (from 10 minutes to 24 hours), and share the generated 6-digit code or QR. Recipients can view the formatted snippet with monospace rendering and copy it in one click.
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
            Share a code snippet now
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            Supports JSON, YAML, Shell scripts, Python, SQL, and logs up to 256 KB.
          </p>
        </div>
        <Link
          to="/?action=text"
          className="btn-primary w-full sm:w-auto py-2.5 px-5 text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Code2 size={16} />
          <span>Share Code Snippet</span>
          <ArrowRight size={14} />
        </Link>
      </motion.div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {[
          {
            icon: Terminal,
            color: 'var(--accent)',
            title: 'Monospace Code Viewer',
            desc: 'Receiver views your snippet with clear monospace typography, line wrapping, character counts, and quick copy actions.'
          },
          {
            icon: FileCode,
            color: 'var(--accent)',
            title: 'Generous 256 KB Limit',
            desc: 'Ample capacity for extensive log files, stack traces, schema dumps, Markdown notes, and multi-file configs.'
          },
          {
            icon: Shield,
            color: 'var(--danger)',
            title: 'Burn Mode for Secrets',
            desc: 'Sharing API keys, staging tokens, or environment variables? Enable Burn Mode to permanently delete the snippet upon viewing.'
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

      {/* Developer Scenarios */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-4 pt-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          Common Developer Workflows
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {[
            {
              icon: Terminal,
              title: 'Terminal & CLI Logs',
              desc: 'Share build failures, stack traces, and console outputs with teammates without messing up Slack or Discord markdown.'
            },
            {
              icon: Monitor,
              title: 'Server Configuration Sync',
              desc: 'Move NGINX configs, SSH public keys, or environment files to remote servers or dev machines in one step.'
            },
            {
              icon: Globe,
              title: 'Zero Account Overhead',
              desc: 'No GitHub or GitLab authentication needed. Ideal for quick pair debugging and guest contributors.'
            },
            {
              icon: Zap,
              title: 'Direct Text Editing',
              desc: 'Adjust or redact sensitive strings directly in the browser editor before creating the transfer code.'
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

      {/* Related Tools */}
      <section className="pt-4 border-t text-xs space-y-2" style={{ borderColor: 'var(--border)' }}>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>Related Tools &amp; Guides:</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/online-clipboard" className="px-3 py-1.5 rounded-lg border text-[var(--accent)] hover:border-[var(--accent)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            Universal Online Clipboard →
          </Link>
          <Link to="/how-it-works" className="px-3 py-1.5 rounded-lg border text-[var(--text-2)] hover:text-[var(--text)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            How SwiftShare Works
          </Link>
          <Link to="/security" className="px-3 py-1.5 rounded-lg border text-[var(--text-2)] hover:text-[var(--text)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            Security &amp; Encryption
          </Link>
          <Link to="/send-files-without-signup" className="px-3 py-1.5 rounded-lg border text-[var(--text-2)] hover:text-[var(--text)] transition-colors" style={{ borderColor: 'var(--border)' }}>
            Send Files Without Sign-Up
          </Link>
        </div>
      </section>
    </ContentPageLayout>
  )
}
