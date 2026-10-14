import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { FileCode, Copy, Terminal, Shield, Zap, Sparkles, Smartphone, Monitor, Globe, CheckCircle2 } from 'lucide-react'

export default function SnippetSharePage() {
  return (
    <ContentPageLayout
      title="Free Online Clipboard & Text Sharing"
      seoTitle="Online Clipboard & Snippet Share — Sync Text Across Devices (No Sign-Up)"
      description="The fastest free online clipboard to copy and paste text, code, notes, and links between your phone, PC, and Mac instantly. No accounts, zero app installs, and auto-expiring privacy."
      badge="Free Online Clipboard"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          The Fastest Online Clipboard for Phone, PC &amp; Mac
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Need to copy a 2FA authentication code, long URL, Wi-Fi password, SSH public key, or terminal snippet from your laptop to your smartphone without emailing yourself or pasting it into noisy chat channels? SwiftShare functions as a private, cross-device <strong>online clipboard</strong> that connects your devices instantly.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Simply paste or type your text into the <strong>Share Text</strong> tab, grab the generated 6-digit code or scan the QR code with your phone camera, and click <strong>Copy to Clipboard</strong> on the other device.
        </p>
      </section>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Copy size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Seamless Online Clipboard</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            True universal clipboard functionality across Android, iOS, Windows, macOS, and Linux right in your web browser.
          </p>
        </div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Terminal size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Up to 256 KB Capacity</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Generous capacity for extensive logs, JSON configs, Markdown documents, and source code files with monospace display.
          </p>
        </div>

        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--danger)' }}>
            <Shield size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Self-Destructing Snippets</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Enable Burn Mode so sensitive credentials, passwords, or tokens vanish from the servers forever once copied.
          </p>
        </div>
      </div>

      {/* Common Use Cases Section */}
      <section className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
          Why Use an Online Clipboard?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="p-4 rounded-xl border flex items-start gap-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Smartphone className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--accent)]" />
            <div>
              <strong className="text-[var(--text)] block mb-0.5">Phone to PC Copy &amp; Paste</strong>
              <span className="text-[var(--text-2)] leading-relaxed">Copy SMS verification codes, links, or address details from your mobile browser and instantly paste them on your workstation.</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border flex items-start gap-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Monitor className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--accent)]" />
            <div>
              <strong className="text-[var(--text)] block mb-0.5">PC to Phone Code Transfer</strong>
              <span className="text-[var(--text-2)] leading-relaxed">Send complex commands, passwords, or authentication keys to your phone without typing them manually on a touch keyboard.</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border flex items-start gap-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Globe className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--accent)]" />
            <div>
              <strong className="text-[var(--text)] block mb-0.5">Zero Registration Required</strong>
              <span className="text-[var(--text-2)] leading-relaxed">No need to create an account, verify an email, or install browser extensions. It works on any device with a browser.</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border flex items-start gap-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--accent)]" />
            <div>
              <strong className="text-[var(--text)] block mb-0.5">Editable Snippets</strong>
              <span className="text-[var(--text-2)] leading-relaxed">Directly edit, modify, or format your text snippet before generating your transfer code.</span>
            </div>
          </div>
        </div>
      </section>
    </ContentPageLayout>
  )
}
