'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { authApi } from './api'

export type Rol = 'vicepresidente' | 'directivo' | 'tecnico'

export interface User {
  id: number
  nombre: string
  email: string
  rol: Rol
  vicepresidencia: string | null
  dependencia: string | null
  activo: boolean
}

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isVice: boolean
  isDirectivo: boolean
  isTecnico: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { access_token, user: u } = res.data as { access_token: string; user: User }
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    authApi.logout().catch(() => {})
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isVice: user?.rol === 'vicepresidente',
        isDirectivo: user?.rol === 'directivo',
        isTecnico: user?.rol === 'tecnico',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
