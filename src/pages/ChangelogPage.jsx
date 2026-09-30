import React from 'react'
import { Sparkles, Palette, Camera, CheckCircle2, Zap, Shield, Smartphone } from 'lucide-react'
import ContentPageLayout from '../components/ContentPageLayout'

export default function ChangelogPage() {
  return (
    <ContentPageLayout
      title="Product Changelog"
      seoTitle="Changelog & Updates — SwiftShare"
      description="Track new features, visual improvements, and architectural milestones in SwiftShare."
      badge="Release History"
      badgeColor="var(--accent)"
    >
      <div className="space-y-12">
        {/* Release: v0.8.1 */}
        <section className="relative pl-6 sm:pl-8 border-l-2" style={{ borderColor: 'var(--accent)' }}>
          {/* Timeline node */}
          <div
            className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
            style={{ background: 'var(--bg)', borderColor: 'var(--accent)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                v0.8.1
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                Latest Release
              </span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                September 30, 2026
              </span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              Outline Loader Polish, Solid Theme Swatches &amp; Toast Optimizations
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                <li>
                  <strong>Clean Outline Border Loader:</strong> Fixed the receive card border beam in light themes to keep the interior opaque and render purely as an outline beam without radar/triangle interior bleed.
                </li>
                <li>
                  <strong>Solid Theme Swatches:</strong> Swatches in the Appearance settings now display a clean, single solid color swatch instead of multi-color stripes.
                </li>
                <li>
                  <strong>Toast Limiter &amp; Click-to-Dismiss:</strong> Added automatic toast capping (max 2 active toasts) to prevent toast stacking, instant tap/click to dismiss, and removed noisy swatch-click notifications.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Release: v0.8.0 */}
        <section className="relative pl-6 sm:pl-8 border-l-2" style={{ borderColor: 'var(--border)' }}>
          {/* Timeline node */}
          <div
            className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                v0.8.0
              </span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                September 30, 2026
              </span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              12-Theme Engine Overhaul, Inbuilt Camera QR Scanner &amp; UI Polish
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm">
            {/* Feature 1: Theme System */}
            <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2 font-bold" style={{ color: 'var(--text)' }}>
                <Palette size={16} className="text-[var(--accent)]" />
                <span>12-Theme System with True 1-to-1 Pairs</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                <li>
                  <strong>Three New Light Twins:</strong> Added <em>Lavender Mist</em> (daylight violet), <em>Forest Mist</em> (sunlit canopy), and <em>Ember</em> (coral-to-crimson magma).
                </li>
                <li>
                  <strong>Deterministic 1-to-1 Dark/Light Pairs:</strong> Sunset ↔ Sunrise, Dark ↔ Light, Midnight ↔ Sakura, Lavender ↔ Lavender Mist, Forest ↔ Forest Mist, Volcanic ↔ Ember.
                </li>
                <li>
                  <strong>Mode-Preserving Randomizer:</strong> When "Random on reload" is active, dark mode only picks from dark themes, and light mode only picks from light themes.
                </li>
                <li>
                  <strong>Zero-Flicker Pre-Paint Bootstrap:</strong> Embedded synchronous head script that sets DOM attributes and colors before initial paint, eliminating white flashes and PWA start glitches.
                </li>
                <li>
                  <strong>WCAG 2.x AA Token Compliance:</strong> Introduced <code className="font-mono text-xs">--accent-text</code>, <code className="font-mono text-xs">--accent-fill</code>, <code className="font-mono text-xs">--on-accent</code>, and <code className="font-mono text-xs">--input-border</code> tokens across all 12 themes.
                </li>
              </ul>
            </div>

            {/* Feature 2: Inbuilt QR Scanner */}
            <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2 font-bold" style={{ color: 'var(--text)' }}>
                <Camera size={16} className="text-[var(--accent)]" />
                <span>Inbuilt Real-Time Camera QR Scanner</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                <li>
                  <strong>One-Tap Scanning on Receive:</strong> Open your camera directly from the receive page to scan SwiftShare codes instantly.
                </li>
                <li>
                  <strong>Hardware Acceleration:</strong> Uses the native <code className="font-mono text-xs">BarcodeDetector</code> API with seamless software fallback for instant detection.
                </li>
                <li>
                  <strong>Privacy-First Camera Permission:</strong> Never prompts on page load. Only requests camera access when the user clicks the scan button. Gracefully falls back to manual code entry if access is declined.
                </li>
                <li>
                  <strong>Viewfinder Controls:</strong> Includes flashlight/torch toggle and front/rear camera switcher on supported devices.
                </li>
              </ul>
            </div>

            {/* Feature 3: Polish & Bug Fixes */}
            <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2 font-bold" style={{ color: 'var(--text)' }}>
                <CheckCircle2 size={16} className="text-[var(--accent)]" />
                <span>UI Refinements &amp; Fixes</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                <li>
                  <strong>Fixed Code Input Animation Artifacts:</strong> Eliminated subpixel clipping rectangles and corner border lines in 6-digit code entry boxes.
                </li>
                <li>
                  <strong>Smooth Page Transitions:</strong> Enabled <code className="font-mono text-xs">document.startViewTransition</code> API support for buttery-smooth theme swaps.
                </li>
                <li>
                  <strong>Settings Appearance Redesign:</strong> Rebuilt the Appearance panel with Dark/Light segmented controls, instant shuffle button, and 2-column paired swatches.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </ContentPageLayout>
  )
}
