import { Component, useState, Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import {
  BrowserRouter, Routes, Route, Navigate,
  useLocation, useNavigate, useParams,
} from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { HelmetProvider, Helmet } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

import { SocketProvider, useSocket } from './context/SocketContext'
import { TransferProvider } from './context/TransferContext'
import { ConnectionHealthProvider } from './context/ConnectionHealthContext'
import { getSettings } from './utils/storage'
import { reportClientError } from './services/api'


import LoadingScreen from './components/LoadingScreen'
import ConnectionBanner from './components/ConnectionBanner'
import Navbar from './components/Navbar'
import AmbientBackground from './components/AmbientBackground'
// ── Error boundary for lazy routes ───────────
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, isChunkError: false, autoReloaded: false }
  }
  static getDerivedStateFromError(error) {
    // ChunkLoadError happens when a new deploy removes old chunk hashes
    const isChunkError = /chunk|loading chunk|failed to fetch dynamically imported|error loading dynamically imported|dynamically imported module|ChunkLoadError/i.test(
      String(error?.message || error?.name || '')
    )
    return { hasError: true, error, isChunkError }
  }
  componentDidCatch(error, info) {
    console.error('[SwiftShare] Route failed to load:', error, info)
    
    if (this.state.isChunkError) {
      const lastReload = sessionStorage.getItem('swiftshare_last_chunk_reload')
      const now = Date.now()
      // Auto reload ONCE when a chunk error occurs. Guard against infinite loop.
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('swiftshare_last_chunk_reload', String(now))
        window.location.reload()
        return
      } else {
        // Mark as already auto-reloaded in this error cycle so fallback UI knows
        this.setState({ autoReloaded: true })
      }
    }

    try {
      reportClientError(error, info)
    } catch (e) {
      // ignore
    }
  }
  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        if (!this.state.autoReloaded) {
          const lastReload = sessionStorage.getItem('swiftshare_last_chunk_reload')
          const now = Date.now()
          if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
            return (
              <div style={{ minHeight: 'calc(var(--app-vh) * 100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px', padding: '20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1.1rem' }}>⚡ Updating SwiftShare...</p>
                <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>Reloading to fetch the latest version.</p>
              </div>
            )
          }
        }
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
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

// Lazy — SEO content pages
const HowItWorksPage = lazy(() => import('./pages/content/HowItWorksPage'))
const NoSignupPage = lazy(() => import('./pages/content/NoSignupPage'))
const QrSharePage = lazy(() => import('./pages/content/QrSharePage'))
const SelfDestructPage = lazy(() => import('./pages/content/SelfDestructPage'))
const PasswordProtectedPage = lazy(() => import('./pages/content/PasswordProtectedPage'))
const SnippetSharePage = lazy(() => import('./pages/content/SnippetSharePage'))
const AirDropAlternativePage = lazy(() => import('./pages/content/AirDropAlternativePage'))
const SecurityPage = lazy(() => import('./pages/content/SecurityPage'))
const FaqPage = lazy(() => import('./pages/content/FaqPage'))
const PrivacyPage = lazy(() => import('./pages/content/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/content/TermsPage'))
const ReportAbusePage = lazy(() => import('./pages/content/ReportAbusePage'))

import { trackPageView } from './utils/analytics'

// ── Route Tracker for Analytics ──────────────
function RouteTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])
  return null
}

// ── Page transition wrapper ──────────────────
const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.08, ease: 'easeIn' }
  },
}

function PageWrapper({ children }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        transform: 'translateZ(0)',
        willChange: 'opacity',
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
              
              {/* Informational & SEO Content Pages */}
              <Route path="/how-it-works" element={<PageWrapper><HowItWorksPage /></PageWrapper>} />
              <Route path="/send-files-without-signup" element={<PageWrapper><NoSignupPage /></PageWrapper>} />
              <Route path="/share-files-with-qr-code" element={<PageWrapper><QrSharePage /></PageWrapper>} />
              <Route path="/self-destructing-file-sharing" element={<PageWrapper><SelfDestructPage /></PageWrapper>} />
              <Route path="/password-protected-file-transfer" element={<PageWrapper><PasswordProtectedPage /></PageWrapper>} />
              <Route path="/share-text-and-code-snippets" element={<PageWrapper><SnippetSharePage /></PageWrapper>} />
              <Route path="/airdrop-alternative" element={<PageWrapper><AirDropAlternativePage /></PageWrapper>} />
              <Route path="/security" element={<PageWrapper><SecurityPage /></PageWrapper>} />
              <Route path="/faq" element={<PageWrapper><FaqPage /></PageWrapper>} />
              <Route path="/privacy" element={<PageWrapper><PrivacyPage /></PageWrapper>} />
              <Route path="/terms" element={<PageWrapper><TermsPage /></PageWrapper>} />
              <Route path="/report-abuse" element={<PageWrapper><ReportAbusePage /></PageWrapper>} />

              {/* Admin Panel */}
              <Route path="/admin" element={<PageWrapper><AdminLogin /></PageWrapper>} />
              <Route path="/admin/*" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
              
              {/* 404 Fallback */}
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

function AppContent() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      <RouteTracker />
      {!isAdmin && <AmbientBackground />}
      <ConnectionBanner />
      {!isAdmin && <NearbyOfferListener />}
      {!isAdmin && <Navbar />}
      <AnimatedRoutes />
    </>
  )
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
    <HelmetProvider>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <SocketProvider>
          <ConnectionHealthProvider>
          <TransferProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppContent />
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
          </TransferProvider>
        </ConnectionHealthProvider>
      </SocketProvider>
    </MotionConfig>
    </HelmetProvider>
  )
}
