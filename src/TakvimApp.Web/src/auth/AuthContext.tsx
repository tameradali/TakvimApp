import { createContext, useContext, useState, ReactNode } from 'react'
import { getToken, setToken, removeToken } from '../api/client'

interface AuthUser {
  kullaniciAdi: string
  kullaniciId: number
  token: string
  rol: string  // 'admin' | 'tenant'
}

interface AuthContextType {
  user: AuthUser | null
  loginSuccess: (token: string, kullaniciAdi: string, kullaniciId: number, rol: string) => void
  logout: () => void
  isLoggedIn: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadUser(): AuthUser | null {
  const token        = getToken()
  const kullaniciAdi = localStorage.getItem('takvimapp_user') ?? ''
  const kullaniciId  = Number(localStorage.getItem('takvimapp_uid') ?? '0')
  const rol          = localStorage.getItem('takvimapp_rol') ?? 'tenant'
  return token ? { token, kullaniciAdi, kullaniciId, rol } : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser)

  function loginSuccess(token: string, kullaniciAdi: string, kullaniciId: number, rol: string) {
    setToken(token)
    localStorage.setItem('takvimapp_user', kullaniciAdi)
    localStorage.setItem('takvimapp_uid',  String(kullaniciId))
    localStorage.setItem('takvimapp_rol',  rol)
    setUser({ token, kullaniciAdi, kullaniciId, rol })
  }

  function logout() {
    removeToken()
    localStorage.removeItem('takvimapp_user')
    localStorage.removeItem('takvimapp_uid')
    localStorage.removeItem('takvimapp_rol')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loginSuccess,
      logout,
      isLoggedIn: !!user,
      isAdmin: user?.rol === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
