import React from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Image, Video, FileArchive, File, FileSpreadsheet,
  Download, Eye, X, Music
} from 'lucide-react'
import { formatBytes } from '../utils/format'

const ICON_MAP = {
  pdf: { icon: FileText, color: '#DC2626' },
  image: { icon: Image, color: '#0891B2' },
  video: { icon: Video, color: '#7C3AED' },
  zip: { icon: FileArchive, color: '#D97706' },
  doc: { icon: FileText, color: '#2563EB' },
  spreadsheet: { icon: FileSpreadsheet, color: '#16A34A' },
  audio: { icon: Music, color: '#EC4899' },
  file: { icon: File, color: 'var(--text-3)' },
}

function getFileCategory(file) {
  const mime = (file?.mimeType || file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) return 'zip'
  if (mime.includes('word') || mime.includes('document')) return 'doc'
  if (mime.includes('sheet') || mime.includes('csv') || mime.includes('excel')) return 'spreadsheet'
  return 'file'
}

export default function FileCard({
  file, index = 0, onPreview, onDownloadSingle, onRemove,
  showDownload = false, showRemove = false, disableDownload = false,
}) {
  const cat = getFileCategory(file)
  const { icon: Icon, color } = ICON_MAP[cat] || ICON_MAP.file

  return (
    <motion.div
      className="surface-card-flat p-3 flex items-center justify-between gap-3 group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}12`, border: `1px solid ${color}20` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }} title={file?.name || `File ${index + 1}`}>
            {file?.name || `File ${index + 1}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
            {formatBytes(file?.size || 0)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onPreview && (
          <button className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onPreview(index)} aria-label="Preview">
            <Eye size={15} />
          </button>
        )}
        {showDownload && onDownloadSingle && (
          <button className="btn-icon" onClick={() => onDownloadSingle(index)} disabled={disableDownload} aria-label="Download">
            <Download size={15} />
          </button>
        )}
        {showRemove && onRemove && (
          <button className="btn-icon hover:!text-red-500" onClick={() => onRemove(index)} aria-label="Remove">
            <X size={15} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
