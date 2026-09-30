import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

async function generateAssets() {
  console.log('[Assets] Generating brand assets...');

  // 1. OG Image (1200 x 630)
  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0C0502" />
        <stop offset="60%" stop-color="#180B05" />
        <stop offset="100%" stop-color="#241008" />
      </linearGradient>
      <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF5722" />
        <stop offset="50%" stop-color="#FF7A00" />
        <stop offset="100%" stop-color="#FFB300" />
      </linearGradient>
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#FFE0D1" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FF7A00" />
        <stop offset="100%" stop-color="#FFB300" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="40" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bgGrad)" />

    <!-- Ambient glow circles -->
    <circle cx="200" cy="180" r="180" fill="#FF5722" opacity="0.15" filter="url(#glow)" />
    <circle cx="1000" cy="450" r="220" fill="#FF9800" opacity="0.12" filter="url(#glow)" />

    <!-- Outer card border -->
    <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#FF7A00" stroke-opacity="0.25" stroke-width="2" />

    <!-- Brand Header -->
    <g transform="translate(100, 110)">
      <!-- Logo Icon Box -->
      <rect width="84" height="84" rx="22" fill="url(#iconGrad)" />
      <!-- Lightning Bolt SVG Path -->
      <path d="M42 16 L25 44 L39 44 L36 68 L59 38 L45 38 Z" fill="#FFFFFF" />
      
      <!-- Brand Name -->
      <text x="110" y="58" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="52" fill="url(#textGrad)" letter-spacing="-1">
        SwiftShare
      </text>
    </g>

    <!-- Main Value Proposition -->
    <text x="100" y="270" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="46" fill="#FFFFFF" letter-spacing="-0.5">
      Send Files Without Sign-Up
    </text>
    <text x="100" y="325" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="28" fill="#FF9E66">
      Instant, Free &amp; Self-Destructing Temporary Links
    </text>

    <!-- Feature Pills -->
    <g transform="translate(100, 390)">
      <!-- Pill 1 -->
      <g transform="translate(0, 0)">
        <rect width="210" height="52" rx="26" fill="#26130B" stroke="#FF7A00" stroke-opacity="0.4" stroke-width="1.5" />
        <text x="105" y="33" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#FFEFEA">
          ⚡ 6-Digit Code &amp; QR
        </text>
      </g>

      <!-- Pill 2 -->
      <g transform="translate(230, 0)">
        <rect width="210" height="52" rx="26" fill="#26130B" stroke="#FF7A00" stroke-opacity="0.4" stroke-width="1.5" />
        <text x="105" y="33" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#FFEFEA">
          🔥 Burn Mode
        </text>
      </g>

      <!-- Pill 3 -->
      <g transform="translate(460, 0)">
        <rect width="230" height="52" rx="26" fill="#26130B" stroke="#FF7A00" stroke-opacity="0.4" stroke-width="1.5" />
        <text x="115" y="33" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#FFEFEA">
          🔒 Password Protection
        </text>
      </g>

      <!-- Pill 4 -->
      <g transform="translate(710, 0)">
        <rect width="220" height="52" rx="26" fill="#26130B" stroke="#FF7A00" stroke-opacity="0.4" stroke-width="1.5" />
        <text x="110" y="33" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#FFEFEA">
          ⏱️ Auto-Expiring
        </text>
      </g>
    </g>

    <!-- Bottom URL Tag -->
    <g transform="translate(100, 500)">
      <text x="0" y="20" font-family="system-ui, sans-serif" font-size="20" font-weight="600" fill="#A89F91">
        swiftsharegg.vercel.app
      </text>
    </g>
  </svg>
  `;

  await sharp(Buffer.from(ogSvg))
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('[Assets] Generated public/og-image.png (1200x630)');

  // 2. Apple Touch Icon (180x180)
  const iconSvg = `
  <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="appleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#CC3C00" />
        <stop offset="55%" stop-color="#FF6B1A" />
        <stop offset="100%" stop-color="#FFAA40" />
      </linearGradient>
    </defs>
    <rect width="180" height="180" rx="40" fill="url(#appleGrad)" />
    <path d="M90 32 L54 94 L84 94 L76 148 L126 82 L96 82 Z" fill="#FFFFFF" />
  </svg>
  `;

  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('[Assets] Generated public/apple-touch-icon.png (180x180)');

  // 3. Favicon (48x48 PNG/ICO)
  const favSvg = `
  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#CC3C00" />
        <stop offset="100%" stop-color="#FFAA40" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#favGrad)" />
    <path d="M24 9 L14 25 L22 25 L20 39 L34 22 L26 22 Z" fill="#FFFFFF" />
  </svg>
  `;

  await sharp(Buffer.from(favSvg))
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('[Assets] Generated public/favicon.ico (48x48)');
}

generateAssets().catch(err => {
  console.error('[Assets] Error generating assets:', err);
  process.exit(1);
});
