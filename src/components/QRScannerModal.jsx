import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Camera,
  AlertCircle,
  FlipHorizontal,
  Flashlight,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
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
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null) // 'denied' | 'notfound' | 'unsupported' | 'generic'
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // back camera by default
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [imageScanning, setImageScanning] = useState(false)

  // Stop camera tracks and animations
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
    setTorchOn(false)
  }, [])

  // Robust multi-tier camera acquisition
  const acquireStream = useCallback(async (facing) => {
    const attempts = [
      // 1. High-res environment camera
      { video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      // 2. Standard environment camera
      { video: { facingMode: { ideal: facing } }, audio: false },
      // 3. Fallback exact facing mode
      { video: { facingMode: facing }, audio: false },
      // 4. Basic video stream (works on any device/webcam)
      { video: true, audio: false },
    ]

    let lastError = null
    for (const constraints of attempts) {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          return await navigator.mediaDevices.getUserMedia(constraints)
        } else if (navigator?.getUserMedia) {
          return await new Promise((res, rej) => navigator.getUserMedia(constraints, res, rej))
        } else if (navigator?.webkitGetUserMedia) {
          return await new Promise((res, rej) => navigator.webkitGetUserMedia(constraints, res, rej))
        }
      } catch (err) {
        lastError = err
        // If user explicitly denied permission, do not keep spamming constraints
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
          throw err
        }
      }
    }

    throw lastError || new Error('Camera unavailable')
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera()
    setLoading(true)
    setError(null)
    setErrorType(null)

    const hasMediaSupport = Boolean(
      typeof navigator !== 'undefined' &&
      (navigator?.mediaDevices?.getUserMedia || navigator?.getUserMedia || navigator?.webkitGetUserMedia)
    )

    if (!hasMediaSupport) {
      setError('Camera access is not supported on this browser. You can upload a QR image or enter your code.')
      setErrorType('unsupported')
      setLoading(false)
      return
    }

    try {
      const stream = await acquireStream(facingMode)
      streamRef.current = stream

      // Check capabilities (torch)
      const track = stream.getVideoTracks()[0]
      if (track) {
        const caps = track.getCapabilities?.() || {}
        setTorchSupported(Boolean(caps.torch))
      }

      // Check multiple video devices asynchronously without blocking
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().then((devices) => {
            const videoDevices = devices.filter((d) => d.kind === 'videoinput')
            setHasMultipleCameras(videoDevices.length > 1)
          }).catch(() => {})
        }
      } catch {}

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }

      setLoading(false)
      startScanning()
    } catch (err) {
      console.warn('[QRScanner] Camera access error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        setError('Camera permission was blocked. Please allow camera access in your browser or phone settings.')
        setErrorType('denied')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera was found on this device. You can upload a QR image instead.')
        setErrorType('notfound')
      } else {
        setError('Could not access the camera. Tap below to retry or upload a QR image.')
        setErrorType('generic')
      }
      setLoading(false)
    }
  }, [facingMode, stopCamera, acquireStream])

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

  // Scan QR code from an uploaded image file
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageScanning(true)
    try {
      const img = new Image()
      const url = URL.createObjectURL(file)

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
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

      setError('No valid SwiftShare QR code was found in this image. Try another photo or enter code manually.')
      setErrorType('generic')
    } catch (err) {
      console.warn('[QRScanner] Failed to decode image file:', err)
      setError('Could not read image file. Please try another photo.')
      setErrorType('generic')
    } finally {
      setImageScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white p-4 text-center">
                  <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                  <p className="text-xs font-semibold text-gray-200">Requesting camera access...</p>
                  <p className="text-[11px] text-gray-400 max-w-xs">If prompted by your browser, tap Allow.</p>
                </div>
              )}

              {/* Image Processing Overlay */}
              {imageScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white z-20">
                  <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
                  <p className="text-xs font-medium text-gray-300">Decoding QR image...</p>
                </div>
              )}

              {/* Error & Permission Blocked State */}
              {error && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-black/90 text-white overflow-y-auto">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-sm font-bold mb-1">Camera Permission & Access</p>
                  <p className="text-xs text-gray-300 max-w-xs mb-4 leading-relaxed">{error}</p>

                  <div className="flex flex-col w-full max-w-xs gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="btn-primary w-full text-xs !py-2.5 flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} />
                      <span>Grant Access & Retry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                      }}
                    >
                      <ImageIcon size={14} />
                      <span>Upload QR Photo / Screenshot</span>
                    </button>
                  </div>

                  {/* Collapsible Site Settings Guide for PWA / Mobile */}
                  <div className="w-full max-w-xs text-left mt-2">
                    <button
                      type="button"
                      onClick={() => setShowHelp(!showHelp)}
                      className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                      <HelpCircle size={12} />
                      <span>How to enable in Site Settings</span>
                      {showHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {showHelp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-300 space-y-1.5"
                      >
                        <p className="font-semibold text-white">To allow camera access:</p>
                        <ul className="list-disc pl-4 space-y-1 text-gray-300">
                          <li><strong className="text-white">Android / Chrome / PWA:</strong> Tap the lock/tune icon in the address bar (or Phone Settings &gt; Apps &gt; SwiftShare &gt; Permissions) &gt; Set Camera to <em>Allow</em>.</li>
                          <li><strong className="text-white">iPhone / Safari / PWA:</strong> Open Phone Settings &gt; Safari (or SwiftShare) &gt; Camera &gt; Select <em>Allow</em>.</li>
                          <li><strong className="text-white">Desktop:</strong> Click the camera/lock icon beside the URL in your browser &gt; Select <em>Always Allow</em>.</li>
                        </ul>
                      </motion.div>
                    )}
                  </div>
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

            {/* Hidden file input for uploading QR photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Bottom Controls */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between bg-[var(--surface)] text-xs" style={{ color: 'var(--text-3)' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-[var(--accent)] transition-colors"
                style={{ color: 'var(--text-2)' }}
              >
                <ImageIcon size={14} />
                <span>Upload QR image</span>
              </button>

              <div className="flex items-center gap-2">
                {torchSupported && !error && (
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
                {hasMultipleCameras && !error && (
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
