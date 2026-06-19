import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  const backendTarget = (env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '')
  const isAnalyze = process.env.ANALYZE === 'true'
  
  console.log('[Vite] Backend target:', backendTarget)
  console.log('[Vite] Mode:', mode)
  if (isAnalyze) console.log('[Vite] Bundle analysis enabled')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          id: "/",
          name: "SwiftShare",
          short_name: "SwiftShare",
          description: "Fast, secure file sharing with temporary links and burn-after-reading mode",
          start_url: "/",
          display: "standalone",
          background_color: "#0C0502",
          theme_color: "#EA580C",
          orientation: "portrait-primary",
          icons: [
            {
              src: "/icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ],
          categories: ["productivity", "utilities"],
          screenshots: [
            {
              src: "/screenshot-desktop.png",
              sizes: "1280x720",
              type: "image/png",
              form_factor: "wide"
            },
            {
              src: "/screenshot-mobile.png",
              sizes: "720x1280",
              type: "image/png"
            }
          ]
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/upload/, /^\/download/],
          globIgnores: ['**/node_modules/**/*', '**/api/**/*', '**/socket.io/**/*', '**/upload/**/*', '**/download/**/*']
        }
      }),
      // Only run visualizer when ANALYZE=true is set (e.g., ANALYZE=true npm run build)
      isAnalyze && visualizer({
        open: false, // Don't auto-open in browser (we'll review the file)
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Treemap visualization for chunk sizes
      }),
    ].filter(Boolean),
    define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
    },
    server: {
      port: 5173,
      host: true,
      // Proxy configuration for local development
      // Routes /api and /socket.io to backend server
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          timeout: 60000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('[Vite] Proxy error for /api:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Vite] Proxying /api request:', req.method, req.url, '→', backendTarget);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('[Vite] Proxy response for /api:', req.url, 'Status:', proxyRes.statusCode);
            });
          },
        },
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 60000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('[Vite] Proxy error for /socket.io:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Vite] Proxying /socket.io request:', req.method, req.url, '→', backendTarget);
            });
            proxy.on('upgrade', (req, socket, head) => {
              console.log('[Vite] WebSocket upgrade for /socket.io');
            });
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'es2020',
      // Bundle splitting: pulling these heavy deps into separate chunks lets the
      // browser cache them across deploys (only the small app chunk invalidates
      // on most code changes), and lets HTTP/2 download them in parallel — saves
      // ~300ms on cold loads from mobile.
      rollupOptions: {
        output: {
          // Function form (rolldown / Vite 8): inspect each module's path and
          // assign it to a named vendor chunk. Object form is not supported
          // under rolldown.
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react-vendor'
            if (/\/node_modules\/framer-motion\//.test(id)) return 'motion'
            if (/\/node_modules\/(socket\.io-client|engine\.io-client)\//.test(id)) return 'socket'
            if (/\/node_modules\/(react-qr-code|qrcode)\//.test(id)) return 'qr'
            if (/\/node_modules\/lucide-react\//.test(id)) return 'icons'
            if (/\/node_modules\/react-hot-toast\//.test(id)) return 'toast'
            if (/\/node_modules\/react-dropzone\//.test(id)) return 'dropzone'
            if (/\/node_modules\/canvas-confetti\//.test(id)) return 'confetti'
          },
        },
      },
      // Larger chunk warning threshold — react-pdf legitimately ships 700KB+ and
      // we don't want CI noise.
      chunkSizeWarningLimit: 1500,
    },
    // Optimize dependency pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'socket.io-client',
        'react-hot-toast',
      ],
    },
  }
})
