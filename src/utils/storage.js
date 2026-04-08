const KEYS = {
  RECENT: 'swiftshare_recent',
  SETTINGS: 'swiftshare_settings',
  THEME: 'swiftshare_theme',
  PWA_DISMISSED: 'swiftshare_pwa_dismissed',
  TRANSFER_PREFIX: 'transfer_',
  AI_PREFIX: 'ai_',
}

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
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
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

// ── Recent Transfers ───────────────────────
export function getRecentTransfers() {
  return safeGet(KEYS.RECENT, []).map((entry) => {
    const normalizedCode = normalizeCode(entry?.code)
    const cachedTransfer = getCachedTransfer(normalizedCode)
    const cachedAI = getCachedAI(normalizedCode)
    const mergedTransfer = mergeTransferData(entry?.transfer || entry, cachedTransfer)

    return {
      ...entry,
      ...(mergedTransfer || {}),
      code: normalizedCode,
      transfer: mergedTransfer || entry?.transfer || null,
      files: Array.isArray(mergedTransfer?.files) ? mergedTransfer.files : (Array.isArray(entry?.files) ? entry.files : []),
      ai: cachedAI || mergedTransfer?.ai || entry?.ai || null,
      filename: entry?.filename || mergedTransfer?.files?.[0]?.name || normalizedCode,
    }
  }).filter((entry) => Boolean(entry?.code))
}
export function saveTransfer(entry) {
  const normalizedCode = normalizeCode(entry?.code)
  if (!normalizedCode) return

  const transferSource = isObject(entry?.transfer) ? entry.transfer : (isObject(entry) ? entry : null)
  const mergedTransfer = transferSource ? saveCachedTransfer(normalizedCode, transferSource) : getCachedTransfer(normalizedCode)

  const aiFromEntry = entry?.ai || transferSource?.ai || null
  if (aiFromEntry) {
    saveCachedAI(normalizedCode, aiFromEntry)
  }

  const aiSnapshot = aiFromEntry || getCachedAI(normalizedCode) || mergedTransfer?.ai || null
  const filesSnapshot = Array.isArray(mergedTransfer?.files) && mergedTransfer.files.length
    ? mergedTransfer.files
    : (Array.isArray(entry?.files) ? entry.files : [])

  const list = getRecentTransfers().filter(t => t.code !== normalizedCode)
  list.unshift({
    ...entry,
    code: normalizedCode,
    filename: entry?.filename || filesSnapshot?.[0]?.name || normalizedCode,
    files: filesSnapshot,
    status: entry?.status || mergedTransfer?.status,
    expiresAt: entry?.expiresAt || mergedTransfer?.expiresAt,
    createdAt: entry?.createdAt || mergedTransfer?.createdAt,
    ai: aiSnapshot,
    transfer: mergedTransfer,
    savedAt: new Date().toISOString(),
  })
  safeSet(KEYS.RECENT, list.slice(0, 10))
}
export function removeTransfer(code) {
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
  localStorage.removeItem(KEYS.RECENT)
  clearPrefix(KEYS.TRANSFER_PREFIX)
  clearPrefix(KEYS.AI_PREFIX)
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
