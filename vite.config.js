import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendTarget = (process.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '')

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
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
        },
      },
    },
    // Larger chunk warning threshold — react-pdf legitimately ships 700KB+ and
    // we don't want CI noise.
    chunkSizeWarningLimit: 1500,
  },
})
