const KEYS = {
  RECENT: 'swiftshare_recent',
  SETTINGS: 'swiftshare_settings',
  THEME: 'swiftshare_theme',
  PWA_DISMISSED: 'swiftshare_pwa_dismissed',
  TRANSFER_PREFIX: 'transfer_',
  AI_PREFIX: 'ai_',
}

const MAX_RECENT_TRANSFERS = 10;

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

function transferKey(code) {
  const normalized = normalizeCode(code)
  return normalized ? `${KEYS.TRANSFER_PREFIX}${normalized}` : ''
}

function aiKey(code) {
  const normalized = normalizeCode(code)
  return normalized ? `${KEYS.AI_PREFIX}${normalized}` : ''
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toPositiveNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : 0
}

function mergeDefined(prevObj, nextObj) {
  const base = isObject(prevObj) ? { ...prevObj } : {}
  const incoming = isObject(nextObj) ? nextObj : {}

  Object.entries(incoming).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      base[key] = value
    }
  })

  return base
}

function sumFileSizes(files) {
  if (!Array.isArray(files) || !files.length) return 0
  return files.reduce((sum, file) => {
    const size = toPositiveNumber(file?.size)
      || toPositiveNumber(file?.fileSize)
      || toPositiveNumber(file?.bytes)
    return sum + size
  }, 0)
}

function mergeFileMetadata(prevFile, nextFile) {
  const prevSafe = isObject(prevFile) ? prevFile : {}
  const nextSafe = isObject(nextFile) ? nextFile : {}
  const merged = { ...prevSafe, ...nextSafe }

  const prevSize = toPositiveNumber(prevSafe.size) || toPositiveNumber(prevSafe.fileSize) || toPositiveNumber(prevSafe.bytes)
  const nextSize = toPositiveNumber(nextSafe.size) || toPositiveNumber(nextSafe.fileSize) || toPositiveNumber(nextSafe.bytes)

  if (!nextSize && prevSize) {
    if (toPositiveNumber(prevSafe.size)) merged.size = prevSafe.size
    if (toPositiveNumber(prevSafe.fileSize)) merged.fileSize = prevSafe.fileSize
    if (toPositiveNumber(prevSafe.bytes)) merged.bytes = prevSafe.bytes
    if (!toPositiveNumber(merged.size)) merged.size = prevSize
  }

  return merged
}

function mergeFiles(prevFiles, nextFiles) {
  const prevList = Array.isArray(prevFiles) ? prevFiles : []
  const nextList = Array.isArray(nextFiles) ? nextFiles : []

  if (!nextList.length) {
    return prevList
  }

  // If the next payload has fewer files than the current snapshot, keep unmatched previous files.
  if (prevList.length > nextList.length) {
    const merged = [...prevList]
    for (let idx = 0; idx < nextList.length; idx += 1) {
      const nextFile = nextList[idx]
      const byName = prevList.find((file) => String(file?.name || '') === String(nextFile?.name || ''))
      merged[idx] = mergeFileMetadata(byName || prevList[idx], nextFile)
    }
    return merged
  }

  return nextList.map((nextFile, idx) => {
    const byName = prevList.find((file) => String(file?.name || '') === String(nextFile?.name || ''))
    return mergeFileMetadata(byName || prevList[idx], nextFile)
  })
}

export function mergeTransferData(prevData, nextData) {
  const prevSafe = isObject(prevData) ? prevData : null
  const nextSafe = isObject(nextData) ? nextData : null

  if (!prevSafe && !nextSafe) return null
  if (!prevSafe) {
    const normalizedOnly = { ...nextSafe, code: normalizeCode(nextSafe?.code) }
    if (!Array.isArray(normalizedOnly.files)) {
      normalizedOnly.files = []
    }
    return normalizedOnly
  }
  if (!nextSafe) {
    const normalizedOnly = { ...prevSafe, code: normalizeCode(prevSafe?.code) }
    if (!Array.isArray(normalizedOnly.files)) {
      normalizedOnly.files = []
    }
    return normalizedOnly
  }

  const merged = mergeDefined(prevSafe, nextSafe)

  merged.code = normalizeCode(nextSafe.code || prevSafe.code)
  merged.files = mergeFiles(prevSafe.files, nextSafe.files)

  if (!nextSafe.ai && prevSafe.ai) {
    merged.ai = prevSafe.ai
  }

  const nextTotal = toPositiveNumber(nextSafe.totalSize)
  const prevTotal = toPositiveNumber(prevSafe.totalSize)
  if (!nextTotal && prevTotal) {
    merged.totalSize = prevTotal
  } else if (nextTotal) {
    merged.totalSize = nextTotal
  }

  if (!toPositiveNumber(merged.totalSize)) {
    const inferred = sumFileSizes(merged.files)
    if (inferred > 0) {
      merged.totalSize = inferred
    }
  }

  return merged
}

