import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { QrCode, Smartphone, Camera, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export default function QrSharePage() {
  return (
    <ContentPageLayout
      title="Share Files Instantly with QR Code (Phone to PC)"
      seoTitle="Share Files with QR Code — Phone to PC Instant Transfer"
      description="Transfer photos, documents, and videos between mobile phones and computers instantly by scanning a generated QR code with any camera app."
      badge="Cross-Device QR Sharing"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Fast Phone-to-PC &amp; Phone-to-Phone Transfers
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Typing long URLs, pairing Bluetooth connections, or sending files to yourself over email/messaging apps is slow and cumbersome. SwiftShare generates an interactive QR code for every upload. Anyone with a phone camera can point, tap the notification, and immediately start downloading.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Zap size={20} />
          </div>
          <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>1. Generate QR on PC</h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Drop files or paste text on your desktop computer. The transfer panel instantly renders a large, crisp QR code on your screen.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Camera size={20} />
          </div>
          <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>2. Point Any Camera</h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Open the default camera app on iOS (iPhone/iPad) or Android. Tap the recognized link banner to open the download page.
          </p>
        </div>

        <div className="p-5 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Smartphone size={20} />
          </div>
          <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>3. Direct Mobile Save</h3>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            The file streams directly into your mobile downloads folder or camera roll with full broadband speed.
          </p>
        </div>
      </div>

      <section className="space-y-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Key Benefits of QR Code File Transfer
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>Zero Typo Risk</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
              No need to manually spell out complex URLs, hashes, or transfer tokens on mobile keyboards.
            </p>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>No App Installation</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Works with standard native iOS Camera and Android Google Lens / Camera without installing companion apps.
            </p>
          </div>
        </div>
      </section>
    </ContentPageLayout>
  )
}
