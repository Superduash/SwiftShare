// Password session storage (5 minute expiry)
// Shared utility used by SenderPage and DownloadPage
const PASSWORD_SESSION_KEY_PREFIX = 'pwd_session_'
const PASSWORD_SESSION_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

export function savePasswordSession(code, password) {
  if (!code || !password) return
  const normalizedCode = String(code).toUpperCase().trim()
  if (!normalizedCode) return

  const key = `${PASSWORD_SESSION_KEY_PREFIX}${normalizedCode}`
  const session = {
    password,
    expiresAt: Date.now() + PASSWORD_SESSION_EXPIRY_MS
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(session))
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Failed to save password session:', e)
  }
}

export function getPasswordSession(code) {
  if (!code) return null
  const normalizedCode = String(code).toUpperCase().trim()
  const key = `${PASSWORD_SESSION_KEY_PREFIX}${normalizedCode}`

  try {
    const stored = sessionStorage.getItem(key)
    if (!stored) return null

    const session = JSON.parse(stored)
    if (!session || !session.password || !session.expiresAt) return null

    // Check if expired
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(key)
      return null
    }

    return session.password
  } catch (e) {
    return null
  }
}

export function clearPasswordSession(code) {
  if (!code) return
  const normalizedCode = String(code).toUpperCase().trim()
  const key = `${PASSWORD_SESSION_KEY_PREFIX}${normalizedCode}`
  try {
    sessionStorage.removeItem(key)
  } catch (e) {
    // ignore
  }
}
