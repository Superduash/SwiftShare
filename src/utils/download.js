import {
  downloadFile,
  downloadSingleFile,
  getDownloadUrl,
  getSingleDownloadUrl,
} from '../services/api'

function buildPasswordHeaders(password) {
  if (typeof password !== 'string' || !password.trim()) {
    return undefined
  }

  return { 'x-transfer-password': password }
}

export async function smartDownload(code, { aiName, index, originalName, password } = {}) {
  // For simple full-transfer downloads with no rename, use direct navigation (streaming, no memory pressure)
  if (typeof index !== 'number' && !aiName) {
    downloadFile(code, password)
    return true
  }

  const headers = buildPasswordHeaders(password)
  const url = typeof index === 'number'
    ? getSingleDownloadUrl(code, index, password)
    : getDownloadUrl(code, password)

  try {
    const resp = await fetch(url, headers ? { headers } : undefined)
    if (!resp.ok) throw new Error('Download failed')

    // If file is >50MB, skip blob rename — just navigate directly to avoid OOM on mobile
    const contentLength = Number(resp.headers.get('content-length') || 0)
    if (contentLength > 50 * 1024 * 1024) {
      resp.body?.cancel()
      if (typeof index === 'number') downloadSingleFile(code, index, password)
      else downloadFile(code, password)
      return true
    }

    const blob = await resp.blob()
    const filename = aiName || originalName || `swiftshare_${code}`
    triggerBlobDownload(blob, filename)
    return true
  } catch {
    if (typeof index === 'number') downloadSingleFile(code, index, password)
    else downloadFile(code, password)
    return true
  }
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}