function clearPrefix(prefix) {
  try {
    const keysToRemove = []
    for (let idx = 0; idx < localStorage.length; idx += 1) {
      const key = localStorage.key(idx)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {}
}

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
function evictOldestCacheEntries() {
  try {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(KEYS.TRANSFER_PREFIX) || key.startsWith(KEYS.AI_PREFIX))) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          entries.push({ key, savedAt: parsed?.savedAt ? new Date(parsed.savedAt).getTime() : 0 });
        } catch {
          entries.push({ key, savedAt: 0 });
        }
      }
    }
    // Sort by age (oldest first) and delete up to 5 entries
    entries
      .sort((a, b) => a.savedAt - b.savedAt)
      .slice(0, 5)
      .forEach(({ key }) => { try { localStorage.removeItem(key) } catch {} });
  } catch {}
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      cleanExpiredCache()
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (retryError) {
        evictOldestCacheEntries()
        try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
      }
    }
  }
}

export function getCachedTransfer(code) {
  const key = transferKey(code)
  if (!key) return null
  const cached = safeGet(key, null)
  return mergeTransferData(null, cached)
}

export function saveCachedTransfer(code, transferData) {
  const normalizedCode = normalizeCode(code)
  if (!normalizedCode || !isObject(transferData)) return null

  const key = transferKey(normalizedCode)
  const existing = getCachedTransfer(normalizedCode)
  const merged = mergeTransferData(existing, { ...transferData, code: normalizedCode })
  if (!merged) return null

  safeSet(key, merged)
  return merged
}

export function removeCachedTransfer(code) {
  const key = transferKey(code)
  if (!key) return
  try { localStorage.removeItem(key) } catch {}
}

export function getCachedAI(code) {
  const key = aiKey(code)
  if (!key) return null
  return safeGet(key, null)
}

export function saveCachedAI(code, aiData) {
  const normalizedCode = normalizeCode(code)
  if (!normalizedCode || !aiData) return
  safeSet(aiKey(normalizedCode), aiData)
}

export function removeCachedAI(code) {
  const key = aiKey(code)
  if (!key) return
  try { localStorage.removeItem(key) } catch {}
}

// ── Cache expiration cleanup ───────────────
// Runs once on module load to evict stale transfer/AI cache entries.
// Prevents localStorage from growing unboundedly on devices that share many files.
function cleanExpiredCache() {
  try {
    const now = Date.now()
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (!key.startsWith(KEYS.TRANSFER_PREFIX) && !key.startsWith(KEYS.AI_PREFIX)) continue
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        // Remove if expired (expiresAt in the past) or older than 24h (no expiresAt)
        const expiresAt = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : 0
        const savedAt = parsed?.savedAt ? new Date(parsed.savedAt).getTime() : 0
        const age = now - (savedAt || 0)
        if ((expiresAt && now > expiresAt) || (!expiresAt && age > 24 * 60 * 60 * 1000)) {
          keysToRemove.push(key)
        }
      } catch {}
    }
    keysToRemove.forEach(k => { try { localStorage.removeItem(k) } catch {} })
  } catch {}
}

// Run cleanup on load (deferred to avoid blocking initial render)
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => cleanExpiredCache(), { timeout: 5000 });
  } else {
    setTimeout(cleanExpiredCache, 2000);
  }
}

// ── Recent Transfers ───────────────────────
// In-memory cache for getRecentTransfers
let _recentCache = null;

function invalidateRecentCache() {
  _recentCache = null;
}

