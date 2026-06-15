import { Component, useState, Suspense, lazy, useEffect } from 'react'
import {
  BrowserRouter, Routes, Route, Navigate,
  useLocation, useNavigate, useParams,
} from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

import { SocketProvider, useSocket } from './context/SocketContext'
import { TransferProvider } from './context/TransferContext'
import { ConnectionHealthProvider } from './context/ConnectionHealthContext'
import { getSettings } from './utils/storage'


import LoadingScreen from './components/LoadingScreen'
import ConnectionBanner from './components/ConnectionBanner'
import Navbar from './components/Navbar'
import ShortcutsOverlay from './components/ShortcutsOverlay'
import AmbientBackground from './components/AmbientBackground'
// ── Error boundary for lazy routes ───────────
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, isChunkError: false }
  }
  static getDerivedStateFromError(error) {
    // ChunkLoadError happens when a new deploy removes old chunk hashes
    const isChunkError = /chunk|loading chunk|failed to fetch dynamically imported/i.test(
      String(error?.message || error?.name || '')
    )
    return { hasError: true, error, isChunkError }
  }
  componentDidCatch(error, info) {
    console.error('[SwiftShare] Route failed to load:', error, info)
  }
  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div style={{ minHeight: 'calc(var(--app-vh) * 100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px', padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1.1rem' }}>⚡ Update Available</p>
            <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>SwiftShare has been updated. Please reload to get the latest version.</p>
            <button style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} onClick={() => window.location.reload()}>Reload Now</button>
          </div>
        )
      }
      return (
        <div style={{ minHeight: 'calc(var(--app-vh) * 100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px' }}>
          <p style={{ color: 'var(--text)', fontWeight: 600 }}>Something went wrong loading this page.</p>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', fontFamily: 'monospace' }}>{this.state.error?.message}</p>
          <button style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>Go Home</button>
        </div>
      )
    }
    return this.props.children
  }
}


// Eager — critical path
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import ExpiredPage from './pages/ExpiredPage'
import NotFoundPage from './pages/NotFoundPage'

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
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] }
  },
}

function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
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
      <RouteErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Loading..." />}>
          <AnimatePresence mode="wait">
            <Routes key={location.pathname} location={location}>
              <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
              <Route path="/sender/:code" element={<PageWrapper><SenderPage /></PageWrapper>} />
              <Route path="/join" element={<PageWrapper><JoinPage /></PageWrapper>} />
              <Route path="/g/:code" element={<LegacyShareRedirect />} />
              <Route path="/download/:code" element={<PageWrapper><DownloadPage /></PageWrapper>} />
              <Route path="/expired" element={<PageWrapper><ExpiredPage /></PageWrapper>} />
              <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </RouteErrorBoundary>
    </>
  )
}

function NearbyOfferListener() {
  const { socket } = useSocket()
  const navigate = useNavigate()

  useEffect(() => {
    if (!socket) return undefined

    const handleOffer = ({ code, filename } = {}) => {
      const safeCode = String(code || '').trim().toUpperCase()
      if (!safeCode) return

      toast((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Nearby Share</span>
          <span className="text-xs text-gray-500">Receive {filename || 'file'}?</span>

          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                navigate(`/download/${safeCode}`)
                toast.dismiss(t.id)
              }}
              className="btn-primary text-xs py-1"
              style={{ touchAction: 'manipulation' }}
            >
              Accept
            </button>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="btn-secondary text-xs py-1"
              style={{ touchAction: 'manipulation' }}
            >
              Decline
            </button>
          </div>
        </div>
      ), { duration: 10000 })
    }

    socket.on('receive-transfer-offer', handleOffer)

    return () => {
      socket.off('receive-transfer-offer', handleOffer)
    }
  }, [socket, navigate])

  return null
}

// ── Root ─────────────────────────────────────
export default function App() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    const settings = getSettings()
    // Strictly respect user setting; don't auto-disable particles unless they explicitly want it
    return Boolean(settings.reducedMotion)
  })

  // Backend warm-up is now handled by ConnectionHealthProvider

  useEffect(() => {
    const syncSettings = () => {
      const settings = getSettings()
      setReducedMotion(Boolean(settings.reducedMotion))
    }

    window.addEventListener('swiftshare:settings-changed', syncSettings)
    return () => {
      window.removeEventListener('swiftshare:settings-changed', syncSettings)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', Boolean(reducedMotion))
  }, [reducedMotion])

  useEffect(() => {
    // Minimal viewport sync: use CSS 100dvh natively, only fallback to JS for legacy browsers
    // This removes viewport jitter caused by frequent resize recalculations
    const syncViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight
      const vh = Math.max(1, height * 0.01)
      // Only update if there's a meaningful change (> 10px), reducing thrashing
      const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-vh'))
      if (Math.abs(vh - current) > 0.1) {
        document.documentElement.style.setProperty('--app-vh', `${vh}px`)
      }
    }

    syncViewportHeight()
    // Use passive listeners and debounce resize for better performance
    let resizeTimeout
    const debouncedSync = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(syncViewportHeight, 100)
    }
    window.addEventListener('resize', debouncedSync, { passive: true })
    window.addEventListener('orientationchange', syncViewportHeight, { passive: true })
    window.visualViewport?.addEventListener('resize', debouncedSync, { passive: true })

    return () => {
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', debouncedSync)
      window.removeEventListener('orientationchange', syncViewportHeight)
      window.visualViewport?.removeEventListener('resize', debouncedSync)
    }
  }, [])

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <SocketProvider>
        <ConnectionHealthProvider>
          <TransferProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              {/* <AmbientBackground /> */}
              <ConnectionBanner />
              <NearbyOfferListener />
              <Navbar />
              <AnimatedRoutes />
            </BrowserRouter>
            <Toaster
              position="bottom-center"
              gutter={8}
              containerStyle={{
                bottom: 'env(safe-area-inset-bottom, 24px)',
                zIndex: 9999,
              }}
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
                  maxWidth: '90vw',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
                success: { iconTheme: { primary: '#16A34A', secondary: 'var(--toast-bg)' } },
                error: { iconTheme: { primary: '#DC2626', secondary: 'var(--toast-bg)' } },
              }}
            />
            <ShortcutsOverlay />
          </TransferProvider>
        </ConnectionHealthProvider>
      </SocketProvider>
    </MotionConfig>
  )
}
