import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { EyeOff, ShieldCheck, Database, Clock } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <ContentPageLayout
      title="Privacy Policy"
      seoTitle="Privacy Policy — SwiftShare"
      description="SwiftShare privacy commitments: zero personal data profiling, full DNT/GPC compliance, masked IP logging, and automated file purging."
      badge="Privacy Policy"
      badgeColor="var(--success)"
    >
      <section className="space-y-6 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            1. Information We Do Not Collect
          </h2>
          <p>
            SwiftShare does not require user accounts, email addresses, phone numbers, or credit card details. We do not use persistent cross-site tracking cookies, third-party analytics trackers, or advertising fingerprinting.
          </p>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            2. Temporary File Storage
          </h2>
          <p>
            Files uploaded to SwiftShare are stored on secure cloud object storage (Cloudflare R2) solely to facilitate transfer to the designated recipient. Files are automatically and irreversibly deleted when the expiration timer expires (10m, 1h, 5h) or immediately upon download if Burn Mode is active.
          </p>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            3. IP Masking &amp; Server Logs
          </h2>
          <p>
            For abuse prevention, rate limiting, and subnet-based nearby sharing, server logs record network metadata. Client IP addresses are masked (e.g. 192.168.x.x / 2001:0db8::x) and never shared with advertisers or third parties.
          </p>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            4. Do Not Track (DNT) and Global Privacy Control (GPC)
          </h2>
          <p>
            SwiftShare honors browser DNT (Do Not Track) and GPC (Global Privacy Control) headers. Client-side route beacons are immediately suppressed when privacy signals are detected.
          </p>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            5. Contact
          </h2>
          <p>
            For privacy inquiries or deletion requests, visit our <a href="/report-abuse" className="underline font-semibold" style={{ color: 'var(--accent)' }}>Report Abuse</a> page.
          </p>
        </div>
      </section>
    </ContentPageLayout>
  )
}
