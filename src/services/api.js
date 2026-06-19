import axios from 'axios'
import { getBackendErrorMessage } from '../utils/errorMessages'
import { isLoopbackHost, isPrivateNetworkHost, isLocalRuntimeHost, targetsLoopback, normalizeUrl, rewriteLoopbackUrlForLanRuntime } from '../utils/network'

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT-AWARE API URL RESOLUTION (PRODUCTION SAFE)
// ═══════════════════════════════════════════════════════════════════════════

// If the page is HTTPS but the backend URL is HTTP (and not loopback),
// rewrite to HTTPS to avoid mixed-content blocks.  Browsers silently block
// HTTP fetches (especially media) from HTTPS pages, which produces a "no
// supported source" error in <video>/<audio> with no console output.
function ensureSecureForPage(urlValue) {
  if (typeof window === 'undefined') return urlValue
  if (window.location.protocol !== 'https:') return urlValue
  if (typeof urlValue !== 'string' || !urlValue.startsWith('http://')) return urlValue
  if (targetsLoopback(urlValue)) return urlValue
  return urlValue.replace(/^http:/i, 'https:')
}

function getApiBaseUrl() {
  // Priority 1: In local development, use same-origin (Vite proxy handles routing)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    // Local development - use Vite proxy
    if (isLocalRuntimeHost(hostname)) {
      if (import.meta.env.DEV) console.log('[API] Using same-origin for local dev (Vite proxy):', window.location.origin)
      return window.location.origin
    }
  }

  // Priority 2: Explicit VITE_API_URL from environment (production)
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl && envApiUrl.trim()) {
    const candidate = ensureSecureForPage(normalizeUrl(envApiUrl))

    if (typeof window !== 'undefined') {
      const rewrittenLanUrl = rewriteLoopbackUrlForLanRuntime(candidate)
      if (rewrittenLanUrl) {
        if (import.meta.env.DEV) console.log('[API] Using LAN-rewritten URL:', rewrittenLanUrl)
        return rewrittenLanUrl
      }
    }
    
    if (import.meta.env.DEV) console.log('[API] Using env URL:', candidate)
    return candidate
  }
  
  // Priority 3: Same-origin fallback for production
  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV) console.log('[API] Using same-origin fallback:', window.location.origin)
    return window.location.origin
  }

  // Fallback
  return ''
}

const baseURL = getApiBaseUrl()

const API = axios.create({
  baseURL,
  timeout: 60000,
  withCredentials: false, // Set to true if using cookies
})

function classifyTransportError(error) {
  if (error?.response) {
    const errorCode = error?.response?.data?.error?.code || null
    return {
      type: 'SERVER',
      status: Number(error.response.status || 500),
      errorCode,
      message: error?.response?.data?.error?.message || getBackendErrorMessage(errorCode, error?.message || 'Server error'),
    }
  }

  const code = String(error?.code || '').toUpperCase()
  const message = String(error?.message || '')

  if (code === 'ECONNABORTED' || /timeout/i.test(message)) {
    return { type: 'TIMEOUT', message: 'Request timed out' }
  }

  return { type: 'NETWORK', message: 'Network request failed' }
}

function isObjectPayload(payload) {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
}

function hasUsableMetadataPayload(payload) {
  if (!isObjectPayload(payload)) return false
  if (typeof payload.code !== 'string') return false
  if (!Array.isArray(payload.files)) return false
  return true
}

// Cold-start detection: if the very first request fails, backend is likely waking up
let _backendEverReached = false

// Retry interceptor for transient failures (cold-start aware)
API.interceptors.response.use(
  (response) => {
    _backendEverReached = true
    return response
  },
  async (error) => {
    const config = error.config
    if (!config) return Promise.reject(error)

    if (config.noRetry) {
      return Promise.reject(error)
    }

    if (Number(error?.response?.status) === 429) {
      try {
        const { default: toast } = await import('react-hot-toast')
        toast.error('Too many requests. Please wait a moment.', { id: 'rate-limit' })
      } catch {}
    }

    config.__retryCount = config.__retryCount || 0

    // Distinguish between real network errors and server responses
    const isRealNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')
    const isServerError = error.response && (error.response.status === 503 || error.response.status >= 500)
    const isRetryable = isRealNetworkError || isServerError
    const isIdempotent = (config.method || 'get').toLowerCase() === 'get'

    // During cold start, be more patient — retry up to 5 times with longer delays for mobile
    const maxRetries = _backendEverReached ? 2 : 5
    const baseDelay = _backendEverReached ? 1500 : 4000

    if (isRetryable && isIdempotent && config.__retryCount < maxRetries) {
      config.__retryCount += 1
      const delay = config.__retryCount * baseDelay
      await new Promise(r => setTimeout(r, delay))
      return API(config)
    }

    return Promise.reject(error)
  }
)

