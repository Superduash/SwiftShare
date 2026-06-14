export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch (e) {
    return false
  }
}

export function showDownloadNotification(receiverDevice) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification('SwiftShare — File Downloaded', {
      body: `${receiverDevice || 'Someone'} just downloaded your file.`,
      icon: '/favicon.svg',
      tag: 'swiftshare-download',
    })
  } catch (e) {
    console.error('Failed to show notification', e)
  }
}
