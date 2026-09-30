import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const adminClient = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  timeout: 15000,
})

// Attach Bearer token from sessionStorage or localStorage
adminClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('swiftshare_admin_token') || localStorage.getItem('swiftshare_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auto-logout on 401
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('swiftshare_admin_token')
      localStorage.removeItem('swiftshare_admin_token')
      window.dispatchEvent(new CustomEvent('swiftshare:admin-unauthorized'))
    }
    return Promise.reject(error)
  }
)

export async function adminLogin(username, password) {
  const res = await adminClient.post('/login', { username, password })
  if (res.data?.token) {
    sessionStorage.setItem('swiftshare_admin_token', res.data.token)
  }
  return res.data
}

export async function checkAdminSession() {
  const res = await adminClient.get('/session')
  return res.data
}

export async function adminLogout() {
  try {
    await adminClient.post('/logout')
  } finally {
    sessionStorage.removeItem('swiftshare_admin_token')
    localStorage.removeItem('swiftshare_admin_token')
  }
}

export async function adminLogoutAll() {
  try {
    await adminClient.post('/logout-all')
  } finally {
    sessionStorage.removeItem('swiftshare_admin_token')
    localStorage.removeItem('swiftshare_admin_token')
  }
}

export async function fetchOverview(range = '7d') {
  const res = await adminClient.get(`/overview?range=${range}`)
  return res.data
}

export async function fetchTimeseries(metric = 'pageviews', range = '7d') {
  const res = await adminClient.get(`/timeseries?metric=${metric}&range=${range}`)
  return res.data
}

export async function fetchTrafficPages(range = '7d') {
  const res = await adminClient.get(`/traffic/pages?range=${range}`)
  return res.data
}

export async function fetchTrafficSources(range = '7d') {
  const res = await adminClient.get(`/traffic/sources?range=${range}`)
  return res.data
}

export async function fetchTrafficCountries(range = '7d') {
  const res = await adminClient.get(`/traffic/countries?range=${range}`)
  return res.data
}

export async function fetchTrafficDevices(range = '7d') {
  const res = await adminClient.get(`/traffic/devices?range=${range}`)
  return res.data
}

export async function fetchTrafficHours(range = '7d') {
  const res = await adminClient.get(`/traffic/hours?range=${range}`)
  return res.data
}

export async function fetchTrafficCrawlers(range = '7d') {
  const res = await adminClient.get(`/traffic/crawlers?range=${range}`)
  return res.data
}

export async function fetchFunnel(range = '7d') {
  const res = await adminClient.get(`/funnel?range=${range}`)
  return res.data
}

export async function fetchBreakdowns(range = '7d') {
  const res = await adminClient.get(`/breakdowns?range=${range}`)
  return res.data
}

export async function fetchTransfers(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page)
  if (params.limit) query.set('limit', params.limit)
  if (params.status) query.set('status', params.status)
  if (params.burn) query.set('burn', params.burn)
  if (params.password) query.set('password', params.password)
  if (params.search) query.set('search', params.search)
  if (params.sort) query.set('sort', params.sort)

  const res = await adminClient.get(`/transfers?${query.toString()}`)
  return res.data
}

export async function fetchTransferDetails(code) {
  const res = await adminClient.get(`/transfers/${encodeURIComponent(code)}`)
  return res.data
}

export async function expireTransfer(code) {
  const res = await adminClient.post(`/transfers/${encodeURIComponent(code)}/expire`, { confirm: 'EXPIRE' })
  return res.data
}

export async function fetchSystemHealth() {
  const res = await adminClient.get('/system')
  return res.data
}

export async function fetchAuditLogs() {
  const res = await adminClient.get('/audit')
  return res.data
}

export function getExportUrl(type = 'summary', range = '7d') {
  const token = sessionStorage.getItem('swiftshare_admin_token') || localStorage.getItem('swiftshare_admin_token')
  return `${API_BASE}/api/admin/export?type=${type}&range=${range}&token=${token}`
}
