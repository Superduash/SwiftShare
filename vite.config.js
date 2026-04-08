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
  },
})
