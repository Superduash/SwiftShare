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

// ── PWA Install Prompt (Task 16.5) ────────────────────────────────────────────
// Capture the beforeinstallprompt event and expose it globally so App.jsx or
// any component can call window.__swiftshare_pwa_prompt.prompt() at the right moment.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__swiftshare_pwa_prompt = e
  window.dispatchEvent(new CustomEvent('swiftshare:pwa-installable'))
})