function unwrapResponse(payload) {
  if (payload && typeof payload === 'object' && payload.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }

  return payload
}

function normalizeCode(code) {
  return encodeURIComponent(String(code || '').trim().toUpperCase())
}

function buildBackendUrl(path) {
  return `${baseURL}${path}`
}

function appendPasswordQuery(url, password) {
  if (typeof password !== 'string' || !password.trim()) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}password=${encodeURIComponent(password)}`
}

function toDataUrl(base64OrDataUrl, mimeType = 'image/png') {
  if (typeof base64OrDataUrl !== 'string' || !base64OrDataUrl) {
    return ''
  }

  if (base64OrDataUrl.startsWith('data:')) {
    return base64OrDataUrl
  }

  return `data:${mimeType};base64,${base64OrDataUrl}`
}

// ── Health ──────────────────────────────────
export async function pingServer() {
  const start = Date.now()
  try {
    // 20s is enough for a warm response and short enough that the health loop
    // can recover quickly on mobile networks. Cold-start (~30s) is handled by
    // the loop firing again rather than by a single 60s call that ties up the
    // banner state for a full minute on every transient miss.
    await API.get('/api/ping', { timeout: 20000, noRetry: true })
    _backendEverReached = true
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

export function markBackendReachable() {
  _backendEverReached = true
}

// ── Upload ──────────────────────────────────
//
// Resilient upload tuned for mobile / unstable networks:
//  • True per-byte progress via XHR onUploadProgress (0..100%, capped at 99% until
//    the server's HTTP response arrives, so the bar doesn't sit at 100% during the
//    server→R2 finalization).
//  • Stall watchdog: if no bytes flow for STALL_TIMEOUT_MS, abort and retry.
//  • Retry on transient transport failures (ERR_NETWORK / aborted) up to RETRY_LIMIT
//    times, with light exponential backoff. The server generates a fresh code on each
//    retry, so re-sending the same FormData is safe.
//  • No fixed wall-clock timeout; the watchdog handles dead connections, and Node's
//    socket idle timeout protects the backend.
//  • File pre-read: On Android, files can become invalid due to MediaStore/Gallery
//    modifications between selection and upload. We pre-read into memory to avoid
//    Chrome's ERR_UPLOAD_FILE_CHANGED error.

// Adaptive stall timeout: slow mobile networks need more patience
function getStallTimeoutMs() {
  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!conn) return 90_000
    if (conn.effectiveType === 'slow-2g') return 180_000
    if (conn.effectiveType === '2g') return 150_000
    if (conn.effectiveType === '3g') return 120_000
    return 90_000  // WiFi/4G: 90s — mobile WiFi can hiccup for 60-80s during handoff
  } catch {
    return 90_000
  }
}

const RETRY_LIMIT = 5
const MAX_RETRY_DELAY_MS = 10_000 // Cap retry delay at 10 seconds

function attemptUpload(formData, { onProgress, signal, attemptNumber = 1, totalSize = 0, fileName = 'file', uploadStartTime = Date.now() } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = `${baseURL}/api/upload`
    let lastLoaded = 0
    let watchdog = null
    let aborted = false

    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      const stallMs = getStallTimeoutMs()
      watchdog = setTimeout(() => {
        const err = new Error(`Upload stalled (no progress for ${Math.round(stallMs / 1000)}s)`)
        err.code = 'ERR_STALLED'
        try { xhr.abort() } catch {}
        reject(err)
      }, stallMs)
    }

    const clearWatchdog = () => {
      if (watchdog) { clearTimeout(watchdog); watchdog = null }
    }

    // Handle user-initiated abort via signal
    if (signal) {
      if (signal.aborted) {
        try { xhr.abort() } catch {}
        return
      }
      signal.addEventListener('abort', () => {
        if (aborted) return
        aborted = true
        clearWatchdog()
        try { xhr.abort() } catch {}
      }, { once: true })
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return
      if (e.loaded !== lastLoaded) {
        lastLoaded = e.loaded
        armWatchdog()
      }
      if (typeof onProgress === 'function') {
        onProgress({ loaded: e.loaded, total: e.total })
      }
    })

    xhr.upload.addEventListener('loadend', () => {
      // Bytes have left the client. The server still needs to finalize (last R2 multipart
      // parts + DB write). Keep the watchdog armed against a hung response.
      armWatchdog()
    })

    xhr.addEventListener('load', () => {
      clearWatchdog()
      const status = xhr.status
      let parsed = null
      try { parsed = JSON.parse(xhr.responseText) } catch { parsed = null }

      if (status >= 200 && status < 300) {
        resolve(unwrapResponse(parsed))
        return
      }

      const err = new Error(parsed?.error?.message || `Upload failed (${status})`)
      err.response = { status, data: parsed }
      reject(err)
    })

    xhr.addEventListener('error', (e) => {
      clearWatchdog()
      
      // Detect Chrome's ERR_UPLOAD_FILE_CHANGED
      // This happens when Android file handles become invalid (file touched by Gallery/Photos/MediaStore)
      const err = new Error('Network error during upload')
      
      // Chrome doesn't expose the exact error code, but we can infer ERR_UPLOAD_FILE_CHANGED
      // from the context: if XHR fails immediately without any bytes sent and status = 0,
      // it's likely a file handle issue on Android
      if (xhr.readyState === 0 || xhr.status === 0) {
        // Check if this is a file handle issue by examining timing
        // If error happens very quickly (< 100ms), likely file access issue
        const elapsed = Date.now() - uploadStartTime
        if (elapsed < 100 && attemptNumber === 1) {
          err.code = 'ERR_UPLOAD_FILE_CHANGED'
          err.message = 'File became unavailable after selection'
        } else {
          err.code = 'ERR_NETWORK'
        }
      } else {
        err.code = 'ERR_NETWORK'
      }
      
      reject(err)
    })

    xhr.addEventListener('abort', () => {
      clearWatchdog()
      const err = new Error('Upload aborted')
      err.code = 'ERR_CANCELED'
      reject(err)
    })

    xhr.addEventListener('timeout', () => {
      clearWatchdog()
      const err = new Error('Upload timeout')
      err.code = 'ECONNABORTED'
      reject(err)
    })

    xhr.open('POST', url, true)
    xhr.withCredentials = false
    // Set XHR timeout to 10 minutes for large files on slow networks
    xhr.timeout = 600000
    armWatchdog()
    xhr.send(formData)
  })
}

function isTransientUploadError(err) {
  if (!err) return false
  const code = String(err.code || '').toUpperCase()
  
  // NEVER retry file access errors - file is gone/changed, retrying won't help
  if (code === 'ERR_UPLOAD_FILE_CHANGED') return false
  
  // Retry network issues and stalls
  if (code === 'ERR_NETWORK' || code === 'ERR_STALLED') return true
  
  // 5xx from server: also retryable. 4xx (validation) is not.
  const status = Number(err?.response?.status || 0)
  return status >= 500 && status < 600
}

export async function uploadFiles(formData, opts = {}) {
  if (formData?.get && !formData.get('senderSocketId') && formData.get('socketId')) {
    formData.append('senderSocketId', formData.get('socketId'))
  }

  const { onProgress, signal } = opts
  let attempt = 0
  let lastErr = null

  // Extract metadata for upload timing
  const fileName = formData.get('files')?.name || 'file'
  const totalSize = formData.getAll('files').reduce((sum, f) => sum + (f.size || 0), 0)
  const uploadStartTime = Date.now()

  while (attempt <= RETRY_LIMIT) {
    try {
      return await attemptUpload(formData, { 
        onProgress, 
        signal,
        attemptNumber: attempt + 1,
        totalSize,
        fileName,
        uploadStartTime,
      })
    } catch (err) {
      lastErr = err
      
      // User-initiated abort: don't retry.
      if (String(err?.code || '').toUpperCase() === 'ERR_CANCELED' && signal?.aborted) {
        throw err
      }
      
      // Check if error is retryable
      if (!isTransientUploadError(err) || attempt >= RETRY_LIMIT) {
        throw err
      }
      
      attempt += 1
      
      // Cap retry delay at MAX_RETRY_DELAY_MS to prevent excessive waiting
      const uncappedDelay = 2000 * attempt
      const delay = Math.min(uncappedDelay, MAX_RETRY_DELAY_MS)
      
      if (typeof onProgress === 'function') {
        onProgress({ retrying: true, attempt, maxAttempts: RETRY_LIMIT, delay })
      }
      
      // If the device is offline, wait for it to come back before burning the delay
      if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
        await new Promise((resolve) => {
          if (navigator.onLine) return resolve()
          
          const onOnline = () => { 
            window.removeEventListener('online', onOnline)
            resolve() 
          }
          
          window.addEventListener('online', onOnline, { once: true })
          
          // Wait up to 90s for connectivity to return, then proceed anyway
          setTimeout(() => resolve(), 90_000)
        })
      }
      
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  throw lastErr
}

export async function uploadClipboard(imageBase64, burnAfterDownload, senderSocketId, options = {}) {
  const payload = {
    imageBase64: toDataUrl(imageBase64, options.mimeType || 'image/png'),
    burnAfterDownload: Boolean(burnAfterDownload),
    senderSocketId: typeof senderSocketId === 'string' ? senderSocketId : '',
  }

  if (typeof options.passwordProtected === 'boolean') {
    payload.passwordProtected = options.passwordProtected
  }

  if (typeof options.password === 'string' && options.password.trim()) {
    payload.password = options.password
  }

  if (Number.isFinite(Number(options.expiryMinutes)) && Number(options.expiryMinutes) > 0) {
    payload.expiryMinutes = Number(options.expiryMinutes)
  }

  const { data } = await API.post('/api/upload/clipboard', payload)
  return unwrapResponse(data)
}

// ── Text Sharing ────────────────────────────
export async function shareText({ content, title, expiryMinutes, burnAfterDownload, passwordProtected, password, socketId }) {
  const payload = {
    content,
    title,
    expiryMinutes,
    burnAfterDownload,
    socketId,
  }
  if (passwordProtected && password) {
    payload.passwordProtected = true
    payload.password = password
  }
  const { data } = await API.post('/api/text/share', payload)
  return unwrapResponse(data)
}

export async function getTextContent(code, password = undefined) {
  const config = password ? { headers: { 'X-Transfer-Password': password } } : undefined
  const { data } = await API.get(`/api/file/${normalizeCode(code)}/text`, config)
  return unwrapResponse(data)
}

// ── Metadata & Status ───────────────────────
export async function getFileMetadata(code, requestConfig = undefined) {
  const { data } = await API.get(`/api/file/${normalizeCode(code)}`, requestConfig)
  return unwrapResponse(data)
}

export async function getFileMetadataOutcome(code, requestConfig = undefined) {
  try {
    const payload = await getFileMetadata(code, requestConfig)

    if (!hasUsableMetadataPayload(payload)) {
      return {
        ok: false,
        type: 'EMPTY_RESPONSE',
        errorCode: 'EMPTY_RESPONSE',
        message: 'Metadata response was empty or invalid',
      }
    }

    return { ok: true, data: payload }
  } catch (error) {
    const classified = classifyTransportError(error)
    return {
      ok: false,
      ...classified,
      rawError: error,
    }
  }
}

export async function getTransferStatus(code) {
  const { data } = await API.get(`/api/transfer/${normalizeCode(code)}/status`)
  return unwrapResponse(data)
}

export async function getTransferActivity(code) {
  const { data } = await API.get(`/api/transfer/${normalizeCode(code)}/activity`)
  return unwrapResponse(data)
}

// ── Password ───────────────────────────────
export async function verifyPassword(code, password) {
  const { data } = await API.post(`/api/transfer/${normalizeCode(code)}/verify-password`, { password })
  return unwrapResponse(data)
}

// ── Actions ─────────────────────────────────
export async function extendTransfer(code, ownershipToken, minutes = 10) {
  const config = ownershipToken
    ? { headers: { 'X-Ownership-Token': String(ownershipToken) } }
    : {}
  const { data } = await API.post(`/api/transfer/${normalizeCode(code)}/extend`, { minutes }, config)
  return unwrapResponse(data)
}

export async function deleteTransfer(code, ownershipToken) {
  const config = ownershipToken
    ? { headers: { 'X-Ownership-Token': String(ownershipToken) } }
    : {}
  const { data } = await API.delete(`/api/transfer/${normalizeCode(code)}`, config)
  return unwrapResponse(data)
}

export async function finalizeBurnTransfer(code) {
  const { data } = await API.post(`/api/transfer/${normalizeCode(code)}/burn-finalize`)
  return unwrapResponse(data)
}

// ── Nearby ──────────────────────────────────
export async function getNearbyDevices(socketId) {
  const safeSocketId = String(socketId || '').trim()
  const path = safeSocketId
    ? `/api/nearby?socketId=${encodeURIComponent(safeSocketId)}`
    : '/api/nearby'
  const { data } = await API.get(path)
  return unwrapResponse(data)
}

// ── Stats ───────────────────────────────────
export async function getStats() {
  const { data } = await API.get('/api/stats')
  return unwrapResponse(data)
}

// ── Download ────────────────────────────────
export function getDownloadUrl(code, password) {
  const url = buildBackendUrl(`/api/download/${normalizeCode(code)}`)
  return appendPasswordQuery(url, password)
}

export function getSingleDownloadUrl(code, index, password) {
  const safeIndex = Number(index)
  const url = buildBackendUrl(`/api/download/${normalizeCode(code)}/single/${Number.isInteger(safeIndex) ? safeIndex : 0}`)
  return appendPasswordQuery(url, password)
}

export function downloadFile(code, password) {
  window.location.href = getDownloadUrl(code, password)
}

export function downloadSingleFile(code, index, password) {
  window.location.href = getSingleDownloadUrl(code, index, password)
}

export function previewUrl(code, index, password) {
  const safeIndex = Number(index)
  let url = buildBackendUrl(`/api/download/${normalizeCode(code)}/preview/${Number.isInteger(safeIndex) ? safeIndex : 0}`)
  return appendPasswordQuery(url, password)
}
