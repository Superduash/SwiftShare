const KEYS = {
  RECENT: 'swiftshare_recent',
  SETTINGS: 'swiftshare_settings',
  THEME: 'swiftshare_theme',
  PWA_DISMISSED: 'swiftshare_pwa_dismissed',
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Recent Transfers ───────────────────────
export function getRecentTransfers() {
  return safeGet(KEYS.RECENT, []).map((entry) => ({
    ...entry,
    code: normalizeCode(entry?.code),
  }))
}
export function saveTransfer(entry) {
  const normalizedCode = normalizeCode(entry?.code)
  if (!normalizedCode) return

  const list = getRecentTransfers().filter(t => t.code !== normalizedCode)
  list.unshift({ ...entry, code: normalizedCode, savedAt: new Date().toISOString() })
  safeSet(KEYS.RECENT, list.slice(0, 10))
}
export function removeTransfer(code) {
  const normalizedCode = normalizeCode(code)
  const list = getRecentTransfers().filter(t => t.code !== normalizedCode)
  safeSet(KEYS.RECENT, list)
}
export function updateTransferStatus(code, status) {
  const normalizedCode = normalizeCode(code)
  const list = getRecentTransfers().map(t =>
    t.code === normalizedCode ? { ...t, status } : t
  )
  safeSet(KEYS.RECENT, list)
}
export function clearTransfers() {
  localStorage.removeItem(KEYS.RECENT)
}

// ── Settings ───────────────────────────────
const DEFAULT_SETTINGS = {
  defaultExpiry: 60,
  defaultBurn: false,
  reducedMotion: false,
  soundEnabled: true,
}
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeGet(KEYS.SETTINGS, {}) }
}
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  safeSet(KEYS.SETTINGS, next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('swiftshare:settings-changed', { detail: next }))
  }
}

// ── Theme ──────────────────────────────────
export function getTheme() {
  return safeGet(KEYS.THEME, 'terracotta')
}
export function saveTheme(theme) {
  safeSet(KEYS.THEME, theme)
}

// ── PWA ────────────────────────────────────
export function isPWADismissed() {
  return safeGet(KEYS.PWA_DISMISSED, false)
}
export function dismissPWA() {
  safeSet(KEYS.PWA_DISMISSED, true)
}
