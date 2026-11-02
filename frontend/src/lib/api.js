// Fetch wrapper. The access token lives in memory only (not localStorage → safe from XSS theft);
// the refresh token is an httpOnly cookie, so a page reload silently restores the session.
let accessToken = null
let refreshing = null

export const setToken = (t) => { accessToken = t }

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function refreshSession() {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then(async (r) => {
      if (!r.ok) return false
      accessToken = (await r.json()).access_token
      return true
    })
    .catch(() => false)
    .finally(() => { refreshing = null })
  return refreshing
}

export async function api(path, { method = 'GET', json, form, query, retry = true } = {}) {
  const headers = {}
  let body
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json) }
  else if (form) body = form
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  const res = await fetch(`/api${path}${qs}`, { method, headers, body, credentials: 'same-origin' })

  if (res.status === 401 && retry && !path.startsWith('/auth/') && (await refreshSession())) {
    return api(path, { method, json, form, query, retry: false })
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const e = data?.error
    throw new ApiError(res.status, e?.code || 'error', e?.message || `Request failed (${res.status})`, e?.details)
  }
  return data
}

export const upload = (path, file, fields = {}) => {
  const form = new FormData()
  if (file) form.append('file', file)
  Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && form.append(k, v))
  return api(path, { method: 'POST', form })
}
