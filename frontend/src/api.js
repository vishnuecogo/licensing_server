const API = '/api'

export function getToken() {
  return localStorage.getItem('adm_token') || ''
}

export function setToken(t) {
  if (t) localStorage.setItem('adm_token', t)
  else localStorage.removeItem('adm_token')
}

export function parseJwt(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  try {
    const json = decodeURIComponent(atob(payload).split('').map(c => '%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    return JSON.parse(json)
  } catch { return null }
}

export function getClaims() {
  return parseJwt(getToken()) || {}
}

function qs(params = {}) {
  const q = Object.entries(params)
    .filter(([,v]) => v !== undefined && v !== null && v !== '')
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return q ? `?${q}` : ''
}

async function api(path, opts = {}) {
  const headers = opts.headers || {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}${path}`, { ...opts, headers })
  if (res.status === 401) setToken('')
  if (!res.ok) { const text = await res.text(); throw new Error(`${res.status} ${text}`) }
  const ct = res.headers.get('Content-Type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const AdminAPI = {
  login: async (email, password) => api('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  plans: {
    list: (params={}) => api('/admin/plans' + qs(params)),
    create: (body) => api('/admin/plans', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    del: (id) => api(`/admin/plans/${id}`, { method: 'DELETE' }),
  },
  orgs: {
    list: (params={}) => api('/admin/orgs' + qs(params)),
    create: (body) => api('/admin/orgs', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/admin/orgs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    del: (id) => api(`/admin/orgs/${id}`, { method: 'DELETE' }),
  },
  keys: {
    list: (params={}) => api('/admin/api-keys' + qs(params)),
    create: (body) => api('/admin/api-keys', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/admin/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    del: (id) => api(`/admin/api-keys/${id}`, { method: 'DELETE' }),
  },
  subs: {
    list: (params={}) => api('/admin/subs' + qs(params)),
    create: (body) => api('/admin/subs', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/admin/subs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    del: (id) => api(`/admin/subs/${id}`, { method: 'DELETE' }),
  },
}

