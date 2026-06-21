import { getErrorInfo } from './errors'

export function getBackendErrorMessage(code, fallback = 'Something went wrong') {
  const info = getErrorInfo(code)
  return info && info.description ? info.description : fallback
}

