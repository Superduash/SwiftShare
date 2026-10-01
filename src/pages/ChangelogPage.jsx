import React from 'react'
import { Sparkles, Palette, Camera, CheckCircle2, Zap, Shield, Smartphone, Wifi, BarChart3, Clock, Lock, Layers, Globe, Radio } from 'lucide-react'
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
      <div className="relative ml-1 sm:ml-2">
        {/* Continuous vertical timeline line */}
        <div
          className="absolute left-[7px] top-3 bottom-4 w-0.5 rounded-full"
          style={{ background: 'linear-gradient(180deg, var(--accent) 0%, var(--border) 20%, var(--border) 100%)' }}
        />

        <div className="space-y-12">
          {/* Release: v0.8.2 */}
          <section className="relative pl-7 sm:pl-9">
            {/* Timeline node */}
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--accent)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.8.2
                </span>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  Latest Release
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  October 1, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Dual-Stack Hotspot &amp; Wi-Fi Peer Discovery, Instant Manual Sync &amp; Admin Time-Series Polish
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Dual-Stack Subnet Discovery:</strong> Added <code className="font-mono text-xs">/64</code> IPv6 prefix clustering for mobile hotspot tethering alongside <code className="font-mono text-xs">/24</code> IPv4 Wi-Fi matching, enabling 100% reliable nearby discovery across mobile phone hotspots.
                  </li>
                  <li>
                    <strong>Instant Manual Refresh Sync:</strong> Real-time dual-fetch querying both WebSocket and REST discovery channels simultaneously with immediate toast feedback and zero debouncing lag.
                  </li>
                  <li>
                    <strong>Admin Analytics Time-Series:</strong> Multi-range historical aggregations (24h, 7d, 30d, 90d, All) with responsive metric buckets, live visitor counter, and rock-solid static page state.
                  </li>
                  <li>
                    <strong>Documentation &amp; Codebase Cleanliness:</strong> Comprehensive documentation update, purged redundant scratch test scripts, and streamlined source export pipeline.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.8.1 */}
          <section className="relative pl-7 sm:pl-9">
            {/* Timeline node */}
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.8.1
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  October 1, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Camera QR Scanner Fallback, Mobile PWA Polish, Theme Boot Fix &amp; Switch Alignment
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Resilient QR Scanner &amp; Permissions:</strong> Added multi-tier progressive video stream fallbacks, instant permission request trigger, PWA site settings guidance, and photo/screenshot QR upload fallback.
                  </li>
                  <li>
                    <strong>Theme Boot Flash Elimination:</strong> Fixed swapped theme-registry definitions to ensure zero white-flash on startup and native edge-to-edge status bar rendering.
                  </li>
                  <li>
                    <strong>Unified Toggle Switch UI:</strong> Symmetrically aligned all switch pills and thumbs across settings, home, modals, and sender views.
                  </li>
                  <li>
                    <strong>Outline Border Beam:</strong> Cleaned up receive file card animations in light modes without cone/radar artifacts.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.8.0 */}
          <section className="relative pl-7 sm:pl-9">
            {/* Timeline node */}
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
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
                    <strong>Three New Light Twins:</strong> Added <em>Lilac</em> (daylight violet), <em>Mint</em> (sunlit canopy), and <em>Ember</em> (coral-to-crimson magma).
                  </li>
                  <li>
                    <strong>Deterministic 1-to-1 Dark/Light Pairs:</strong> Sunset ↔ Sunrise, Dark ↔ Light, Midnight ↔ Sakura, Lavender ↔ Lilac, Forest ↔ Mint, Volcanic ↔ Ember.
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

          {/* Release: v0.7.8 – v0.7.9 */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.7.8 – v0.7.9
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  September 30, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Privacy-First Admin Dashboard &amp; Real-Time Telemetry
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Admin Telemetry Engine:</strong> Added privacy-first pageview logging (<code className="font-mono text-xs">/api/analytics/pv</code>) and non-identifying aggregate metrics.
                  </li>
                  <li>
                    <strong>Real-Time Visitor Counter:</strong> Integrated authenticated <code className="font-mono text-xs">/admin</code> WebSocket namespace broadcasting live online user counts.
                  </li>
                  <li>
                    <strong>Defensive Aggregations:</strong> Built resilient MongoDB aggregation pipelines with automatic null-handling and multi-window time bucketing.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.7.5 – v0.7.7 */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.7.5 – v0.7.7
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  June 21–22, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Upload Pipeline Hardening, Single Claimant Gate &amp; Security Cards
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Single Claimant Enforcement:</strong> Guarded WebSocket claimant connection preventing race conditions on burn-after-reading transfers.
                  </li>
                  <li>
                    <strong>Chunk Load Error Recovery:</strong> Implemented automatic smart reload fallback when new app builds are deployed.
                  </li>
                  <li>
                    <strong>Security Cards &amp; Footer Redesign:</strong> Added Secure Transfer information card, clean social actions, and refined transfer status badges.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.7.0 – v0.7.4 */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.7.0 – v0.7.4
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  June 19–20, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Vite PWA Migration, Ambient Themes &amp; Real-Time Transfer Alerts
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Full PWA Integration:</strong> Migrated to <code className="font-mono text-xs">vite-plugin-pwa</code> with custom service worker, offline precaching, and direct network upload bypass.
                  </li>
                  <li>
                    <strong>Nearby Wi-Fi Discovery:</strong> Introduced local peer discovery on <code className="font-mono text-xs">/24</code> subnets with automatic room announcements.
                  </li>
                  <li>
                    <strong>Real-Time Activity Stream:</strong> WebSocket notifications for downloads, views, and burn deletions pushed to transfer rooms.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.6.0 – v0.6.2 */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.6.0 – v0.6.2
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  June 19, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Ownership Tokens, Transfer TTL Extensions &amp; Timer Reconciliation
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Client-Side Ownership Tokens:</strong> Senders receive a private UUID token enabling transfer cancellation and duration extensions (10/30/60 min) without user accounts.
                  </li>
                  <li>
                    <strong>Timer Synchronization:</strong> Eliminated countdown drift during tab switching and background sleep via server-synced <code className="font-mono text-xs">expiresAt</code> timestamps.
                  </li>
                  <li>
                    <strong>Preview Pipeline Optimization:</strong> Streamlined file previews and disabled slow document conversions.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.4.0 – v0.5.0 */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.4.0 – v0.5.0
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  June 15, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Cloudflare R2 Streaming Pipeline, Multi-File Previews &amp; Direct ZIP Archiving
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Zero-Disk Streaming Architecture:</strong> Express + Busboy multipart parser piping directly into Cloudflare R2 object storage.
                  </li>
                  <li>
                    <strong>Multi-File Batch Downloads:</strong> Upload up to 10 files with in-browser previews and single-click individual or full ZIP downloads.
                  </li>
                  <li>
                    <strong>Accurate Byte-Level ETA:</strong> Smooth upload progress calculation hooked into raw XHR byte streams with exponential moving average.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.3.0 */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.3.0
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  June 14, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Design System Evolution, Framer Motion Physics &amp; Connection Resilience
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Connection Status Banners:</strong> Non-intrusive server wake-up alerts and connection status indicators.
                  </li>
                  <li>
                    <strong>Animation &amp; Rendering Polish:</strong> Eliminated layout flicker and FOUC during theme switches using Web Animations API.
                  </li>
                  <li>
                    <strong>Refined Mobile Ergonomics:</strong> Optimized touch targets, drag-and-drop dropzones, and responsive layout scaling.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.0.1 – v0.0.2 (Prerelease) */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.0.1 – v0.0.2 (Prerelease)
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  June 14, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                The Ephemeral Architecture Pivot: "AirDrop for the Web"
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Core Philosophy Pivot:</strong> Removed heavyweight AI summarization pipelines in favor of an ultra-fast, zero-friction, no-signup ephemeral file transfer engine.
                  </li>
                  <li>
                    <strong>6-Character Transfer Alphabet:</strong> Short alphanumeric codes (A–Z without ambiguous characters <code className="font-mono text-xs">0</code>, <code className="font-mono text-xs">O</code>, <code className="font-mono text-xs">1</code>, <code className="font-mono text-xs">I</code>, <code className="font-mono text-xs">L</code> and numbers 2–9).
                  </li>
                  <li>
                    <strong>Atomic Burn-After-Reading:</strong> MongoDB <code className="font-mono text-xs">findOneAndUpdate</code> claiming logic ensuring single-recipient exclusivity.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Release: v0.0.0 (Scaffold & Inception) */}
          <section className="relative pl-7 sm:pl-9">
            <div
              className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-4)' }} />
            </div>

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-bold text-lg sm:text-xl" style={{ color: 'var(--text)' }}>
                  v0.0.0
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  April 6–7, 2026
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Initial Scaffold, WebSocket Rooms &amp; Foundational Transfer Pipeline
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 sm:p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <ul className="space-y-2 list-disc list-inside" style={{ color: 'var(--text-2)' }}>
                  <li>
                    <strong>Foundational Architecture:</strong> React frontend and Node.js/Express backend prototypes with Socket.IO room handling.
                  </li>
                  <li>
                    <strong>Proof of Concept:</strong> Basic file upload, 6-character code generation, and download redemption.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ContentPageLayout>
  )
}

