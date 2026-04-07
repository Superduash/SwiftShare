export function formatBytes(bytes) {
  const b = Number(bytes || 0)
  if (b <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exp = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1)
  const size = b / Math.pow(1024, exp)
  return `${size.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function formatTimeWords(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`
}

export function timeAgo(dateString) {
  if (!dateString) return 'just now'
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000
  if (diff < 10) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatRelativeExpiry(expiresAt) {
  if (!expiresAt) return 'Unknown'
  const diff = (new Date(expiresAt).getTime() - Date.now()) / 1000
  if (diff <= 0) return 'Expired'
  return `${formatTimeWords(diff)} left`
}

export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return ''
  return `${formatBytes(bytesPerSecond)}/s`
}

export function expiryLabel(minutes) {
  if (minutes <= 10) return '10 min'
  if (minutes <= 60) return '1 hour'
  return '5 hours'
}
