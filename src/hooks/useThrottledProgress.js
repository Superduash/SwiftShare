import { useRef, useState, useEffect } from 'react'

/**
 * useThrottledProgress — coalesces rapid progress updates to one React
 * re-render per animation frame (≤16 ms).
 *
 * Prevents excessive re-renders when XHR onprogress fires at 100fps on fast
 * LAN connections while keeping the UI visually smooth.
 *
 * @param {number} value  latest progress value (0–100)
 * @returns {number} throttled value, updated at most once per rAF tick
 */
export function useThrottledProgress(value) {
  const rafIdRef = useRef(null)
  const [throttled, setThrottled] = useState(value)

  useEffect(() => {
    // Already have a frame scheduled — the scheduled callback will pick up the
    // latest `value` from closure on its own, so no need to reschedule.
    if (rafIdRef.current !== null) return

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      setThrottled((prev) => {
        // Clamp to [0,100] and prevent backward movement
        const clamped = Math.max(0, Math.min(100, value))
        return clamped > prev ? clamped : prev
      })
    })

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [value])

  return throttled
}
