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

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD DEBUG LOGGING
// Import centralized debugging utilities from utils/uploadDebug.js
// ════════════════════════════════════════════════════════════════════════════
import {
  DEBUG_UPLOAD,
  AUTO_RETRY_ENABLED,
  ENABLE_READABILITY_CHECK,
  uploadDebug,
  uploadDebugSection,
  uploadDebugQuestion,
  makeUploadId,
  getDeviceInfo,
  getNetworkInfo,
  describeFile,
  verifyFileReadable,
} from '../utils/uploadDebug'
// ════════════════════════════════════════════════════════════════════════════

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

function attemptUpload(formData, { onProgress, signal, uploadId, totalSize = 0, fileDescriptions = [] } = {}) {
  return new Promise((resolve, reject) => {
    uploadDebugSection(`XHR UPLOAD ATTEMPT: ${uploadId}`)
    
    const xhr = new XMLHttpRequest()
    const url = `${baseURL}/api/upload`
    let lastLoaded = 0
    let watchdog = null
    let aborted = false
    let requestLeftBrowser = false
    let xhrOpenExecuted = false
    let xhrSendExecuted = false

    uploadDebug('Creating XHR object', {
      uploadId,
      url,
      totalSize,
      files: fileDescriptions,
      device: getDeviceInfo(),
      network: getNetworkInfo(),
    })

    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      const stallMs = getStallTimeoutMs()
      watchdog = setTimeout(() => {
        uploadDebug('Upload stalled - no progress', {
          uploadId,
          lastLoaded,
          lastLoadedReadable: `${(lastLoaded / 1024 / 1024).toFixed(2)} MB`,
          timeoutMs: stallMs,
          network: getNetworkInfo(),
        })
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
        uploadDebug('Upload aborted before start (signal already aborted)', { uploadId })
        try { xhr.abort() } catch {}
        return
      }
      signal.addEventListener('abort', () => {
        if (aborted) return
        aborted = true
        uploadDebug('Upload abort requested by user (via signal)', { 
          uploadId,
          loadedSoFar: lastLoaded,
          loadedReadable: `${(lastLoaded / 1024 / 1024).toFixed(2)} MB` 
        })
        clearWatchdog()
        try { xhr.abort() } catch {}
      }, { once: true })
    }

    // === XHR UPLOAD EVENT HANDLERS ===
    
    xhr.upload.addEventListener('loadstart', () => {
      requestLeftBrowser = true
      uploadDebugQuestion('Did request leave browser (upload.loadstart)?', true, { uploadId })
    })

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) {
        uploadDebug('Upload progress (not computable)', { uploadId })
        return
      }
      if (e.loaded !== lastLoaded) {
        lastLoaded = e.loaded
        armWatchdog()
        
        const percent = ((e.loaded / e.total) * 100).toFixed(2)
        uploadDebug('Upload progress', {
          uploadId,
          loaded: e.loaded,
          total: e.total,
          percent: `${percent}%`,
        })
      }
      if (typeof onProgress === 'function') {
        onProgress({ loaded: e.loaded, total: e.total })
      }
    })

    xhr.upload.addEventListener('loadend', () => {
      uploadDebug('Upload loadend (bytes sent, awaiting server response)', { 
        uploadId, 
        totalBytes: lastLoaded,
      })
      armWatchdog()
    })

    // === XHR RESPONSE EVENT HANDLERS ===

    xhr.addEventListener('load', () => {
      clearWatchdog()
      const status = xhr.status
      let parsed = null
      try { parsed = JSON.parse(xhr.responseText) } catch { parsed = null }

      uploadDebug('XHR load event', {
        uploadId,
        status,
        responseLength: xhr.responseText?.length || 0,
        parsed: parsed ? 'yes' : 'no',
      })

      if (status >= 200 && status < 300) {
        uploadDebugQuestion('Did upload complete successfully?', true, {
          uploadId,
          status,
          responseCode: parsed?.code || parsed?.data?.code || 'unknown',
        })
        resolve(unwrapResponse(parsed))
        return
      }

      uploadDebugQuestion('Did upload complete successfully?', false, {
        uploadId,
        status,
        errorMessage: parsed?.error?.message || 'unknown',
        errorCode: parsed?.error?.code || 'unknown',
        fullResponse: parsed,
      })

      const err = new Error(parsed?.error?.message || `Upload failed (${status})`)
      err.response = { status, data: parsed }
      reject(err)
    })

    xhr.addEventListener('error', () => {
      clearWatchdog()
      
      uploadDebugSection(`XHR ERROR EVENT: ${uploadId}`)
      
      // CRITICAL DIAGNOSTIC: Check if request ever left the browser
      uploadDebugQuestion('Did request leave browser (upload.loadstart)?', requestLeftBrowser, { uploadId })
      
      uploadDebug('XHR error event fired', {
        uploadId,
        requestLeftBrowser,
        xhrOpenExecuted,
        xhrSendExecuted,
        bytesLoadedBeforeFailure: lastLoaded,
        network: getNetworkInfo(),
        online: navigator.onLine,
      })
      
      const err = new Error('Network error during upload')
      err.code = 'ERR_NETWORK'
      err.requestLeftBrowser = requestLeftBrowser
      err.xhrOpenExecuted = xhrOpenExecuted
      err.xhrSendExecuted = xhrSendExecuted
      reject(err)
    })

    xhr.addEventListener('abort', () => {
      clearWatchdog()
      uploadDebug('XHR abort event fired', {
        uploadId,
        byUser: aborted,
        bytesLoaded: lastLoaded,
      })
      const err = new Error('Upload aborted')
      err.code = 'ERR_CANCELED'
      reject(err)
    })

    xhr.addEventListener('timeout', () => {
      clearWatchdog()
      uploadDebug('XHR timeout event fired', {
        uploadId,
        timeoutMs: xhr.timeout,
        bytesLoaded: lastLoaded,
      })
      const err = new Error('Upload timeout')
      err.code = 'ECONNABORTED'
      reject(err)
    })

    // === XHR INITIALIZATION AND SEND ===

    try {
      uploadDebug('Executing xhr.open()', { uploadId, method: 'POST', url })
      xhr.open('POST', url, true)
      xhrOpenExecuted = true
      uploadDebugQuestion('Did xhr.open() execute?', true, { uploadId })
    } catch (error) {
      uploadDebugQuestion('Did xhr.open() execute?', false, { 
        uploadId,
        errorName: error?.name,
        errorMessage: error?.message,
      })
      reject(error)
      return
    }

    // Set custom header for correlation with backend logs
    xhr.setRequestHeader('X-Client-Upload-Id', uploadId)
    xhr.withCredentials = false
    xhr.timeout = 600000 // 10 minutes
    
    armWatchdog()
    
    try {
      uploadDebug('Executing xhr.send()', { 
        uploadId, 
        timeout: xhr.timeout,
        formDataPresent: !!formData,
      })
      xhr.send(formData)
      xhrSendExecuted = true
      uploadDebugQuestion('Did xhr.send() execute?', true, { uploadId })
    } catch (error) {
      uploadDebugQuestion('Did xhr.send() execute?', false, { 
        uploadId,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
      })
      reject(error)
      return
    }
  })
}

