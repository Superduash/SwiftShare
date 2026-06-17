/**
 * SwiftShare Service Worker
 * 
 * Strategy:
 *  - App shell / static assets: Cache-First (precached on install)
 *  - /api/* requests: Network-First with 3s timeout (stale-while-revalidate fallback)
 *  - Large downloads: Bypass cache entirely
 *  - Offline: Serve cached shell or minimal offline page
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `swiftshare-static-${CACHE_VERSION}`;
const API_CACHE = `swiftshare-api-${CACHE_VERSION}`;

// Assets to precache on install (critical shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// API paths that should be cached with Network-First strategy
const API_CACHE_PATTERNS = [
  /^\/api\/ping/,
  /^\/api\/health/,
];

// Large file upload/download paths — always bypass cache
// Upload bypass is critical: file uploads can take >3s to establish connection
// on mobile networks, but networkFirstAPI aborts after 3s, causing instant failure
// on Android. XHR upload must reach backend directly without Service Worker interception.
const BYPASS_CACHE_PATTERNS = [
  /^\/api\/upload/,      // File uploads (multipart/form-data) - no caching, no timeout
  /^\/api\/download\//,  // Large file downloads - no caching
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Non-fatal: if precaching fails the SW still installs
        console.warn('[SW] Precache failed:', err.message);
      })
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Bypass cache for large downloads
  if (BYPASS_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
    return; // Let browser handle directly
  }

  // API: Network-First with cache fallback
  if (API_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Static assets: Cache-First
  if (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigation: Network-First with offline shell fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstHTML(request));
    return;
  }
});

// ── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstAPI(request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirstHTML(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Serve cached shell
    const cached = await caches.match('/') || await caches.match(request);
    if (cached) return cached;

    // Minimal offline page
    return new Response(
      `<!DOCTYPE html><html><head><title>SwiftShare — Offline</title>
       <meta name="viewport" content="width=device-width,initial-scale=1">
       <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff;text-align:center;gap:16px}h1{font-size:1.5rem}p{color:#888;font-size:.9rem}button{padding:12px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem}</style>
       </head><body>
       <h1>⚡ SwiftShare</h1>
       <p>You're offline. Please check your connection.</p>
       <button onclick="location.reload()">Try Again</button>
       </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
