const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File is too large. Please choose a smaller file.',
  TOO_MANY_FILES: 'Too many files selected. Please reduce the number of files.',
  INVALID_FILE_TYPE: 'This file type is not allowed.',
  NO_FILE_UPLOADED: 'No file selected. Please choose a file to share.',
  TRANSFER_NOT_FOUND: "This transfer doesn't exist or has been removed.",
  CODE_NOT_FOUND: "We couldn't find a transfer with that code.",
  TRANSFER_EXPIRED: 'This transfer has expired.',
  ALREADY_DOWNLOADED: 'This file was already claimed (burn after download).',
  PASSWORD_REQUIRED: 'A password is required to access this transfer.',
  INVALID_PASSWORD: 'Wrong password. Please try again.',
  REQUEST_TIMEOUT: 'Request timed out. Please check your connection.',
  INVALID_CODE: 'That transfer code looks invalid.',
  INVALID_REQUEST: 'Invalid request. Please try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment.',
  ROUTE_NOT_FOUND: 'Page not found.',
  SERVER_ERROR: 'Something went wrong on our end. Try again in a moment.',
  NETWORK_ERROR: 'Connection lost. Check your internet and try again.',
}

export function getBackendErrorMessage(code, fallback = 'Something went wrong') {
  return ERROR_MESSAGES[code] || fallback
}
