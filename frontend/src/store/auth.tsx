import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, setTokens, clearTokens, loadRefreshToken, getAccessToken } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: try to restore session from stored refresh token
  useEffect(() => {
    const refresh = loadRefreshToken()
    if (!refresh) {
      setIsLoading(false)
      return
    }
    import('../lib/api').then(({ api }) => {
      api.post('/auth/refresh', { refresh_token: refresh })
        .then(({ data }) => {
          setTokens(data.access_token, data.refresh_token)
          return authApi.me()
        })
        .then(({ data }) => setUser(data))
        .catch(() => clearTokens())
        .finally(() => setIsLoading(false))
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password)
    setTokens(data.access_token, data.refresh_token)
    const { data: me } = await authApi.me()
    setUser(me)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await authApi.register(name, email, password)
    await login(email, password)
  }, [login])

  const logout = useCallback(async () => {
    const refresh = loadRefreshToken()
    if (refresh) {
      try { await authApi.logout(refresh) } catch { /* ignore */ }
    }
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
