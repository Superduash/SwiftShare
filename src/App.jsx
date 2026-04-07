import React, { Suspense, lazy, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import { SocketProvider } from './context/SocketContext'
import { TransferProvider } from './context/TransferContext'
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

// ── Scroll to top on every route change ──────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

// ── Per-page fade + slide transition ─────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

function PageWrapper({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

// ── Animated route tree ───────────────────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingScreen message="Loading..." />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/"               element={<PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/sender/:code"   element={<PageWrapper><SenderPage /></PageWrapper>} />
            <Route path="/join"           element={<PageWrapper><JoinPage /></PageWrapper>} />
            <Route path="/download/:code" element={<PageWrapper><DownloadPage /></PageWrapper>} />
            <Route path="/expired"        element={<PageWrapper><ExpiredPage /></PageWrapper>} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  )
}

// ── Server health shell ───────────────────────────────────────────────
// null  = still checking → LoadingScreen
// false = cold start      → ServerWakeup (retries every 4s)
// true  = live            → render app
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

// ── Root ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SocketProvider>
      <TransferProvider>

        <ServerShell />

        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0D0F18',
              color: '#F1F5F9',
              border: '1px solid #1C1E2E',
              borderRadius: '12px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              fontWeight: '600',
              maxWidth: '360px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#111827' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#111827' } },
            loading: { iconTheme: { primary: '#818CF8', secondary: '#111827' } },
          }}
        />

      </TransferProvider>
    </SocketProvider>
  )
}
