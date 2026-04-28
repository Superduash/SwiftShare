import React, { memo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Image, Video, FileArchive, File, FileSpreadsheet,
  Download, Eye, X, Music, FileCode, Presentation
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
  ppt: { icon: Presentation, color: '#D95240' },
  code: { icon: FileCode, color: '#0D9488' },
  txt: { icon: FileText, color: '#6B7280' },
  file: { icon: File, color: 'var(--text-3)' },
}

function getFileCategory(file) {
  const mime = (file?.mimeType || file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive') || /\.(zip|rar|7z|tar|gz|bz2|tgz)$/i.test(name)) return 'zip'
  if (mime.includes('presentationml') || mime.includes('powerpoint') || /\.(ppt|pptx|odp|key)$/i.test(name)) return 'ppt'
  if (mime.includes('wordprocessingml') || mime.includes('msword') || mime.includes('document') || /\.(doc|docx|odt|rtf)$/i.test(name)) return 'doc'
  if (mime.includes('spreadsheetml') || mime.includes('sheet') || mime.includes('csv') || mime.includes('excel') || /\.(xls|xlsx|csv|ods|numbers)$/i.test(name)) return 'spreadsheet'
  if (/\.(js|jsx|ts|tsx|py|java|cpp|c|h|go|rs|rb|php|cs|swift|kt|r|sh|bash|zsh|ps1|sql|html|css|scss|sass|vue|svelte|json|yaml|yml|xml|toml|env|config)$/i.test(name)) return 'code'
  if (mime === 'text/plain' || /\.(txt|log|md|readme|cfg|conf|ini)$/i.test(name)) return 'txt'
  return 'file'
}

function canPreview(file) {
  const mime = (file?.mimeType || file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  if (mime.includes('pdf') || name.endsWith('.pdf')) return true
  if (mime.startsWith('video/')) return true
  if (mime.startsWith('audio/')) return true
  if (mime.includes('wordprocessingml') || name.endsWith('.docx')) return true
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('xml') ||
    mime.includes('yaml') ||
    /\.(js|jsx|ts|tsx|py|java|cpp|c|h|go|rs|rb|php|css|html|md|txt|log|sql|json|yaml|yml|xml|csv)$/i.test(name)
  ) return true
  return false
}

function FileCardBase({
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
        {onPreview && canPreview(file) && (
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

// Memoized so the card doesn't re-render every time a sibling timer ticks
// or the parent's progress state changes. Identity-compares file by name+size
// (immutable identifiers post-upload) and the action callbacks.
export default memo(FileCardBase, (prev, next) => (
  prev.file === next.file
  || (
    prev.file?.name === next.file?.name
    && prev.file?.size === next.file?.size
    && prev.file?.mimeType === next.file?.mimeType
  )
) && prev.index === next.index
  && prev.showDownload === next.showDownload
  && prev.showRemove === next.showRemove
  && prev.disableDownload === next.disableDownload
  && prev.onPreview === next.onPreview
  && prev.onDownloadSingle === next.onDownloadSingle
  && prev.onRemove === next.onRemove)
