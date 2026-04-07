import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message ||
      'Something went wrong'
    throw new Error(message)
  }
)

export const pingServer = async () => {
  const start = Date.now()
  try {
    await api.get('/api/ping', { timeout: 8000 })
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

export const uploadFiles = async (formData) => {
  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return res.data.data || res.data
}

export const uploadClipboard = async (imageBase64, burnAfterDownload, senderSocketId) => {
  const res = await api.post('/api/upload/clipboard', {
    imageBase64,
    burnAfterDownload,
    senderSocketId,
  })
  return res.data.data || res.data
}

export const getFileMetadata = async (code) => {
  const res = await api.get(`/api/file/${code}`)
  return res.data.data || res.data
}

export const getTransferStatus = async (code) => {
  const res = await api.get(`/api/transfer/${code}/status`)
  return res.data.data || res.data
}

export const getTransferActivity = async (code) => {
  const res = await api.get(`/api/transfer/${code}/activity`)
  return res.data.data || res.data
}

export const extendTransfer = async (code) => {
  const res = await api.post(`/api/transfer/${code}/extend`)
  return res.data.data || res.data
}

export const deleteTransfer = async (code) => {
  const res = await api.delete(`/api/transfer/${code}`)
  return res.data
}

export const getNearbyDevices = async () => {
  const res = await api.get('/api/nearby')
  return res.data.data || res.data
}

export const getStats = async () => {
  const res = await api.get('/api/stats')
  return res.data.data || res.data
}

export const getHealth = async () => {
  const res = await api.get('/api/health')
  return res.data
}

export const downloadFile = (code) => {
  window.location.href = `${BASE_URL}/api/download/${code}`
}

export const downloadSingleFile = (code, index) => {
  window.location.href = `${BASE_URL}/api/download/${code}/single/${index}`
}

export const previewUrl = (code, index) =>
  `${BASE_URL}/api/file/${code}/preview/${index}`

export default api
