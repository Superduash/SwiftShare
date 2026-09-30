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
    /<div id="root">[\s\S]*?<\/div>/,
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
