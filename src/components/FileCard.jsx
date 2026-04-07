import React from 'react'
import { Download, Eye, FileText } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function FileCard({
  file,
  index,
  onPreview,
  onDownloadSingle,
  showDownload = false,
  disableDownload = false,
}) {
  return (
    <div className="card-elevated p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
          <FileText size={15} style={{ color: '#818CF8' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }} title={file?.name || `File ${index + 1}`}>
            {file?.name || `File ${index + 1}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatBytes(file?.size || 0)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button className="btn-icon" type="button" onClick={onPreview} aria-label="Preview file">
          <Eye size={14} />
        </button>
        {showDownload ? (
          <button
            className="btn-icon"
            type="button"
            onClick={onDownloadSingle}
            disabled={disableDownload}
            aria-label="Download file"
          >
            <Download size={14} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
