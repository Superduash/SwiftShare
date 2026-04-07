import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Image, Video, Archive, File, Code, Music, Eye, Download, FileSpreadsheet } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

function getIconConfig(icon, mimeType = '') {
  const t = (icon || '').toLowerCase()
  const m = (mimeType || '').toLowerCase()

  if (t === 'pdf') return { Icon: FileText, cls: 'file-icon-pdf' }
  if (t === 'image' || m.startsWith('image/')) return { Icon: Image, cls: 'file-icon-image' }
  if (t === 'video' || m.startsWith('video/')) return { Icon: Video, cls: 'file-icon-video' }
  if (t === 'zip' || t === 'archive') return { Icon: Archive, cls: 'file-icon-zip' }
  if (t === 'doc' || m.includes('word')) return { Icon: FileText, cls: 'file-icon-doc' }
  if (t === 'code') return { Icon: Code, cls: 'file-icon-code' }
  if (m.startsWith('audio/')) return { Icon: Music, cls: 'file-icon-other' }
  if (m.includes('spreadsheet') || m.includes('excel')) return { Icon: FileSpreadsheet, cls: 'file-icon-doc' }
  return { Icon: File, cls: 'file-icon-other' }
}

function canPreview(icon, mimeType = '') {
  const t = (icon || '').toLowerCase()
  const m = (mimeType || '').toLowerCase()
  return t === 'image' || t === 'pdf' || m.startsWith('image/') || m.includes('pdf')
}

export default function FileCard({
  file,
  index = 0,
  onPreview,
  onDownloadSingle,
  showDownload = false,
  disableDownload = false,
}) {
  const { Icon, cls } = getIconConfig(file?.icon, file?.type)
  const canPrev = canPreview(file?.icon, file?.type)

  return (
    <motion.div
      className="glass-card p-4 flex items-center gap-4 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={{
        scale: 1.02,
        borderColor: 'rgba(34,211,238,0.25)',
        boxShadow: '0 16px 36px rgba(34,211,238,0.16)',
      }}
    >
      {/* File icon */}
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${cls}`}>
        <Icon size={20} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-semibold text-sm truncate">{file?.name || 'Unknown file'}</p>
        <p className="text-text-dim text-xs mt-0.5">{formatBytes(file?.size)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {canPrev && onPreview && (
          <button
            className="btn-icon"
            onClick={() => onPreview(index)}
            title="Preview"
          >
            <Eye size={14} />
          </button>
        )}
        {showDownload && onDownloadSingle && (
          <button
            className="btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onDownloadSingle(index)}
            title="Download"
            disabled={disableDownload}
          >
            <Download size={14} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
