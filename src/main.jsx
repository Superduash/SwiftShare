import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './themes-premium.css'
import './themes-cinematic.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)

// ── Service Worker Registration ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      // Unregister any existing service workers in dev mode to prevent stale caches (blank screen bug)
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    } else {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err)
        })
    }
  })
}

// ── PWA Install Prompt (Task 16.5) ────────────────────────────────────────────
// Capture the beforeinstallprompt event and expose it globally so App.jsx or
// any component can call window.__swiftshare_pwa_prompt.prompt() at the right moment.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__swiftshare_pwa_prompt = e
  window.dispatchEvent(new CustomEvent('swiftshare:pwa-installable'))
})
