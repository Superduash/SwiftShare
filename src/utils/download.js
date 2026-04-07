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
  const filename = aiName || originalName || `swiftshare_${code}`
  const headers = buildPasswordHeaders(password)

  if (typeof index === 'number') {
    // Single file from multi-file transfer — try blob rename
    try {
      const url = typeof downloadSingleFile === 'function'
        ? getSingleDownloadUrl(code, index, password)
        : null
      if (url) {
        const resp = await fetch(url, headers ? { headers } : undefined)
        if (!resp.ok) throw new Error('Download failed')
        const blob = await resp.blob()
        triggerBlobDownload(blob, filename)
        return true
      }
    } catch {
      // Fallback
      downloadSingleFile(code, index, password)
      return true
    }
  }

  // Full transfer download with rename
  try {
    const url = getDownloadUrl(code, password)
    const resp = await fetch(url, headers ? { headers } : undefined)
    if (!resp.ok) throw new Error('Download failed')
    const blob = await resp.blob()
    triggerBlobDownload(blob, filename)
    return true
  } catch {
    downloadFile(code, password)
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
