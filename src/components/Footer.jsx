import React from 'react'
import { Link } from 'react-router-dom'
import { Zap, Shield, Lock, Flame, QrCode, FileText, HelpCircle, AlertTriangle, Github, Linkedin, Twitter, Mail } from 'lucide-react'

const SOCIAL_LINKS = [
  { icon: Github, href: 'https://github.com/Superduash', label: 'GitHub profile', external: true },
  { icon: Linkedin, href: 'https://www.linkedin.com/in/ashwin-a-943114320', label: 'LinkedIn profile', external: true },
  { icon: Twitter, href: 'https://x.com/superduash', label: 'X / Twitter profile', external: true },
  { icon: Mail, href: 'mailto:contact@swiftshare.io', label: 'Email support', external: false },
]

export default function Footer() {
  return (
    <footer className="w-full mt-10 sm:mt-14 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Col 1: Brand & Summary */}
          <div className="md:col-span-1 space-y-3.5">
            <div className="flex items-center gap-2">
              <Link to="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <Zap size={16} className="text-white" />
                </div>
                <span>SwiftShare</span>
              </Link>
              <Link
                to="/changelog"
                title="View product changelog"
                className="text-[10px] font-mono font-medium opacity-60 hover:opacity-100 hover:text-[var(--accent)] hover:underline transition-all"
              >
                v{import.meta.env.PACKAGE_VERSION || '0.8.0'}
              </Link>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Zero-login file and text transfer platform. Share securely across devices with 6-digit codes or QR scans.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              {SOCIAL_LINKS.map(({ icon: SocialIcon, href, label, external }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="p-1.5 rounded-lg transition-all hover:scale-110"
                  style={{ color: 'var(--text-3)', background: 'var(--bg-sunken)' }}
                >
                  <SocialIcon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Capabilities */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text-2)' }}>
              Core Features
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/how-it-works" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <Zap size={13} style={{ color: 'var(--accent)' }} />
                  <span>How It Works</span>
                </Link>
              </li>
              <li>
                <Link to="/send-files-without-signup" className="hover:underline" style={{ color: 'var(--text-3)' }}>
                  Send Without Sign-Up
                </Link>
              </li>
              <li>
                <Link to="/share-files-with-qr-code" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <QrCode size={13} style={{ color: 'var(--accent)' }} />
                  <span>QR Code Sharing</span>
                </Link>
              </li>
              <li>
                <Link to="/self-destructing-file-sharing" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <Flame size={13} style={{ color: 'var(--danger)' }} />
                  <span>Self-Destruct &amp; Burn Mode</span>
                </Link>
              </li>
              <li>
                <Link to="/password-protected-file-transfer" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <Lock size={13} style={{ color: 'var(--text-2)' }} />
                  <span>Password Protection</span>
                </Link>
              </li>
              <li>
                <Link to="/share-text-and-code-snippets" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <FileText size={13} style={{ color: 'var(--text-2)' }} />
                  <span>Text &amp; Code Snippets</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Compatibility & Trust */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text-2)' }}>
              Security &amp; Platforms
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/airdrop-alternative" className="hover:underline" style={{ color: 'var(--text-3)' }}>
                  AirDrop Alternative
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <Shield size={13} style={{ color: 'var(--success)' }} />
                  <span>Security Architecture</span>
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <HelpCircle size={13} style={{ color: 'var(--text-3)' }} />
                  <span>Frequently Asked Questions</span>
                </Link>
              </li>
              <li>
                <Link to="/join" className="hover:underline" style={{ color: 'var(--text-3)' }}>
                  Receive a File (Code / QR)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Safety & Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text-2)' }}>
              Privacy &amp; Safety
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/privacy" className="hover:underline" style={{ color: 'var(--text-3)' }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:underline" style={{ color: 'var(--text-3)' }}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/report-abuse" className="hover:underline flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                  <AlertTriangle size={13} />
                  <span>Report Abuse &amp; Takedown</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          <p>© {new Date().getFullYear()} SwiftShare. Free, temporary, private browser file sharing.</p>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <Link to="/changelog" className="hover:underline">Changelog</Link>
            <span>•</span>
            <Link to="/security" className="hover:underline">TLS 1.3</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">No Tracking</Link>
            <span>•</span>
            <Link to="/report-abuse" className="hover:underline">Abuse Report</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
