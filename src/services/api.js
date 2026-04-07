import axios from 'axios'

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const baseURL = rawBaseURL.replace(/\/+$/, '')

const API = axios.create({
  baseURL,
  timeout: 30000,
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
export async function getFileMetadata(code) {
  const { data } = await API.get(`/api/file/${normalizeCode(code)}`)
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
export function getDownloadUrl(code) {
  return buildBackendUrl(`/api/download/${normalizeCode(code)}`)
}

export function getSingleDownloadUrl(code, index) {
  const safeIndex = Number(index)
  return buildBackendUrl(`/api/download/${normalizeCode(code)}/single/${Number.isInteger(safeIndex) ? safeIndex : 0}`)
}

export function downloadFile(code) {
  window.location.href = getDownloadUrl(code)
}

export function downloadSingleFile(code, index) {
  window.location.href = getSingleDownloadUrl(code, index)
}

export function previewUrl(code, index) {
  const safeIndex = Number(index)
  return buildBackendUrl(`/api/file/${normalizeCode(code)}/preview/${Number.isInteger(safeIndex) ? safeIndex : 0}`)
}
