import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refreshSession, setToken } from './api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      try { if (await refreshSession()) setUser(await api('/auth/me')) } catch { /* signed out */ }
      setReady(true)
    })()
  }, [])

  const start = useCallback(async (path, body) => {
    const { access_token } = await api(path, { method: 'POST', json: body })
    setToken(access_token)
    setUser(await api('/auth/me'))
  }, [])

  const value = useMemo(() => ({
    user, ready,
    login: (email, password) => start('/auth/login', { email, password }),
    register: (full_name, email, password) => start('/auth/register', { full_name, email, password }),
    logout: async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setToken(null); setUser(null) },
  }), [user, ready, start])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
