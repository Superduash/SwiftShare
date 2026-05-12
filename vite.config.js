import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  const backendTarget = (env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '')
  
  console.log('[Vite] Backend target:', backendTarget)
  console.log('[Vite] Mode:', mode)

  return {
    plugins: [react()],
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
