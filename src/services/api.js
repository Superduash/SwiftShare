import axios from 'axios'

const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : ''
const rawBaseURL = import.meta.env.VITE_API_URL || fallbackOrigin
const baseURL = rawBaseURL.replace(/\/+$/, '')

const API = axios.create({
  baseURL,
  timeout: 30000,
})

// Retry interceptor for transient failures
API.interceptors.response.use(null, async (error) => {
  const config = error.config
  if (!config) return Promise.reject(error)

  if (config.noRetry) {
    return Promise.reject(error)
  }

  config.__retryCount = config.__retryCount || 0
  const isRetryable = !error.response || error.response.status === 503 || error.code === 'ERR_NETWORK'
  const isIdempotent = (config.method || 'get').toLowerCase() === 'get'

  if (isRetryable && isIdempotent && config.__retryCount < 2) {
    config.__retryCount += 1
    const delay = config.__retryCount * 1000
    await new Promise(r => setTimeout(r, delay))
    return API(config)
  }

  return Promise.reject(error)
})

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
    await API.get('/api/ping')
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

// ── Upload ──────────────────────────────────
export async function uploadFiles(formData) {
  if (formData?.get && !formData.get('senderSocketId') && formData.get('socketId')) {
    formData.append('senderSocketId', formData.get('socketId'))
  }

  const { data } = await API.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return unwrapResponse(data)
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

// ── Metadata & Status ───────────────────────
export async function getFileMetadata(code, requestConfig = undefined) {
  const { data } = await API.get(`/api/file/${normalizeCode(code)}`, requestConfig)
  return unwrapResponse(data)
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

// ── Nearby ──────────────────────────────────
export async function getNearbyDevices() {
  const { data } = await API.get('/api/nearby')
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
  const url = buildBackendUrl(`/api/download/${normalizeCode(code)}/preview/${Number.isInteger(safeIndex) ? safeIndex : 0}`)
  return appendPasswordQuery(url, password)
}
