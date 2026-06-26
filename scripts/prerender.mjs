/**
 * Pre-render script: injects static SEO-friendly HTML shells into the
 * Vite build output so that crawlers (Googlebot, Bingbot, etc.) can read
 * meaningful content without executing JavaScript.
 *
 * The React app will hydrate and replace the #root content on the client.
 *
 * Usage: runs automatically after `vite build` via the npm build script.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexHtmlPath = resolve(distDir, 'index.html');

if (!existsSync(indexHtmlPath)) {
  console.error('[prerender] dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

const baseHtml = readFileSync(indexHtmlPath, 'utf-8');

// ── Route-specific SEO content ──────────────────────────────────────────

const routes = {
  '/': {
    output: 'index.html',
    canonical: 'https://swiftshare.app/',
    title: 'SwiftShare — Instant File Transfer, Zero Login',
    description: 'Send files instantly like a message. Zero-login file sharing that works on any device, anywhere. No sign-up, no limits, end-to-end encrypted.',
    ogTitle: 'SwiftShare — Share Files Instantly',
    ogDescription: 'Send files instantly like a message. Zero-login file sharing that works on any device, anywhere.',
    shell: `
      <noscript>
        <div style="max-width:800px;margin:80px auto;padding:0 24px;font-family:'DM Sans',system-ui,sans-serif;color:#1C1917">
          <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:16px;line-height:1.15">
            Simple, yet too effective.
          </h1>
          <p style="font-size:1.15rem;color:#57534E;margin-bottom:8px">
            Send files instantly like a message.
          </p>
          <p style="font-size:0.95rem;color:#EA580C;font-weight:600;margin-bottom:32px">
            Works on any device, anywhere.
          </p>
          <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:48px">
            <div style="padding:16px;border-radius:12px;border:1px solid #E7E5E4">
              <h3 style="font-weight:700;margin:0 0 4px">No Sign-Up</h3>
              <p style="margin:0;font-size:0.9rem;color:#78716C">Share without accounts</p>
            </div>
            <div style="padding:16px;border-radius:12px;border:1px solid #E7E5E4">
              <h3 style="font-weight:700;margin:0 0 4px">Self-Destruct</h3>
              <p style="margin:0;font-size:0.9rem;color:#78716C">Gone when the timer ends</p>
            </div>
            <div style="padding:16px;border-radius:12px;border:1px solid #E7E5E4">
              <h3 style="font-weight:700;margin:0 0 4px">Burn Mode</h3>
              <p style="margin:0;font-size:0.9rem;color:#78716C">Vanishes after one grab</p>
            </div>
            <div style="padding:16px;border-radius:12px;border:1px solid #E7E5E4">
              <h3 style="font-weight:700;margin:0 0 4px">QR Codes</h3>
              <p style="margin:0;font-size:0.9rem;color:#78716C">Point, scan, done</p>
            </div>
            <div style="padding:16px;border-radius:12px;border:1px solid #E7E5E4">
              <h3 style="font-weight:700;margin:0 0 4px">Live Updates</h3>
              <p style="margin:0;font-size:0.9rem;color:#78716C">Real-time progress</p>
            </div>
            <div style="padding:16px;border-radius:12px;border:1px solid #E7E5E4">
              <h3 style="font-weight:700;margin:0 0 4px">Secure Transfer</h3>
              <p style="margin:0;font-size:0.9rem;color:#78716C">Encrypted HTTPS delivery</p>
            </div>
          </section>
          <nav aria-label="Page links">
            <a href="/join" style="color:#EA580C;font-weight:600;text-decoration:none">Join a transfer</a>
          </nav>
        </div>
      </noscript>
      <div id="app-root-shell" style="display:none" aria-hidden="true">
        <h1>SwiftShare — Instant File Transfer</h1>
        <p>Send files instantly like a message. Zero-login file sharing that works on any device, anywhere.</p>
        <nav><a href="/join">Join a transfer</a></nav>
      </div>`,
  },
  '/join': {
    output: 'join/index.html',
    canonical: 'https://swiftshare.app/join',
    title: 'Join a Transfer — SwiftShare',
    description: 'Enter a 6-digit code or scan a QR code to instantly receive files shared with you. No sign-up required.',
    ogTitle: 'SwiftShare — Join a Transfer',
    ogDescription: 'Enter a code or scan a QR code to instantly receive files. No sign-up required.',
    shell: `
      <noscript>
        <div style="max-width:600px;margin:80px auto;padding:0 24px;font-family:'DM Sans',system-ui,sans-serif;color:#1C1917;text-align:center">
          <h1 style="font-size:2rem;font-weight:800;margin-bottom:16px">
            Join a Transfer
          </h1>
          <p style="font-size:1.05rem;color:#57534E;margin-bottom:32px">
            Enter the 6-digit code shared with you, or scan a QR code to receive files instantly.
            No sign-up required.
          </p>
          <nav aria-label="Page links">
            <a href="/" style="color:#EA580C;font-weight:600;text-decoration:none">Share files instead</a>
          </nav>
        </div>
      </noscript>
      <div id="app-root-shell" style="display:none" aria-hidden="true">
        <h1>Join a Transfer — SwiftShare</h1>
        <p>Enter a 6-digit code or scan a QR code to instantly receive files shared with you. No sign-up required.</p>
        <nav><a href="/">Share files instead</a></nav>
      </div>`,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────

function updateMeta(html, route) {
  let result = html;

  // Update <title>
  result = result.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);

  // Update canonical
  result = result.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // Update meta description
  result = result.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${route.description}" />`
  );

  // Update OG tags
  result = result.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${route.ogTitle}" />`
  );
  result = result.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${route.ogDescription}" />`
  );
  result = result.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${route.canonical}" />`
  );

  // Update Twitter tags
  result = result.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${route.ogTitle}" />`
  );
  result = result.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${route.ogDescription}" />`
  );

  return result;
}

function injectShell(html, route) {
  // Inject the static shell content inside <div id="root">
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${route.shell}</div>`
  );
}

// ── Generate pre-rendered files ─────────────────────────────────────────

let generated = 0;

for (const [path, route] of Object.entries(routes)) {
  let html = baseHtml;

  // Update meta tags for this route
  html = updateMeta(html, route);

  // Inject static content shell
  html = injectShell(html, route);

  // Write output
  const outputPath = resolve(distDir, route.output);
  const outputDir = dirname(outputPath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, html, 'utf-8');
  generated++;
  console.log(`[prerender] ✓ ${path} → ${route.output}`);
}

console.log(`[prerender] Generated ${generated} pre-rendered page(s).`);