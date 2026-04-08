import {
  FileWarning, Clock, ShieldX, AlertTriangle, WifiOff,
  Ban, FileX, Server, Lock, Flame
} from 'lucide-react'

const ERROR_MAP = {
  FILE_TOO_LARGE: {
    title: 'File too large',
    description: 'Max file size is 100 MB. Try compressing or splitting.',
    icon: FileWarning,
    color: 'var(--warning)',
    action: 'Choose a smaller file',
  },
  TOO_MANY_FILES: {
    title: 'Too many files',
    description: 'You can upload up to 5 files at once.',
    icon: FileWarning,
    color: 'var(--warning)',
    action: 'Remove some files',
  },
  INVALID_FILE_TYPE: {
    title: 'Blocked file type',
    description: 'Executable files (.exe, .bat, .sh, etc.) are not allowed for safety.',
    icon: Ban,
    color: 'var(--danger)',
    action: 'Choose a different file',
  },
  NO_FILE_UPLOADED: {
    title: 'No file selected',
    description: 'Please select at least one file to share.',
    icon: FileX,
    color: 'var(--text-3)',
    action: 'Select a file',
  },
  TRANSFER_NOT_FOUND: {
    title: 'No match found',
    description: 'That code doesn\'t match any active transfer. Double-check the code and try again.',
    icon: FileX,
    color: 'var(--text-3)',
    action: 'Try another code',
  },
  TRANSFER_EXPIRED: {
    title: 'This transfer expired',
    description: 'The timer ran out and the files were automatically cleaned up. Ask the sender to share again.',
    icon: Clock,
    color: 'var(--warning)',
    action: 'Go home',
  },
  TRANSFER_CANCELLED: {
    title: 'Transfer was cancelled',
    description: 'The sender removed this transfer. The files are no longer available.',
    icon: Ban,
    color: 'var(--danger)',
    action: 'Go home',
  },
  TRANSFER_DELETED: {
    title: 'Transfer removed',
    description: 'This transfer is no longer available.',
    icon: FileX,
    color: 'var(--danger)',
    action: 'Go home',
  },
  ALREADY_DOWNLOADED: {
    title: 'Already claimed',
    description: 'This was a one-time download. The file was automatically removed after the first download.',
    icon: Flame,
    color: 'var(--danger)',
    action: 'Go home',
  },
  PASSWORD_REQUIRED: {
    title: 'Password required',
    description: 'This transfer is protected. Enter the password to proceed.',
    icon: Lock,
    color: 'var(--info)',
    action: 'Enter password',
  },
  INVALID_PASSWORD: {
    title: 'Wrong password',
    description: 'The password you entered is incorrect.',
    icon: ShieldX,
    color: 'var(--danger)',
    action: 'Try again',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Slow down',
    description: 'Too many requests. Please wait a moment before trying again.',
    icon: AlertTriangle,
    color: 'var(--warning)',
    action: 'Wait and retry',
  },
  INVALID_CODE: {
    title: 'Invalid code',
    description: 'Transfer codes are 6 characters (letters and numbers only).',
    icon: AlertTriangle,
    color: 'var(--warning)',
    action: 'Check the code',
  },
  SERVER_ERROR: {
    title: 'Hiccup on our end',
    description: 'Something unexpected happened. Give it another try — it usually works.',
    icon: Server,
    color: 'var(--warning)',
    action: 'Try again',
  },
  NETWORK_ERROR: {
    title: 'Taking a moment',
    description: 'The server is warming up or your connection dropped briefly. This usually resolves in a few seconds.',
    icon: WifiOff,
    color: 'var(--warning)',
    action: 'Retry',
  },
  TIMEOUT_ERROR: {
    title: 'Taking longer than expected',
    description: 'The server is responding slowly right now. Try again in a moment.',
    icon: Clock,
    color: 'var(--warning)',
    action: 'Retry',
  },
  EMPTY_RESPONSE: {
    title: 'Temporary response issue',
    description: 'We received an incomplete response. Please retry.',
    icon: AlertTriangle,
    color: 'var(--warning)',
    action: 'Retry',
  },
}

export function getErrorInfo(code) {
  return ERROR_MAP[code] || ERROR_MAP.SERVER_ERROR
}

export function extractErrorCode(err) {
  if (err?.response?.data?.error?.code) return err.response.data.error.code
  if (err?.code === 'ECONNABORTED') return 'TIMEOUT_ERROR'
  if (/timeout/i.test(String(err?.message || ''))) return 'TIMEOUT_ERROR'
  if (err?.code === 'ERR_NETWORK') return 'NETWORK_ERROR'
  return 'SERVER_ERROR'
}
