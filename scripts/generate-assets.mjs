import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

async function generateAssets() {
  console.log('[Assets] Generating brand assets...');


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
