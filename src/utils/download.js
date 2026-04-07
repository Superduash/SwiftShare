import {
  downloadFile,
  downloadSingleFile,
  getDownloadUrl,
  getSingleDownloadUrl,
} from '../services/api'

export async function smartDownload(code, { aiName, index, originalName } = {}) {
  const filename = aiName || originalName || `swiftshare_${code}`

  if (typeof index === 'number') {
    // Single file from multi-file transfer — try blob rename
    try {
      const url = typeof downloadSingleFile === 'function'
        ? getSingleDownloadUrl(code, index)
        : null
      if (url) {
        const resp = await fetch(url)
        if (!resp.ok) throw new Error('Download failed')
        const blob = await resp.blob()
        triggerBlobDownload(blob, filename)
        return true
      }
    } catch {
      // Fallback
      downloadSingleFile(code, index)
      return true
    }
  }

  // Full transfer download with rename
  try {
    const url = getDownloadUrl(code)
    const resp = await fetch(url)
    if (!resp.ok) throw new Error('Download failed')
    const blob = await resp.blob()
    triggerBlobDownload(blob, filename)
    return true
  } catch {
    downloadFile(code)
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
