import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'

export default function TermsPage() {
  return (
    <ContentPageLayout
      title="Terms of Service"
      seoTitle="Terms of Service — SwiftShare"
      description="Acceptable usage guidelines and service terms for the SwiftShare temporary file transfer utility."
      badge="Terms of Service"
    >
      <section className="space-y-6 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using SwiftShare, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            2. Acceptable Use
          </h2>
          <p className="mb-2">
            SwiftShare is intended for legal, temporary transfers of personal and business files. You expressly agree NOT to use the service to store or transmit:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Malware, viruses, ransomware, trojans, or phishing materials.</li>
            <li>Content that infringes copyright, trademark, patent, or other intellectual property rights.</li>
            <li>Child sexual abuse material (CSAM) or any illegal non-consensual imagery.</li>
            <li>Materials that violate national or international export control laws.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            3. Disclaimer &amp; Ephemeral Nature
          </h2>
          <p>
            SwiftShare is provided &quot;as is&quot; and &quot;as available&quot;. SwiftShare is an ephemeral transfer bridge, NOT a permanent backup solution. We are not liable for files lost due to timer expiration or delivery interruption.
          </p>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            4. Abuse Termination
          </h2>
          <p>
            We reserve the right to immediately terminate transfers, block IP ranges, and report unlawful activity to competent law enforcement agencies upon detection of abuse.
          </p>
        </div>
      </section>
    </ContentPageLayout>
  )
}
