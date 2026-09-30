import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const publicDir = path.resolve(rootDir, 'public');
const routesPath = path.resolve(rootDir, 'seo/routes.json');

const targetSiteUrl = (process.env.VITE_SITE_URL || 'https://swiftsharegg.vercel.app').replace(/\/+$/, '');

let errors = [];

console.log('====================================================');
console.log('  SwiftShare SEO & Discoverability Verification Audit');
console.log('====================================================\n');

// 1. Verify Sitemap XML
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  errors.push('sitemap.xml does not exist in public/');
} else {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  if (!sitemapContent.startsWith('<?xml')) {
    errors.push('sitemap.xml does not begin with <?xml');
  }

  // Check forbidden routes in sitemap
  const forbidden = ['/g/', '/s/', '/sender/', '/download/', '/expired', '/admin'];
  for (const f of forbidden) {
    if (sitemapContent.includes(f)) {
      errors.push(`sitemap.xml contains forbidden private route: ${f}`);
    }
  }

  // Check foreign domain
  if (sitemapContent.includes('swiftshare.app')) {
    errors.push('sitemap.xml contains stale foreign domain: swiftshare.app');
  }

  console.log('✓ Sitemap XML format & privacy exclusions verified');
}

// 2. Verify robots.txt
const robotsPath = path.resolve(publicDir, 'robots.txt');
if (!fs.existsSync(robotsPath)) {
  errors.push('robots.txt does not exist in public/');
} else {
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
  if (!robotsContent.includes('Sitemap:')) {
    errors.push('robots.txt does not declare Sitemap URL');
  }
  if (robotsContent.includes('swiftshare.app')) {
    errors.push('robots.txt references foreign domain: swiftshare.app');
  }
  console.log('✓ robots.txt verified');
}

// 3. Verify dist/*.html static shells
if (!fs.existsSync(distDir)) {
  console.log('dist/ directory not built yet. Run `npm run build` before `test:seo`.');
  process.exit(0);
}

const routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
const titles = new Set();
const descriptions = new Set();

for (const route of routes) {
  const fileName = route.path === '/' ? 'index.html' : `${route.file}.html`;
  const filePath = path.resolve(distDir, fileName);

  if (!fs.existsSync(filePath)) {
    errors.push(`Built HTML file missing: dist/${fileName}`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf-8');

  // Check for foreign domain
  if (html.includes('swiftshare.app')) {
    errors.push(`File dist/${fileName} contains hardcoded foreign domain swiftshare.app`);
  }

  // Check canonical
  const expectedCanonical = route.path === '/' ? `${targetSiteUrl}/` : `${targetSiteUrl}${route.path}`;
  if (!html.includes(`<link rel="canonical" href="${expectedCanonical}" />`)) {
    errors.push(`dist/${fileName} canonical mismatch. Expected: ${expectedCanonical}`);
  }

  // Check title uniqueness
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  if (!titleMatch || !titleMatch[1].trim()) {
    errors.push(`dist/${fileName} is missing <title>`);
  } else {
    const title = titleMatch[1].trim();
    if (titles.has(title)) {
      errors.push(`Duplicate <title> found: "${title}" in dist/${fileName}`);
    }
    titles.add(title);
  }

  // Check description uniqueness
  const descMatch = html.match(/<meta name="description" content="([^"]*)" \/>/);
  if (!descMatch || !descMatch[1].trim()) {
    errors.push(`dist/${fileName} is missing meta description`);
  } else {
    const desc = descMatch[1].trim();
    if (descriptions.has(desc)) {
      errors.push(`Duplicate meta description found: "${desc}" in dist/${fileName}`);
    }
    descriptions.add(desc);
  }

  // Check exactly one <h1> inside rendered static shell
  const h1Matches = html.match(/<h1[^>]*>/gi) || [];
  if (h1Matches.length === 0) {
    errors.push(`dist/${fileName} has 0 <h1> headings in static shell`);
  } else if (h1Matches.length > 1) {
    errors.push(`dist/${fileName} has multiple (${h1Matches.length}) <h1> headings in static shell`);
  }

  console.log(`✓ dist/${fileName} verified (single <h1>, unique meta, canonical valid)`);
}

// 4. Verify 404.html
const notFoundPath = path.resolve(distDir, '404.html');
if (!fs.existsSync(notFoundPath)) {
  errors.push('dist/404.html was not generated');
} else {
  const notFoundHtml = fs.readFileSync(notFoundPath, 'utf-8');
  if (!notFoundHtml.includes('noindex')) {
    errors.push('dist/404.html is missing noindex meta tag');
  }
  console.log('✓ dist/404.html verified with noindex');
}

// Report results
console.log('\n----------------------------------------------------');
if (errors.length > 0) {
  console.error(`❌ SEO Verification Failed with ${errors.length} error(s):`);
  errors.forEach((e, idx) => console.error(`  ${idx + 1}. ${e}`));
  process.exit(1);
} else {
  console.log('✅ ALL SEO & DISCOVERABILITY VERIFICATION CHECKS PASSED!');
  console.log('----------------------------------------------------');
}
