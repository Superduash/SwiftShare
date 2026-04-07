import React, { Suspense, lazy, useEffect, useState } from 'react'
import {
  BrowserRouter, Routes, Route, Navigate,
  useLocation, useParams,
} from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import { SocketProvider } from './context/SocketContext'
import { TransferProvider } from './context/TransferContext'
import { ThemeProvider } from './context/ThemeContext'
import { pingServer } from './services/api'

import LoadingScreen from './components/LoadingScreen'
import ServerWakeup from './components/ServerWakeup'

// Eager — critical path
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import ExpiredPage from './pages/ExpiredPage'

// Lazy — heavier pages
const SenderPage = lazy(() => import('./pages/SenderPage'))
const DownloadPage = lazy(() => import('./pages/DownloadPage'))

// ── Scroll to top ────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

// ── Page transition wrapper ──────────────────
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
}

function PageWrapper({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

// ── Legacy redirect /g/:code → /download/:code ──
function LegacyShareRedirect() {
  const { code } = useParams()
  return <Navigate to={`/download/${encodeURIComponent(code || '')}`} replace />
}

// ── Animated routes ──────────────────────────
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingScreen message="Loading..." />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/sender/:code" element={<PageWrapper><SenderPage /></PageWrapper>} />
            <Route path="/join" element={<PageWrapper><JoinPage /></PageWrapper>} />
            <Route path="/g/:code" element={<LegacyShareRedirect />} />
            <Route path="/download/:code" element={<PageWrapper><DownloadPage /></PageWrapper>} />
            <Route path="/expired" element={<PageWrapper><ExpiredPage /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  )
}

// ── Server health gate ───────────────────────
function ServerShell() {
  const [serverReady, setServerReady] = useState(null)

  useEffect(() => {
    let timer = null
    const tryPing = async () => {
      const { ok, latencyMs } = await pingServer()
      if (ok && latencyMs < 5000) {
        setServerReady(true)
      } else {
        setServerReady(false)
        timer = setTimeout(tryPing, 4000)
      }
    }
    tryPing()
    return () => { if (timer) clearTimeout(timer) }
  }, [])

  if (serverReady === null) return <LoadingScreen message="Connecting to SwiftShare..." />
  if (serverReady === false) return <ServerWakeup />

  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}

// ── Root ─────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <TransferProvider>
          <ServerShell />
          <Toaster
            position="top-right"
            gutter={8}
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-text)',
                border: '1px solid var(--toast-border)',
                borderRadius: '12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: '600',
                maxWidth: '360px',
              },
              success: { iconTheme: { primary: '#16A34A', secondary: 'var(--toast-bg)' } },
              error: { iconTheme: { primary: '#DC2626', secondary: 'var(--toast-bg)' } },
            }}
          />
        </TransferProvider>
      </SocketProvider>
    </ThemeProvider>
  )
}
