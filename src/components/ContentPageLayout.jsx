import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Zap, Download } from 'lucide-react'
import { useSeo } from '../hooks/useSeo'
import Footer from './Footer'

export default function ContentPageLayout({
  title,
  seoTitle,
  description,
  badge = 'Guide & Overview',
  badgeColor = 'var(--accent)',
  children,
}) {
  useSeo({
    title: seoTitle || title,
    description,
    noindex: false,
  })

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ background: 'var(--bg)' }}>
      <main className="app-main-offset flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          
          {/* Breadcrumb / Back Link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={13} />
              <span>Back to SwiftShare</span>
            </Link>
          </div>

          {/* Header */}
          <motion.header
            className="mb-10 text-left"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {badge && (
              <span
                className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3"
                style={{ background: 'var(--accent-soft)', color: badgeColor }}
              >
                {badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: 'var(--text)', lineHeight: 1.2 }}>
              {title}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed max-w-2xl" style={{ color: 'var(--text-2)' }}>
              {description}
            </p>
          </motion.header>

          {/* Main Content Body */}
          <motion.article
            className="space-y-8 text-sm sm:text-base leading-relaxed"
            style={{ color: 'var(--text)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            {children}

            {/* Quick Action CTA Banner */}
            <div
              className="mt-12 p-6 sm:p-8 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
                  Ready to send files instantly?
                </h3>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-3)' }}>
                  No accounts, no email, no app installs. Drop your file and get a 6-digit code.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/"
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-semibold"
                >
                  <Zap size={16} />
                  <span>Send Files Now</span>
                </Link>
                <Link
                  to="/join"
                  className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold"
                >
                  <Download size={16} />
                  <span>Receive</span>
                </Link>
              </div>
            </div>
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  )
}
