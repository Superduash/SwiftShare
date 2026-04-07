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
    title: 'Transfer not found',
    description: 'This code doesn\'t match any active transfer. Double-check and try again.',
    icon: FileX,
    color: 'var(--text-3)',
    action: 'Try another code',
  },
  TRANSFER_EXPIRED: {
    title: 'Transfer expired',
    description: 'This file has been automatically deleted. Ask the sender to share again.',
    icon: Clock,
    color: 'var(--warning)',
    action: 'Go home',
  },
  TRANSFER_CANCELLED: {
    title: 'Transfer cancelled',
    description: 'The sender cancelled this transfer. Files have been permanently deleted.',
    icon: Ban,
    color: 'var(--danger)',
    action: 'Go home',
  },
  TRANSFER_DELETED: {
    title: 'Transfer deleted',
    description: 'This transfer has been permanently deleted and is no longer available.',
    icon: FileX,
    color: 'var(--danger)',
    action: 'Go home',
  },
  ALREADY_DOWNLOADED: {
    title: 'Already downloaded',
    description: 'This was a burn-after-download transfer. The file was deleted after the first download.',
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
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again in a moment.',
    icon: Server,
    color: 'var(--danger)',
    action: 'Try again',
  },
  NETWORK_ERROR: {
    title: 'Connection lost',
    description: 'Can\'t reach the server. Check your internet connection.',
    icon: WifiOff,
    color: 'var(--danger)',
    action: 'Retry',
  },
}

export function getErrorInfo(code) {
  return ERROR_MAP[code] || ERROR_MAP.SERVER_ERROR
}

export function extractErrorCode(err) {
  if (err?.response?.data?.error?.code) return err.response.data.error.code
  if (err?.code === 'ERR_NETWORK') return 'NETWORK_ERROR'
  return 'SERVER_ERROR'
}
