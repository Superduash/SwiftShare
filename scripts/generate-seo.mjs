import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');
const distDir = path.resolve(rootDir, 'dist');
const routesPath = path.resolve(rootDir, 'seo/routes.json');

// Read route manifest
const routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));

// Determine site URL (no trailing slash)
function getSiteUrl() {
  const envUrl = process.env.VITE_SITE_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, '');
  }

  return 'https://swiftsharegg.vercel.app';
}

const siteUrl = getSiteUrl();

/**
 * Prebuild: Generates sitemap.xml and robots.txt in public/
 */
function runPrebuild() {
  console.log(`[SEO:Prebuild] Target Site URL: ${siteUrl}`);

  // 1. Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf-8');
  console.log('[SEO:Prebuild] ✓ Generated public/robots.txt');

  // 2. Generate sitemap.xml
  const sitemapEntries = routes.map(r => {
    const loc = r.path === '/' ? `${siteUrl}/` : `${siteUrl}${r.path}`;
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${r.lastmod || '2026-09-30'}</lastmod>
  </url>`;
  }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log(`[SEO:Prebuild] ✓ Generated public/sitemap.xml (${routes.length} indexable URLs)`);
}

/**
 * Generates route-specific static fallback shell content for crawlers & slow connections
 */
function getRouteShell(route) {
  const isRoot = route.path === '/';

  if (isRoot) {
    return `
      <div class="ssr-shell" style="max-width:900px;margin:40px auto;padding:0 24px;font-family:'DM Sans',system-ui,sans-serif;color:#1C1917">
        <header style="margin-bottom:32px;text-align:center">
          <h1 style="font-size:2.4rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;color:#1C1917;line-height:1.2">
            Send Files Without Sign-Up
          </h1>
          <p style="font-size:1.15rem;color:#57534E;max-width:640px;margin:0 auto 16px;line-height:1.5">
            Instant, secure file and text sharing to any device with a 6-digit code or QR scan. No account required.
          </p>
          <div style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px">
            <span style="padding:6px 14px;background:#F5E6DC;color:#8A3800;border-radius:20px;font-size:0.85rem;font-weight:600">⚡ 100 MB Limit</span>
            <span style="padding:6px 14px;background:#F5E6DC;color:#8A3800;border-radius:20px;font-size:0.85rem;font-weight:600">🔥 Burn Mode</span>
            <span style="padding:6px 14px;background:#F5E6DC;color:#8A3800;border-radius:20px;font-size:0.85rem;font-weight:600">🔒 Password Lock</span>
            <span style="padding:6px 14px;background:#F5E6DC;color:#8A3800;border-radius:20px;font-size:0.85rem;font-weight:600">⏱️ Auto-Delete</span>
          </div>
        </header>

        <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-bottom:48px">
          <article style="padding:24px;border-radius:16px;border:1px solid #E7E5E4;background:#FFFFFF">
            <h2 style="font-size:1.2rem;font-weight:700;margin-top:0;margin-bottom:8px">1. Drop Files or Text</h2>
            <p style="color:#57534E;font-size:0.95rem;line-height:1.5;margin:0">
              Select up to 10 files (up to 100 MB total) or paste code snippets up to 256 KB directly in your browser.
            </p>
          </article>

          <article style="padding:24px;border-radius:16px;border:1px solid #E7E5E4;background:#FFFFFF">
            <h2 style="font-size:1.2rem;font-weight:700;margin-top:0;margin-bottom:8px">2. Share Code or Scan QR</h2>
            <p style="color:#57534E;font-size:0.95rem;line-height:1.5;margin:0">
              A temporary 6-digit code and direct QR code are generated instantly for cross-device transfer.
            </p>
          </article>

          <article style="padding:24px;border-radius:16px;border:1px solid #E7E5E4;background:#FFFFFF">
            <h2 style="font-size:1.2rem;font-weight:700;margin-top:0;margin-bottom:8px">3. Auto-Destruction</h2>
            <p style="color:#57534E;font-size:0.95rem;line-height:1.5;margin:0">
              Files expire automatically after 10 min, 1 hr, or 5 hrs, or disappear immediately upon download with Burn Mode.
            </p>
          </article>
        </section>

        <footer style="border-top:1px solid #E7E5E4;padding-top:24px;margin-top:40px;font-size:0.9rem;color:#78716C">
          <p style="margin-bottom:12px;font-weight:600">Explore SwiftShare:</p>
          <nav style="display:flex;flex-wrap:wrap;gap:16px">
            <a href="/how-it-works" style="color:#CC3C00;text-decoration:none">How It Works</a>
            <a href="/send-files-without-signup" style="color:#CC3C00;text-decoration:none">Send Without Sign-Up</a>
            <a href="/share-files-with-qr-code" style="color:#CC3C00;text-decoration:none">QR Code Sharing</a>
            <a href="/self-destructing-file-sharing" style="color:#CC3C00;text-decoration:none">Self-Destructing Files</a>
            <a href="/password-protected-file-transfer" style="color:#CC3C00;text-decoration:none">Password Protection</a>
            <a href="/share-text-and-code-snippets" style="color:#CC3C00;text-decoration:none">Code Snippets</a>
            <a href="/airdrop-alternative" style="color:#CC3C00;text-decoration:none">AirDrop Alternative</a>
            <a href="/security" style="color:#CC3C00;text-decoration:none">Security Architecture</a>
            <a href="/faq" style="color:#CC3C00;text-decoration:none">FAQ</a>
            <a href="/privacy" style="color:#CC3C00;text-decoration:none">Privacy</a>
            <a href="/terms" style="color:#CC3C00;text-decoration:none">Terms</a>
            <a href="/report-abuse" style="color:#CC3C00;text-decoration:none">Report Abuse</a>
          </nav>
        </footer>
      </div>
    `;
  }

  return `
    <div class="ssr-shell" style="max-width:800px;margin:40px auto;padding:0 24px;font-family:'DM Sans',system-ui,sans-serif;color:#1C1917">
      <header style="margin-bottom:32px">
        <a href="/" style="color:#CC3C00;text-decoration:none;font-size:0.9rem;font-weight:600;display:inline-block;margin-bottom:16px">← Back to SwiftShare</a>
        <h1 style="font-size:2.2rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;color:#1C1917;line-height:1.2">
          ${route.title.split('—')[0].trim()}
        </h1>
        <p style="font-size:1.1rem;color:#57534E;line-height:1.5;margin:0">
          ${route.description}
        </p>
      </header>

      <main style="line-height:1.65;font-size:1rem;color:#292524">
        <p style="margin-bottom:16px">
          SwiftShare is a browser-based, zero-login utility built for friction-free file transfers across phones, computers, and tablets.
        </p>
        <section style="background:#FAF8F5;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:24px 0">
          <h2 style="font-size:1.15rem;font-weight:700;margin-top:0;margin-bottom:8px">Key Capabilities</h2>
          <ul style="margin:0;padding-left:20px;color:#57534E">
            <li>Up to 10 files (100 MB total) or 256 KB text snippets.</li>
            <li>Encrypted in transit using TLS 1.3 over HTTPS.</li>
            <li>Automatic file purging after 10m, 1h, or 5h expiration timers.</li>
            <li>Optional Burn-After-Download mode for single-use sharing.</li>
            <li>Bcrypt-hashed password protection with brute-force resistance.</li>
          </ul>
        </section>
        <p>
          <a href="/" style="display:inline-block;padding:12px 24px;background:#EA580C;color:#FFFFFF;text-decoration:none;font-weight:600;border-radius:10px;margin-top:12px">
            Start Sharing Files
          </a>
        </p>
      </main>

      <footer style="border-top:1px solid #E7E5E4;padding-top:24px;margin-top:48px;font-size:0.85rem;color:#78716C">
        <nav style="display:flex;flex-wrap:wrap;gap:12px">
          <a href="/" style="color:#CC3C00;text-decoration:none">Home</a>
          <a href="/how-it-works" style="color:#CC3C00;text-decoration:none">How It Works</a>
          <a href="/security" style="color:#CC3C00;text-decoration:none">Security</a>
          <a href="/faq" style="color:#CC3C00;text-decoration:none">FAQ</a>
          <a href="/privacy" style="color:#CC3C00;text-decoration:none">Privacy</a>
          <a href="/terms" style="color:#CC3C00;text-decoration:none">Terms</a>
        </nav>
      </footer>
    </div>
  `;
}

/**
 * Postbuild: Injects per-route metadata and pre-rendered shell into dist/*.html
 */
function runPostbuild() {
  const indexHtmlPath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('[SEO:Postbuild] dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  console.log(`[SEO:Postbuild] Generating ${routes.length} pre-rendered static route pages...`);

  for (const route of routes) {
    let html = baseHtml;
    const canonicalUrl = route.path === '/' ? `${siteUrl}/` : `${siteUrl}${route.path}`;

    // Update <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);

    // Update <link rel="canonical" ... />
    html = html.replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );

    // Update meta description
    html = html.replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${route.description.replace(/"/g, '&quot;')}" />`
    );

    // Update OG tags
    html = html.replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${route.title.replace(/"/g, '&quot;')}" />`
    );
    html = html.replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${route.description.replace(/"/g, '&quot;')}" />`
    );
    html = html.replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${canonicalUrl}" />`
    );

    // Update Twitter tags
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${route.title.replace(/"/g, '&quot;')}" />`
    );
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${route.description.replace(/"/g, '&quot;')}" />`
    );

    // Inject static shell inside <div id="root"></div>
    const shell = getRouteShell(route);
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${shell}</div>`
    );

    // Write file to dist/
    if (route.path === '/') {
      fs.writeFileSync(indexHtmlPath, html, 'utf-8');
      console.log(`[SEO:Postbuild] ✓ / → dist/index.html`);
    } else {
      const fileName = `${route.file}.html`;
      const outPath = path.resolve(distDir, fileName);
      fs.writeFileSync(outPath, html, 'utf-8');
      console.log(`[SEO:Postbuild] ✓ ${route.path} → dist/${fileName}`);
    }
  }

  // 4. Generate branded 404.html with noindex
  let errorHtml = baseHtml;
  errorHtml = errorHtml.replace(/<title>[^<]*<\/title>/, `<title>Page Not Found — SwiftShare</title>`);
  errorHtml = errorHtml.replace(
    /<meta name="robots" content="[^"]*" \/>/,
    `<meta name="robots" content="noindex, nofollow, noarchive" />`
  );
  errorHtml = errorHtml.replace(
    '<div id="root"></div>',
    `<div id="root">
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif;text-align:center;background:#0C0502;color:#FDF3E8">
        <h1 style="font-size:3rem;font-weight:800;color:#EA580C;margin-bottom:12px">404</h1>
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:8px">Page Not Found</h2>
        <p style="color:#A89F91;max-width:440px;margin-bottom:24px;line-height:1.5">
          The requested page does not exist or may have expired.
        </p>
        <a href="/" style="display:inline-block;padding:12px 24px;background:#EA580C;color:#FFFFFF;text-decoration:none;font-weight:600;border-radius:10px">
          Return to SwiftShare
        </a>
      </div>
    </div>`
  );
  fs.writeFileSync(path.resolve(distDir, '404.html'), errorHtml, 'utf-8');
  console.log('[SEO:Postbuild] ✓ Generated dist/404.html (branded, noindex)');
}

// CLI Execution dispatcher
const mode = process.argv[2];
if (mode === '--prebuild') {
  runPrebuild();
} else if (mode === '--postbuild') {
  runPostbuild();
} else {
  console.log('Running both prebuild and postbuild...');
  runPrebuild();
  runPostbuild();
}