export function getRecentTransfers() {
  if (_recentCache) return _recentCache;
  
  _recentCache = safeGet(KEYS.RECENT, []).map((entry) => {
    const normalizedCode = normalizeCode(entry?.code)
    const cachedTransfer = getCachedTransfer(normalizedCode)
    const cachedAI = getCachedAI(normalizedCode)
    const mergedTransfer = mergeTransferData(entry?.transfer || entry, cachedTransfer)
    const isSender = Boolean(
      entry?.isSender === true
      || mergedTransfer?.isSender === true
      || String(entry?.role || '').toLowerCase() === 'sender'
      || String(mergedTransfer?.role || '').toLowerCase() === 'sender'
    )

    return {
      ...entry,
      ...(mergedTransfer || {}),
      code: normalizedCode,
      isSender,
      role: isSender ? 'sender' : 'receiver',
      transfer: mergedTransfer || entry?.transfer || null,
      files: Array.isArray(mergedTransfer?.files) ? mergedTransfer.files : (Array.isArray(entry?.files) ? entry.files : []),
      ai: cachedAI || mergedTransfer?.ai || entry?.ai || null,
      filename: entry?.filename || mergedTransfer?.files?.[0]?.name || normalizedCode,
    }
  }).filter((entry) => Boolean(entry?.code));
  
  return _recentCache;
}

export function saveTransfer(entry) {
  invalidateRecentCache();
  const normalizedCode = normalizeCode(entry?.code)
  if (!normalizedCode) return

  const currentRecent = getRecentTransfers()
  const previousEntry = currentRecent.find((t) => t.code === normalizedCode) || null

  const shouldKeepSender = Boolean(
    entry?.isSender === true
    || previousEntry?.isSender === true
    || String(entry?.role || '').toLowerCase() === 'sender'
    || String(previousEntry?.role || '').toLowerCase() === 'sender'
  )
  const role = shouldKeepSender ? 'sender' : 'receiver'

  const transferSource = isObject(entry?.transfer) ? entry.transfer : (isObject(entry) ? entry : null)
  const transferPayload = transferSource ? { ...transferSource, isSender: shouldKeepSender, role } : null
  const mergedTransfer = transferPayload ? saveCachedTransfer(normalizedCode, transferPayload) : getCachedTransfer(normalizedCode)

  const aiFromEntry = entry?.ai || transferSource?.ai || null
  if (aiFromEntry) {
    saveCachedAI(normalizedCode, aiFromEntry)
  }

  const aiSnapshot = aiFromEntry || getCachedAI(normalizedCode) || mergedTransfer?.ai || null
  const filesSnapshot = Array.isArray(mergedTransfer?.files) && mergedTransfer.files.length
    ? mergedTransfer.files
    : (Array.isArray(entry?.files) ? entry.files : [])

  const list = currentRecent.filter(t => t.code !== normalizedCode)
  list.unshift({
    ...entry,
    code: normalizedCode,
    isSender: shouldKeepSender,
    role,
    filename: entry?.filename || filesSnapshot?.[0]?.name || normalizedCode,
    files: filesSnapshot,
    status: entry?.status || mergedTransfer?.status,
    expiresAt: entry?.expiresAt || mergedTransfer?.expiresAt,
    createdAt: entry?.createdAt || mergedTransfer?.createdAt,
    ai: aiSnapshot,
    transfer: mergedTransfer ? { ...mergedTransfer, isSender: shouldKeepSender, role } : mergedTransfer,
    savedAt: new Date().toISOString(),
  })
  safeSet(KEYS.RECENT, list.slice(0, MAX_RECENT_TRANSFERS))
}
export function removeTransfer(code) {
  invalidateRecentCache();
  const normalizedCode = normalizeCode(code)
  const list = getRecentTransfers().filter(t => t.code !== normalizedCode)
  safeSet(KEYS.RECENT, list)
  removeCachedTransfer(normalizedCode)
  removeCachedAI(normalizedCode)
}
export function updateTransferStatus(code, status) {
  const normalizedCode = normalizeCode(code)
  const list = getRecentTransfers().map(t =>
    t.code === normalizedCode ? { ...t, status } : t
  )
  safeSet(KEYS.RECENT, list)

  const cachedTransfer = getCachedTransfer(normalizedCode)
  if (cachedTransfer) {
    saveCachedTransfer(normalizedCode, { ...cachedTransfer, status })
  }
}
export function clearTransfers() {
  invalidateRecentCache();
  localStorage.removeItem(KEYS.RECENT)
  clearPrefix(KEYS.TRANSFER_PREFIX)
  clearPrefix(KEYS.AI_PREFIX)
  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new Event('swiftshare:transfers-cleared'))
}

// ── Settings ───────────────────────────────
const DEFAULT_SETTINGS = {
  defaultExpiry: 60,
  defaultBurn: false,
  reducedMotion: false,
  soundEnabled: true,
  autoDownload: false,
  notificationsEnabled: false,
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
  return safeGet(KEYS.THEME, 'sunset')
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
