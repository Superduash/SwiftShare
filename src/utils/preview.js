function normalizeMime(file) {
  return String(file?.mimeType || file?.type || '').toLowerCase().split(';')[0].trim()
}

function normalizeName(file) {
  return String(file?.name || file?.originalName || '').toLowerCase().trim()
}

function hasExtension(name, extensions) {
  return extensions.some((ext) => name.endsWith(`.${ext}`))
}

const IMAGE_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif', 'ico', 'tif', 'tiff', 'jfif', 'pjpeg', 'pjp',
]

const VIDEO_EXTENSIONS = [
  'mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'ogv', '3gp', '3g2', 'ts', 'mts', 'm2ts', 'mpg', 'mpeg', 'mxf',
]

const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wma', 'aiff', 'aif', 'caf', 'amr', '3ga', 'mid', 'midi', 'mpga', 'mpeg', 'weba', 'alac',
]

const CODE_EXTENSIONS = [
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'css', 'html', 'md', 'txt', 'log', 'sql', 'json', 'yaml', 'yml', 'xml', 'csv',
  'sh', 'bash', 'zsh', 'ps1', 'toml', 'ini', 'cfg', 'conf', 'env', 'gitignore', 'dockerfile', 'makefile', 'vue', 'svelte', 'kt', 'swift', 'r', 'dart', 'lua',
  'pl', 'perl', 'scala', 'ex', 'exs', 'erl', 'clj', 'fs', 'fsx', 'fsi', 'hs', 'elm', 'ml', 'mli', 'nim', 'zig',
]

function isPdf(mime, name) {
  return mime.includes('pdf') || name.endsWith('.pdf')
}

function isImage(mime, name) {
  return mime.startsWith('image/') || hasExtension(name, IMAGE_EXTENSIONS)
}

function isVideo(mime, name) {
  return mime.startsWith('video/') || hasExtension(name, VIDEO_EXTENSIONS)
}

function isAudio(mime, name) {
  return mime.startsWith('audio/')
    || mime === 'application/ogg'
    || mime === 'application/x-ogg'
    || mime === 'application/vnd.apple.mpegurl'
    || hasExtension(name, AUDIO_EXTENSIONS)
}

function isDocx(mime, name) {
  return mime.includes('wordprocessingml') || name.endsWith('.docx')
}

function isCodeOrText(mime, name) {
  return mime.startsWith('text/')
    || mime.includes('json')
    || mime.includes('javascript')
    || mime.includes('xml')
    || mime.includes('yaml')
    || hasExtension(name, CODE_EXTENSIONS)
}

export function getPreviewType(file) {
  const mime = normalizeMime(file)
  const name = normalizeName(file)

  if (isImage(mime, name)) return 'image'
  if (isPdf(mime, name)) return 'pdf'
  if (isVideo(mime, name)) return 'video'
  if (isAudio(mime, name)) return 'audio'
  if (isDocx(mime, name)) return 'docx'
  if (isCodeOrText(mime, name)) return 'code'

  return 'unsupported'
}

export function isFilePreviewable(file) {
  return getPreviewType(file) !== 'unsupported'
}
