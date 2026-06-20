import { useState, useRef, useEffect, memo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Image, Video, FileArchive, File, FileSpreadsheet,
  Download, Eye, X, Music, FileCode, Presentation, Copy, Check
} from 'lucide-react'
import { formatBytes } from '../utils/format'
import { isFilePreviewable } from '../utils/preview'

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

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } }
}

function FileCardBase({
  file, index = 0, onPreview, onDownloadSingle, onRemove, onRename,
  showDownload = false, showRemove = false, disableDownload = false,
  onContextMenu,
}) {
  const cat = getFileCategory(file)
  const { icon: Icon, color } = ICON_MAP[cat] || ICON_MAP.file

  // Long press detection for mobile context menus
  const timerRef = useRef(null)
  
  const handleTouchStart = (e) => {
    if (!onContextMenu) return
    const touch = e.touches[0]
    timerRef.current = setTimeout(() => {
      onContextMenu(e, index, { x: touch.clientX, y: touch.clientY })
    }, 500)
  }

  const cancelTouch = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(file?.name || '')
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commitRename = () => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== file?.name && onRename) {
      onRename(index, trimmed)
    } else {
      setDraftName(file?.name || '')
    }
    setEditing(false)
  }

  const [copiedName, setCopiedName] = useState(false)
  const handleCopyFileName = (e) => {
    e.stopPropagation()
    import('../utils/clipboard').then(({ copyToClipboard }) => {
      copyToClipboard(file?.name || '').then(success => {
        if (success) {
          setCopiedName(true)
          toast.success('Filename copied')
          setTimeout(() => setCopiedName(false), 2000)
        } else {
          toast.error('Failed to copy')
        }
      })
    })
  }

  return (
    <motion.div
      className="surface-card-flat p-3 flex items-center justify-between gap-3 group"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, index, { x: e.clientX, y: e.clientY }) : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={cancelTouch}
      onTouchEnd={cancelTouch}
      style={{ WebkitUserSelect: onContextMenu ? 'none' : 'auto', userSelect: onContextMenu ? 'none' : 'auto' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}12`, border: `1px solid ${color}20` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') { setEditing(false); setDraftName(file?.name || '') }
              }}
              className="surface-input text-sm min-w-0 flex-1 py-0.5 px-1 rounded"
              style={{ maxWidth: '100%', background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}
            />
          ) : (
            <button
              className="text-sm font-medium truncate text-left w-full"
              style={{ color: 'var(--text)', outline: 'none' }}
              onClick={() => {
                if (onRename) {
                  setDraftName(file?.name || '')
                  setEditing(true)
                }
              }}
              title={onRename ? "Click to rename" : (file?.name || `File ${index + 1}`)}
              disabled={!onRename}
            >
              {file?.name || `File ${index + 1}`}
            </button>
          )}
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
            {formatBytes(file?.size || 0)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopyFileName}
          aria-label="Copy filename"
          title="Copy filename"
        >
          {copiedName ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
        </button>
        {onPreview && isFilePreviewable(file) && (
          <button className="btn-icon transition-opacity" onClick={() => onPreview(index)} aria-label="Preview">
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
export default memo(FileCardBase, (prev, next) => {
  const fileEqual =
    prev.file === next.file ||
    (
      prev.file?.name === next.file?.name &&
      prev.file?.size === next.file?.size &&
      prev.file?.mimeType === next.file?.mimeType
    )
  return (
    fileEqual &&
    prev.index === next.index &&
    prev.showDownload === next.showDownload &&
    prev.showRemove === next.showRemove &&
    prev.disableDownload === next.disableDownload &&
    prev.onPreview === next.onPreview &&
    prev.onDownloadSingle === next.onDownloadSingle &&
    prev.onRemove === next.onRemove &&
    prev.onRename === next.onRename &&
    prev.onContextMenu === next.onContextMenu
  )
})
