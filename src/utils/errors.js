import {
  FileWarning, Clock, ShieldX, AlertTriangle, WifiOff,
  Ban, FileX, Server, Lock, Flame
} from 'lucide-react'

const ERROR_MAP = {
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    description: 'The selected file exceeds the size limit.',
    icon: FileWarning,
    color: 'var(--warning)',
    action: 'Choose a smaller file',
  },
  TOO_MANY_FILES: {
    title: 'Too Many Files',
    description: 'Reduce the number of selected files and try again.',
    icon: FileWarning,
    color: 'var(--warning)',
    action: 'Remove some files',
  },
  INVALID_FILE_TYPE: {
    title: 'Blocked File Type',
    description: 'This file type is not allowed.',
    icon: Ban,
    color: 'var(--danger)',
    action: 'Choose another file',
  },
  NO_FILE_UPLOADED: {
    title: 'No File Selected',
    description: 'Select at least one file to continue.',
    icon: FileX,
    color: 'var(--text-3)',
    action: 'Select file',
  },
  TRANSFER_NOT_FOUND: {
    title: 'Transfer Not Found',
    description: 'No active transfer matches this code.',
    icon: FileX,
    color: 'var(--text-3)',
    action: 'Go home',
  },
  TRANSFER_EXPIRED: {
    title: 'Transfer Expired',
    description: 'This transfer is no longer available.',
    icon: Clock,
    color: 'var(--warning)',
    action: 'Go home',
  },
  TRANSFER_CANCELLED: {
    title: 'Transfer Deleted',
    description: 'This transfer was removed by the sender.',
    icon: Ban,
    color: 'var(--danger)',
    action: 'Go home',
  },
  TRANSFER_DELETED: {
    title: 'Transfer Deleted',
    description: 'This transfer was removed by the sender.',
    icon: FileX,
    color: 'var(--danger)',
    action: 'Go home',
  },
  ALREADY_DOWNLOADED: {
    title: 'Transfer Unavailable',
    description: 'This burn transfer has already been claimed.',
    icon: Flame,
    color: 'var(--danger)',
    action: 'Go home',
  },
  PASSWORD_REQUIRED: {
    title: 'Password Required',
    description: 'Enter the transfer password to continue.',
    icon: Lock,
    color: 'var(--info)',
    action: 'Enter password',
  },
  UNAUTHORIZED: {
    title: 'Access Restricted',
    description: 'This page is only available to the original sender.',
    icon: Ban,
    color: 'var(--danger)',
    action: 'Go home',
  },
  INVALID_PASSWORD: {
    title: 'Incorrect Password',
    description: 'The password entered is incorrect.',
    icon: ShieldX,
    color: 'var(--danger)',
    action: 'Try again',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Too Many Attempts',
    description: 'Please wait before trying again.',
    icon: AlertTriangle,
    color: 'var(--warning)',
    action: 'Wait and retry',
  },
  INVALID_CODE: {
    title: 'Transfer Not Found',
    description: 'No active transfer matches this code.',
    icon: AlertTriangle,
    color: 'var(--warning)',
    action: 'Check the code',
  },
  SERVER_ERROR: {
    title: 'Server Error',
    description: 'An unexpected error occurred. Please try again.',
    icon: Server,
    color: 'var(--warning)',
    action: 'Try again',
  },
  NETWORK_ERROR: {
    title: 'Connection Issue',
    description: 'Unable to reach SwiftShare. Check your connection and try again.',
    icon: WifiOff,
    color: 'var(--warning)',
    action: 'Retry',
  },
  TIMEOUT_ERROR: {
    title: 'Request Timed Out',
    description: 'The request took too long to complete. Please try again.',
    icon: Clock,
    color: 'var(--warning)',
    action: 'Retry',
  },
  EMPTY_RESPONSE: {
    title: 'Connection Issue',
    description: 'Unable to reach SwiftShare. Check your connection and try again.',
    icon: AlertTriangle,
    color: 'var(--warning)',
    action: 'Retry',
  },
  BURN_ALREADY_OPEN: {
    title: 'Transfer Already Open',
    description: 'This burn transfer is already active in another tab.',
    icon: Flame,
    color: 'var(--warning)',
    action: 'Close tab',
  },
  SESSION_ENDED: {
    title: 'Session Ended',
    description: 'Your burn session is no longer active.',
    icon: Clock,
    color: 'var(--danger)',
    action: 'Go home',
  },
  CLAIMING_TRANSFER: {
    title: 'Claiming Transfer',
    description: 'Verifying exclusive access.',
    icon: Flame,
    color: 'var(--info)',
    action: 'Please wait',
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
