import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { UserX, ShieldCheck, Zap, HardDrive, Smartphone, Monitor } from 'lucide-react'

export default function NoSignupPage() {
  return (
    <ContentPageLayout
      title="Send Files Without Sign-Up or Registration"
      seoTitle="Send Files Without Sign-Up — Free, No Account File Transfer"
      description="Transfer files and text directly between web browsers without creating an account, giving your email, or downloading proprietary apps."
      badge="Zero-Login Sharing"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Why Zero-Login File Sharing Matters
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Most cloud storage providers require creating an account, verifying an email address, or installing proprietary desktop clients just to send a single document or photo. SwiftShare removes all onboarding friction: you open the website, choose your file, and immediately get a temporary transfer link and 6-character code.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <UserX size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>No Personal Data Required</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            We do not ask for names, phone numbers, email addresses, or social logins. Your files are not associated with any persistent user profile.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Zap size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Immediate Link Creation</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Uploads begin streaming immediately. The 6-digit code and QR code are available the second your upload finishes, ready to share via message or scan.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <HardDrive size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Temporary Cloud Storage</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Uploaded files reside in high-speed, temporary object storage only until the expiration countdown completes or until claimed via Burn Mode.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Smartphone size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Cross-Platform Anywhere</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Works in Chrome, Safari, Firefox, Edge, and mobile browsers on iOS, Android, macOS, Windows, and Linux without native software installation.
          </p>
        </div>
      </div>

      <section className="space-y-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Transparent Platform Specifications
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm" style={{ color: 'var(--text-2)' }}>
          <li><strong>Upload Limit:</strong> Up to 10 files per transfer, with a total maximum size of 100 MB.</li>
          <li><strong>Text Snippets:</strong> Formatted plain text, Markdown, or code snippets up to 256 KB.</li>
          <li><strong>Expiration:</strong> Choose between 10 minutes, 1 hour, or 5 hours.</li>
          <li><strong>Privacy:</strong> DNT / GPC signals are honored; IP addresses are masked in logs.</li>
        </ul>
      </section>
    </ContentPageLayout>
  )
}
