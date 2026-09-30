import React from 'react'
import ContentPageLayout from '../../components/ContentPageLayout'
import { Check, X, Shield, Smartphone, Monitor, Globe } from 'lucide-react'

export default function AirDropAlternativePage() {
  return (
    <ContentPageLayout
      title="Cross-Platform AirDrop Alternative for Windows &amp; Android"
      seoTitle="Cross-Platform AirDrop Alternative for Windows, Android & Linux"
      description="Fast wireless file sharing between Android, Windows, macOS, Linux, and iOS over standard web browsers without installing special software."
      badge="Universal Compatibility"
    >
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Universal File Transfer Across Any Operating System
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Apple AirDrop and Android Quick Share (Nearby Share) offer great convenience within their own ecosystems, but transferring a file between an iPhone and a Windows PC, or an Android phone and a Mac, often involves email attachments or USB cables. SwiftShare works directly inside any web browser, bridging the gap without ecosystem lock-in.
        </p>
      </section>

      {/* Comparison Table */}
      <div className="overflow-x-auto my-6 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-left text-xs sm:text-sm" style={{ background: 'var(--bg-elevated)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="p-3.5 sm:p-4 font-bold" style={{ color: 'var(--text)' }}>Feature</th>
              <th className="p-3.5 sm:p-4 font-bold" style={{ color: 'var(--accent)' }}>SwiftShare</th>
              <th className="p-3.5 sm:p-4 font-bold" style={{ color: 'var(--text-3)' }}>AirDrop</th>
              <th className="p-3.5 sm:p-4 font-bold" style={{ color: 'var(--text-3)' }}>Quick Share</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <tr>
              <td className="p-3.5 sm:p-4 font-medium" style={{ color: 'var(--text)' }}>iOS / macOS Support</td>
              <td className="p-3.5 sm:p-4 font-semibold" style={{ color: 'var(--success)' }}>Yes (Browser)</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-2)' }}>Yes (Native)</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-3)' }}>No</td>
            </tr>
            <tr>
              <td className="p-3.5 sm:p-4 font-medium" style={{ color: 'var(--text)' }}>Windows &amp; Linux Support</td>
              <td className="p-3.5 sm:p-4 font-semibold" style={{ color: 'var(--success)' }}>Yes (Browser)</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-3)' }}>No</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-2)' }}>Windows app only</td>
            </tr>
            <tr>
              <td className="p-3.5 sm:p-4 font-medium" style={{ color: 'var(--text)' }}>No App Installation Needed</td>
              <td className="p-3.5 sm:p-4 font-semibold" style={{ color: 'var(--success)' }}>Yes (Web-based)</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-2)' }}>Built-in Apple only</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-2)' }}>Built-in Android only</td>
            </tr>
            <tr>
              <td className="p-3.5 sm:p-4 font-medium" style={{ color: 'var(--text)' }}>Burn-After-Download Mode</td>
              <td className="p-3.5 sm:p-4 font-semibold" style={{ color: 'var(--success)' }}>Yes</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-3)' }}>No</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-3)' }}>No</td>
            </tr>
            <tr>
              <td className="p-3.5 sm:p-4 font-medium" style={{ color: 'var(--text)' }}>Custom Passwords</td>
              <td className="p-3.5 sm:p-4 font-semibold" style={{ color: 'var(--success)' }}>Yes (Bcrypt)</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-3)' }}>No</td>
              <td className="p-3.5 sm:p-4" style={{ color: 'var(--text-3)' }}>No</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Nearby Subnet Device Discovery
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          When devices are connected to the same local Wi-Fi or office network, SwiftShare can broadcast active transfer codes on your local subnet so nearby receivers can grab files with a single tap, without manually typing codes.
        </p>
      </section>
    </ContentPageLayout>
  )
}
