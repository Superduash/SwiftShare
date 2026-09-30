/**
 * SwiftShare Privacy-Preserving Analytics Tracker
 *
 * - No third-party scripts, no cross-site cookies, no canvas/hardware fingerprinting.
 * - Respects Do Not Track (DNT) & Global Privacy Control (GPC).
 * - Excludes admin navigation and authenticated admin sessions.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

function getUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getVisitorId() {
  try {
    let vid = localStorage.getItem('swiftshare_vid')
    if (!vid || !/^[0-9a-f-]{36}$/i.test(vid)) {
      vid = getUUID()
      localStorage.setItem('swiftshare_vid', vid)
    }
    return vid
  } catch {
    return ''
  }
}

function getSessionId() {
  try {
    let sid = sessionStorage.getItem('swiftshare_sid')
    if (!sid || !/^[0-9a-f-]{36}$/i.test(sid)) {
      sid = getUUID()
      sessionStorage.setItem('swiftshare_sid', sid)
    }
    return sid
  } catch {
    return ''
  }
}

async function getVisitorCountry() {
  try {
    const cached = sessionStorage.getItem('swiftshare_geo_country')
    if (cached !== null) return cached

    const res = await fetch('/api/geo', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      const country = typeof data?.country === 'string' ? data.country.trim().toUpperCase() : ''
      sessionStorage.setItem('swiftshare_geo_country', country)
      return country
    }
  } catch {
    // Fail silently in local development or if edge function is unavailable
  }
  return ''
}

export function normalizeRoute(pathname) {
  if (!pathname || typeof pathname !== 'string') return '/'
  const clean = pathname.split('?')[0].split('#')[0].trim()
  if (!clean || clean === '/') return '/'

  if (/^\/g\/[A-Za-z0-9_-]+/i.test(clean)) return '/g/:code'
  if (/^\/download\/[A-Za-z0-9_-]+/i.test(clean)) return '/download/:code'
  if (/^\/sender\/[A-Za-z0-9_-]+/i.test(clean)) return '/sender/:code'

  return clean.replace(/\/+$/, '').toLowerCase()
}

export function shouldTrack() {
  // Check explicit opt-out
  try {
    if (localStorage.getItem('swiftshare_no_track') === '1') return false
    // Skip tracking if admin token exists in session
    if (sessionStorage.getItem('swiftshare_admin_token') || localStorage.getItem('swiftshare_admin_token')) {
      return false
    }
  } catch {}

  // Check browser privacy signals (DNT / GPC)
  if (typeof navigator !== 'undefined') {
    if (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') return false
    if (navigator.globalPrivacyControl === true) return false
    if (window.doNotTrack === '1') return false
  }

  return true
}

let lastTrackedRoute = null
let lastTrackedTime = 0

export async function trackPageView(pathname) {
  if (!pathname) return
  if (pathname.startsWith('/admin')) return
  if (!shouldTrack()) return

  const normalized = normalizeRoute(pathname)
  const now = Date.now()

  // Prevent duplicate beacons on hot component re-renders
  if (lastTrackedRoute === normalized && now - lastTrackedTime < 3000) {
    return
  }
  lastTrackedRoute = normalized
  lastTrackedTime = now

  const country = await getVisitorCountry()
  const searchParams = new URLSearchParams(window.location.search)

  const payload = {
    route: normalized,
    ref: document.referrer || '',
    country,
    vid: getVisitorId(),
    sid: getSessionId(),
    utm_source: searchParams.get('utm_source') || '',
    utm_medium: searchParams.get('utm_medium') || '',
    utm_campaign: searchParams.get('utm_campaign') || '',
  }

  const endpoint = `${API_BASE}/api/analytics/pv`
  const jsonStr = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([jsonStr], { type: 'text/plain; charset=utf-8' })
    const sent = navigator.sendBeacon(endpoint, blob)
    if (sent) return
  }

  // Fallback to fetch with keepalive
  try {
    fetch(endpoint, {
      method: 'POST',
      body: jsonStr,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {}
}
