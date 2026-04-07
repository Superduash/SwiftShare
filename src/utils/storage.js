const KEYS = {
  RECENT: 'swiftshare_recent',
  SETTINGS: 'swiftshare_settings',
  THEME: 'swiftshare_theme',
  PWA_DISMISSED: 'swiftshare_pwa_dismissed',
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
  return safeGet(KEYS.RECENT, [])
}
export function saveTransfer(entry) {
  const list = getRecentTransfers().filter(t => t.code !== entry.code)
  list.unshift({ ...entry, savedAt: new Date().toISOString() })
  safeSet(KEYS.RECENT, list.slice(0, 5))
}
export function clearTransfers() {
  localStorage.removeItem(KEYS.RECENT)
}

// ── Settings ───────────────────────────────
const DEFAULT_SETTINGS = {
  defaultExpiry: 60,
  defaultBurn: false,
}
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeGet(KEYS.SETTINGS, {}) }
}
export function saveSettings(patch) {
  safeSet(KEYS.SETTINGS, { ...getSettings(), ...patch })
}

// ── Theme ──────────────────────────────────
export function getTheme() {
  return safeGet(KEYS.THEME, 'light')
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
