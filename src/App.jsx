import React, { Suspense, lazy, useEffect } from 'react'
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

// ── Error boundary for lazy routes ───────────
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[SwiftShare] Route failed to load:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px' }}>
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
        <RouteErrorBoundary>
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
        </RouteErrorBoundary>
      </AnimatePresence>
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
            >
              Accept
            </button>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="btn-secondary text-xs py-1"
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
  const [reducedMotion, setReducedMotion] = React.useState(() => getSettings().reducedMotion)

  // Backend warm-up is now handled by ConnectionHealthProvider

  useEffect(() => {
    const syncSettings = () => setReducedMotion(getSettings().reducedMotion)
    window.addEventListener('swiftshare:settings-changed', syncSettings)
    return () => window.removeEventListener('swiftshare:settings-changed', syncSettings)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', Boolean(reducedMotion))
  }, [reducedMotion])

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <SocketProvider>
        <ConnectionHealthProvider>
          <TransferProvider>
            <BrowserRouter>
              <ConnectionBanner />
              <NearbyOfferListener />
              <AnimatedRoutes />
            </BrowserRouter>
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
        </ConnectionHealthProvider>
      </SocketProvider>
    </MotionConfig>
  )
}
