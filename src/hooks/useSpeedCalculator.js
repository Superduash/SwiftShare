import { useRef, useCallback } from 'react'

/**
 * useSpeedCalculator — Exponential Moving Average (EMA) speed tracker.
 *
 * Alpha = 0.5 (balances responsiveness vs smoothness per spec §3.2).
 * Samples at minimum 250ms intervals so rapid XHR callbacks don't thrash.
 * Returns helpers to update speed and format display strings.
 */
export function useSpeedCalculator(alpha = 0.5, minIntervalMs = 250) {
  const stateRef = useRef({
    lastTimestamp: 0,
    lastLoaded: 0,
    smoothedSpeed: 0, // bytes/sec
  })

  /**
   * Update the speed estimate.
   * @param {number} loaded  bytes loaded so far
   * @param {number} timestamp  current timestamp (ms) — defaults to Date.now()
   * @returns {number} smoothed bytes/sec
   */
  const update = useCallback((loaded, timestamp = Date.now()) => {
    const s = stateRef.current

    if (s.lastTimestamp === 0) {
      s.lastTimestamp = timestamp
      s.lastLoaded = loaded
      return 0
    }

    const dt = (timestamp - s.lastTimestamp) / 1000 // seconds
    if (dt < minIntervalMs / 1000) return s.smoothedSpeed // too soon

    const deltaBytes = Math.max(0, loaded - s.lastLoaded)
    const instantSpeed = deltaBytes / dt

    s.smoothedSpeed =
      s.smoothedSpeed > 0
        ? alpha * instantSpeed + (1 - alpha) * s.smoothedSpeed
        : instantSpeed

    s.lastTimestamp = timestamp
    s.lastLoaded = loaded

    return s.smoothedSpeed
  }, [alpha, minIntervalMs])

  /** Get ETA in seconds. Returns 0 when speed is 0 or upload complete. */
  const getETA = useCallback((loaded, total) => {
    const s = stateRef.current
    if (!s.smoothedSpeed || loaded >= total) return 0
    return Math.ceil((total - loaded) / s.smoothedSpeed)
  }, [])

  /** Reset all state (call between uploads). */
  const reset = useCallback(() => {
    stateRef.current = { lastTimestamp: 0, lastLoaded: 0, smoothedSpeed: 0 }
  }, [])

  return { update, getETA, reset, stateRef }
}

/**
 * Format bytes/sec as a human-readable speed string.
 * Always 1 decimal place. Switches unit at powers of 1000.
 */
export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || !Number.isFinite(bytesPerSecond) || bytesPerSecond < 0)
    return ''
  if (bytesPerSecond < 1_000_000) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  } else if (bytesPerSecond < 1_000_000_000) {
    return `${(bytesPerSecond / 1_048_576).toFixed(1)} MB/s`
  } else {
    return `${(bytesPerSecond / 1_073_741_824).toFixed(1)} GB/s`
  }
}

/**
 * Format seconds remaining as "Xs left" or "Xm Ys left".
 * Returns '' when seconds is 0, infinite, or NaN.
 */
export function formatETA(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return ''
  const s = Math.round(seconds)
  if (s < 60) return `${s}s left`
  const m = Math.floor(s / 60)
  const remS = s % 60
  return `${m}m ${remS}s left`
}
