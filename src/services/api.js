import axios from 'axios'

const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)

const api = axios.create({
  baseURL: baseUrl,
  timeout: 30000,
})

function createApiError(err) {
  const error = new Error(err.response?.data?.error?.message || err.message)
  error.status = err.response?.status
  error.code = err.response?.data?.error?.code
  error.isNetworkError = !err.response
  return error
}

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
  try {
    const res = await api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const uploadClipboard = async (imageBase64, burnAfterDownload, senderSocketId) => {
  try {
    const res = await api.post('/api/upload/clipboard', {
      imageBase64,
      burnAfterDownload,
      senderSocketId,
    })
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const getFileMetadata = async (code) => {
  try {
    const res = await api.get(`/api/file/${code}`)
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const getTransferStatus = async (code) => {
  try {
    const res = await api.get(`/api/transfer/${code}/status`)
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const getTransferActivity = async (code) => {
  try {
    const res = await api.get(`/api/transfer/${code}/activity`)
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const extendTransfer = async (code) => {
  try {
    const res = await api.post(`/api/transfer/${code}/extend`)
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const deleteTransfer = async (code) => {
  try {
    const res = await api.delete(`/api/transfer/${code}`)
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const getNearbyDevices = async () => {
  try {
    const res = await api.get('/api/nearby')
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const getStats = async () => {
  try {
    const res = await api.get('/api/stats')
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const getHealth = async () => {
  try {
    const res = await api.get('/api/health')
    return res.data.data || res.data
  } catch (err) {
    throw createApiError(err)
  }
}

export const downloadFile = (code) => {
  window.location.href = `${baseUrl}/api/download/${code}`
}

export const downloadSingleFile = (code, index) => {
  window.location.href = `${baseUrl}/api/download/${code}/single/${index}`
}

export const previewUrl = (code, index) =>
  `${baseUrl}/api/file/${code}/preview/${index}`

export default api
