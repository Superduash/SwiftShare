import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, AlertCircle, FlipHorizontal, Flashlight, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'

function extractCodeFromText(text) {
  if (!text) return null
  const clean = String(text).trim()

  // Match /download/ABC123 or /g/ABC123 in URLs
  const urlMatch = clean.match(/(?:download|g)\/([A-Za-z0-9]{6})(?:\/|\?|#|$)/i)
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].toUpperCase()
  }

  // Direct 6-character transfer code
  const directMatch = clean.match(/^([A-Za-z0-9]{6})$/i)
  if (directMatch && directMatch[1]) {
    return directMatch[1].toUpperCase()
  }

  // Any 6-char alphanumeric word if URL contains it
  const genericMatch = clean.match(/([A-HJ-NP-Za-km-z2-9]{6})/i)
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].toUpperCase()
  }

  return null
}

export default function QRScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // back camera by default
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  // Stop camera tracks
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera()
    setLoading(true)
    setError(null)

    if (!navigator?.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported on this browser or device.')
      setLoading(false)
      return
    }

    try {
      // Check multiple video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        setHasMultipleCameras(videoDevices.length > 1)
      } catch {}

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const track = stream.getVideoTracks()[0]
      if (track) {
        const caps = track.getCapabilities?.() || {}
        setTorchSupported(Boolean(caps.torch))
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }

      setLoading(false)
      startScanning()
    } catch (err) {
      console.warn('[QRScanner] Camera access error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. You can still enter your 6-digit code manually.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera was found on this device.')
      } else {
        setError('Could not access camera. Please check permissions and try again.')
      }
      setLoading(false)
    }
  }, [facingMode, stopCamera])

  // Continuous frame scanner
  const startScanning = useCallback(() => {
    let detector = null
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      } catch {}
    }

    const scanFrame = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
        animFrameRef.current = requestAnimationFrame(scanFrame)
        return
      }

      const width = video.videoWidth || 640
      const height = video.videoHeight || 480

      // Hardware accelerated BarcodeDetector if available
      if (detector) {
        try {
          const barcodes = await detector.detect(video)
          if (barcodes && barcodes.length > 0) {
            for (const bc of barcodes) {
              const code = extractCodeFromText(bc.rawValue)
              if (code) {
                try { navigator.vibrate?.(60) } catch {}
                stopCamera()
                onScan(code)
                return
              }
            }
          }
        } catch {}
      }

      // jsQR software fallback
      canvas.width = Math.min(width, 480)
      canvas.height = Math.min(height, 480 * (height / width))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (qrCode && qrCode.data) {
          const code = extractCodeFromText(qrCode.data)
          if (code) {
            try { navigator.vibrate?.(60) } catch {}
            stopCamera()
            onScan(code)
            return
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame)
    }

    animFrameRef.current = requestAnimationFrame(scanFrame)
  }, [onScan, stopCamera])

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const next = !torchOn
      await track.applyConstraints({
        advanced: [{ torch: next }],
      })
      setTorchOn(next)
    } catch (err) {
      console.warn('[QRScanner] Torch toggle failed:', err)
    }
  }

  // Switch between front and back camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  useEffect(() => {
    if (open) {
      void startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="qr-scanner-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Scan QR Code"
        >
          <motion.div
            key="qr-scanner-card"
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative"
            style={{
              background: 'var(--surface, #180C05)',
              border: '1px solid var(--border)',
            }}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Camera size={15} />
                </div>
                <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
                  Scan Transfer QR
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon !w-8 !h-8"
                aria-label="Close QR scanner"
              >
                <X size={16} />
              </button>
            </div>

            {/* Viewfinder Viewport */}
            <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Loading State */}
              {loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
                  <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                  <p className="text-xs font-medium text-gray-300">Starting camera...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-black/85 text-white">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-red-500/20 text-red-400 border border-red-500/30">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-sm font-semibold mb-2">Camera Unavailable</p>
                  <p className="text-xs text-gray-400 max-w-xs mb-5 leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary text-xs !py-2 !px-4"
                  >
                    Enter Code Manually
                  </button>
                </div>
              )}

              {/* Animated Target Reticle (Only when camera is active) */}
              {!loading && !error && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-white/20">
                    {/* Corner Reticles */}
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: 'var(--accent)' }} />
                    <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: 'var(--accent)' }} />
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: 'var(--accent)' }} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: 'var(--accent)' }} />

                    {/* Laser scanning line */}
                    <motion.div
                      className="w-full h-0.5 shadow-md"
                      style={{
                        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                        boxShadow: '0 0 8px var(--accent)',
                      }}
                      animate={{ y: [0, 220, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between bg-[var(--surface)] text-xs" style={{ color: 'var(--text-3)' }}>
              <span>Align QR code inside the box</span>
              <div className="flex items-center gap-2">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`btn-icon !w-8 !h-8 ${torchOn ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : ''}`}
                    title={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                    aria-label="Toggle flashlight"
                  >
                    <Flashlight size={15} />
                  </button>
                )}
                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={flipCamera}
                    className="btn-icon !w-8 !h-8"
                    title="Switch camera"
                    aria-label="Switch camera"
                  >
                    <FlipHorizontal size={15} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
