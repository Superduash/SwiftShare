import React, { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getErrorInfo } from '../utils/errors'

function ErrorState({ code, title, description, action, onAction, onRetry, autoRetry = false }) {
  const navigate = useNavigate()
  const info = code ? getErrorInfo(code) : null
  const Icon = info?.icon
  const displayTitle = title || info?.title || 'Error'
  const displayDesc = description || info?.description || 'Something went wrong.'
  const displayAction = action || (onRetry ? 'Retry' : info?.action || 'Go home')
  const color = info?.color || 'var(--danger)'
  const isRetryable = code === 'NETWORK_ERROR' || code === 'TIMEOUT_ERROR' || code === 'SERVER_ERROR'
  const [retrying, setRetrying] = useState(false)
  const [countdown, setCountdown] = useState(autoRetry && isRetryable ? 5 : 0)
  const retryInFlightRef = useRef(false)

  useEffect(() => {
    setCountdown(autoRetry && isRetryable ? 5 : 0)
  }, [autoRetry, isRetryable, code])

  // Auto-retry countdown for network errors
  useEffect(() => {
    if (!autoRetry || !isRetryable || !onRetry) return
    if (countdown <= 0) return

    const timer = setTimeout(() => {
      if (countdown === 1) {
        handleRetry()
      } else {
        setCountdown(countdown - 1)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, autoRetry, isRetryable, onRetry])

  async function handleRetry() {
    if (retryInFlightRef.current) return

    if (onRetry) {
      retryInFlightRef.current = true
      setRetrying(true)
      setCountdown(0)
      try {
        await onRetry()
      } catch {
        // onRetry handles its own error state
      }
      setRetrying(false)
      retryInFlightRef.current = false
      return
    }
    handleAction()
  }

  function handleAction() {
    if (onAction) return onAction()
    if (onRetry) return handleRetry()
    navigate('/')
  }

  return (
    <motion.div
      className="text-center py-12 px-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: `${color}12` }}
        >
          <Icon size={28} style={{ color }} />
        </div>
      )}
      <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>{displayTitle}</h2>
      <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--text-3)' }}>{displayDesc}</p>
      <button
        className="btn-primary mx-auto"
        onClick={handleAction}
        disabled={retrying}
      >
        {retrying ? 'Retrying...' : displayAction}
      </button>
      {countdown > 0 && (
        <p className="text-xs mt-3" style={{ color: 'var(--text-4)' }}>
          Auto-retrying in {countdown}s...
        </p>
      )}
    </motion.div>
  )
}

export default memo(ErrorState)
