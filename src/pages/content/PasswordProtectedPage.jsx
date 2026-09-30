import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { Lock, Shield, KeyRound, AlertOctagon, CheckCircle2 } from 'lucide-react'

export default function PasswordProtectedPage() {
  return (
    <ContentPageLayout
      title="Password-Protected File Transfer"
      seoTitle="Password-Protected File Transfer — Secure Link Sharing"
      description="Protect shared files with bcrypt-hashed passwords and progressive brute-force lockouts. Only recipients with the passphrase can access downloads."
      badge="Passphrase Protection"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          How SwiftShare Protects Password-Gated Transfers
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          When sharing sensitive contracts, credentials, or private photos, adding a custom password ensures that only individuals with the passphrase can decrypt and download the files, even if someone else intercepts the 6-digit code or link.
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <KeyRound size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Bcrypt Salted Hashing</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Passwords are never stored in plaintext. They are hashed using bcrypt with salt rounds on the backend before being verified.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--danger)' }}>
            <AlertOctagon size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>5-Attempt Lockout</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            To prevent automated brute-force password guessing, transfers enforce rate limiting. Entering 5 incorrect attempts triggers progressive exponential backoff.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Shield size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>HMAC-Signed Download Tokens</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Successful password verification generates a short-lived HMAC-signed download token. Download requests without this token are strictly rejected.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Lock size={18} />
          </div>
          <h3 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>Zero File Previews Without Password</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Filenames, thumbnails, and sizes are obscured on the download landing page until the valid password is provided.
          </p>
        </div>
      </div>
    </ContentPageLayout>
  )
}
