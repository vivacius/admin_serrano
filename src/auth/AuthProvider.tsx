import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, type Usuario } from '@/lib/api'
import type { Rol } from '@/lib/types'

interface Ctx {
  user: Usuario | null
  rol: Rol | null
  nombre: string | null
  cargando: boolean
  puede: (...roles: Rol[]) => boolean
  entrar: (u: Usuario) => void
  salir: () => Promise<void>
}

const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setCargando(false)
      return
    }
    api.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setCargando(false))

    const onLogout = () => setUser(null)
    window.addEventListener('serrano:logout', onLogout)
    return () => window.removeEventListener('serrano:logout', onLogout)
  }, [])

  const value: Ctx = {
    user,
    rol: user?.rol ?? null,
    nombre: user?.nombre ?? null,
    cargando,
    puede: (...r) => !!user && r.includes(user.rol),
    entrar: (u) => setUser(u),
    salir: async () => {
      await api.logout()
      setUser(null)
    },
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
