import axios from 'axios'
import { getBackendErrorMessage } from '../utils/errorMessages'

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isPrivateNetworkHost(hostname) {
  if (!hostname) return false
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true

  const match172 = /^172\.(\d{1,3})\./.exec(hostname)
  if (match172) {
    const second = Number(match172[1])
    return Number.isFinite(second) && second >= 16 && second <= 31
  }

  return false
}

function isLocalRuntimeHost(hostname) {
  return isLoopbackHost(hostname) || isPrivateNetworkHost(hostname)
}

function targetsLoopback(urlValue) {
  if (typeof urlValue !== 'string' || !urlValue.trim()) {
    return false
  }

  try {
    const parsed = new URL(urlValue)
    return isLoopbackHost(parsed.hostname)
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(urlValue.trim())
  }
}

function normalizeUrl(urlValue) {
  return String(urlValue || '').trim().replace(/\/+$/, '')
}

function rewriteLoopbackUrlForLanRuntime(urlValue) {
  if (typeof window === 'undefined') return null

  const runtimeHost = window.location.hostname
  if (!isLocalRuntimeHost(runtimeHost)) return null
  if (!targetsLoopback(urlValue)) return null

  try {
    const parsed = new URL(urlValue)
    parsed.hostname = runtimeHost
    return normalizeUrl(parsed.toString())
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT-AWARE API URL RESOLUTION (PRODUCTION SAFE)
// ═══════════════════════════════════════════════════════════════════════════

function getApiBaseUrl() {
  // Priority 1: Explicit VITE_API_URL from environment
  const envApiUrl = import.meta.env.VITE_API_URL
  if (envApiUrl && envApiUrl.trim()) {
    const candidate = normalizeUrl(envApiUrl)

    if (typeof window !== 'undefined') {
      const runtimeHost = window.location.hostname

      const rewrittenLanUrl = rewriteLoopbackUrlForLanRuntime(candidate)
      if (rewrittenLanUrl) {
        return rewrittenLanUrl
      }

      if (!isLocalRuntimeHost(runtimeHost) && targetsLoopback(candidate)) {
        console.warn('[API] Ignoring localhost VITE_API_URL in non-local runtime, using same-origin instead')
      } else {
        return candidate
      }
    } else {
      return candidate
    }
  }
  
  // Priority 2: Runtime detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname

    // Local development
    if (isLocalRuntimeHost(hostname)) {
      return `${window.location.protocol}//${hostname}:3001`
    }

    // Production: same-origin fallback. This is correct only if the frontend
    // and backend are deployed under the same hostname (reverse proxy or a
    // single Render service serving both). On split deployments (Vercel
    // frontend + Render backend) this silently sends every API call to the
    // frontend host, producing 404s with no diagnostic. Make the misconfig
    // loud so it can be diagnosed in 5 seconds instead of an afternoon.
    // eslint-disable-next-line no-console
    console.error(
      '[SwiftShare] VITE_API_URL is not set. Falling back to window.location.origin (' +
      window.location.origin + '). If your backend runs on a different host ' +
      '(e.g. Render), set VITE_API_URL in your frontend deployment env to the ' +
      'backend URL and redeploy.'
    )
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

    // During cold start, be more patient — retry up to 4 times with longer delays
    const maxRetries = _backendEverReached ? 2 : 4
    const baseDelay = _backendEverReached ? 1500 : 3000

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
    // Longer timeout for ping — cold starts on Render free tier can take 30-60s
    await API.get('/api/ping', { timeout: 60000, noRetry: true })
    _backendEverReached = true
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
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
const STALL_TIMEOUT_MS = 45_000
const RETRY_LIMIT = 2

function attemptUpload(formData, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = `${baseURL}/api/upload`
    let lastLoaded = 0
    let watchdog = null

    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        const err = new Error('Upload stalled (no progress for 45s)')
        err.code = 'ERR_STALLED'
        try { xhr.abort() } catch {}
        reject(err)
      }, STALL_TIMEOUT_MS)
    }

    const clearWatchdog = () => {
      if (watchdog) { clearTimeout(watchdog); watchdog = null }
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

    xhr.addEventListener('error', () => {
      clearWatchdog()
      const err = new Error('Network error during upload')
      err.code = 'ERR_NETWORK'
      reject(err)
    })

    xhr.addEventListener('abort', () => {
      clearWatchdog()
      const err = new Error('Upload aborted')
      err.code = 'ERR_CANCELED'
      reject(err)
    })

    if (signal) {
      if (signal.aborted) {
        try { xhr.abort() } catch {}
      } else {
        signal.addEventListener('abort', () => {
          try { xhr.abort() } catch {}
        }, { once: true })
      }
    }

    xhr.open('POST', url, true)
    xhr.withCredentials = false
    armWatchdog()
    xhr.send(formData)
  })
}

function isTransientUploadError(err) {
  if (!err) return false
  const code = String(err.code || '').toUpperCase()
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

  while (attempt <= RETRY_LIMIT) {
    try {
      return await attemptUpload(formData, { onProgress, signal })
    } catch (err) {
      lastErr = err
      // User-initiated abort: don't retry.
      if (String(err?.code || '').toUpperCase() === 'ERR_CANCELED' && signal?.aborted) {
        throw err
      }
      if (!isTransientUploadError(err) || attempt >= RETRY_LIMIT) {
        throw err
      }
      attempt += 1
      const delay = 1000 * Math.pow(2, attempt - 1) // 1s, 2s
      if (typeof onProgress === 'function') {
        onProgress({ retrying: true, attempt, delay })
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
export async function extendTransfer(code) {
  const { data } = await API.post(`/api/transfer/${normalizeCode(code)}/extend`)
  return unwrapResponse(data)
}

export async function deleteTransfer(code) {
  const { data } = await API.delete(`/api/transfer/${normalizeCode(code)}`)
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