export async function uploadFiles(formData, opts = {}) {
  if (formData?.get && !formData.get('senderSocketId') && formData.get('socketId')) {
    formData.append('senderSocketId', formData.get('socketId'))
  }

  const { onProgress, signal } = opts
  
  // Generate correlation ID for frontend-backend log matching
  const uploadId = makeUploadId()
  if (formData?.append) formData.append('clientUploadId', uploadId)

  // Extract file metadata for debugging
  const allFiles = formData.getAll('files')
  const fileDescriptions = allFiles.map(describeFile)
  const totalSize = allFiles.reduce((sum, f) => sum + (f.size || 0), 0)

  uploadDebugSection(`UPLOAD START: ${uploadId}`)
  
  uploadDebug('Upload initiated', {
    uploadId,
    fileCount: allFiles.length,
    files: fileDescriptions,
    totalSize,
    totalSizeReadable: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
    device: getDeviceInfo(),
    network: getNetworkInfo(),
    autoRetryEnabled: AUTO_RETRY_ENABLED,
  })

  // ══════════════════════════════════════════════════════════════════════════
  // PRE-FLIGHT FILE READABILITY CHECK (OPTIONAL - DISABLED BY DEFAULT)
  // This verifies each file can be read before attempting upload.
  // WARNING: Can break uploads if FileReader has issues. Only enable if
  // you specifically suspect file access/permission problems.
  // ══════════════════════════════════════════════════════════════════════════
  if (ENABLE_READABILITY_CHECK) {
    uploadDebugSection('FILE READABILITY CHECK ENABLED')
    
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      
      uploadDebugSection(`FILE READABILITY CHECK ${i + 1}/${allFiles.length}`)
      
      const probe = await verifyFileReadable(file)
      if (!probe.readable) {
        const err = new Error(
          `"${file.name}" cannot be read from your device. ` +
          `It may have been moved, deleted, or access permission was revoked. ` +
          `Please remove it and reselect the file.`
        )
        err.code = 'ERR_FILE_UNREADABLE'
        err.fileName = file.name
        err.details = probe
        
        uploadDebugSection(`UPLOAD ABORTED: ${uploadId}`)
        uploadDebug('Upload aborted due to unreadable file', { 
          uploadId, 
          fileName: file.name,
          reason: probe.reason,
          error: probe.error,
        })
        throw err
      }
    }

    uploadDebugQuestion('Did all files pass readability check?', true, { uploadId, fileCount: allFiles.length })
  } else {
    uploadDebug('File readability check SKIPPED (ENABLE_READABILITY_CHECK = false)', { uploadId })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPLOAD ATTEMPT WITH CONDITIONAL RETRY
  // - AUTO_RETRY_ENABLED = false: Single attempt, surface real error
  // - AUTO_RETRY_ENABLED = true: Retry transient network/server errors only
  // ══════════════════════════════════════════════════════════════════════════
  const MAX_RETRIES = AUTO_RETRY_ENABLED ? 3 : 0
  let attempt = 0
  let lastError = null

  while (attempt <= MAX_RETRIES) {
    try {
      if (attempt > 0) {
        uploadDebugSection(`RETRY ATTEMPT ${attempt}/${MAX_RETRIES}: ${uploadId}`)
      }
      
      const result = await attemptUpload(formData, { 
        onProgress, 
        signal,
        uploadId,
        totalSize,
        fileDescriptions,
      })
      
      uploadDebugSection(`UPLOAD SUCCESS: ${uploadId}`)
      uploadDebug('Upload completed successfully', {
        uploadId,
        code: result?.code,
        attempts: attempt + 1,
      })
      
      return result
      
    } catch (err) {
      lastError = err
      
      // User canceled: never retry
      if (err?.code === 'ERR_CANCELED' && signal?.aborted) {
        uploadDebugSection(`UPLOAD CANCELED: ${uploadId}`)
        uploadDebug('Upload canceled by user', { uploadId, attempt: attempt + 1 })
        throw err
      }
      
      // Check if error is retryable
      const isRetryable = AUTO_RETRY_ENABLED && (
        err?.code === 'ERR_NETWORK' ||
        err?.code === 'ERR_STALLED' ||
        (err?.response?.status >= 500 && err?.response?.status < 600)
      )
      
      if (!isRetryable || attempt >= MAX_RETRIES) {
        uploadDebugSection(`UPLOAD FAILED: ${uploadId}`)
        uploadDebug('Upload failed - not retryable or max retries reached', {
          uploadId,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          errorCode: err?.code || 'unknown',
          errorMessage: err?.message || 'unknown',
          errorStack: err?.stack,
          requestLeftBrowser: err?.requestLeftBrowser,
          xhrOpenExecuted: err?.xhrOpenExecuted,
          xhrSendExecuted: err?.xhrSendExecuted,
          responseStatus: err?.response?.status,
          responseData: err?.response?.data,
          isRetryable,
          autoRetryEnabled: AUTO_RETRY_ENABLED,
        })
        throw err
      }
      
      attempt++
      const delay = 2000 * attempt
      
      uploadDebug('Retry scheduled', {
        uploadId,
        attempt,
        maxRetries: MAX_RETRIES,
        delayMs: delay,
        reason: err?.code || err?.message || 'unknown',
      })
      
      if (typeof onProgress === 'function') {
        onProgress({ retrying: true, attempt, maxAttempts: MAX_RETRIES, delay })
      }
      
      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastError
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
