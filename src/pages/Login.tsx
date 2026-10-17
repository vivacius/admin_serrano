import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthProvider'
import { Aviso, Button, Field, Input } from '@/components/ui'

export default function Login() {
  const { user, entrar: setAuthUser } = useAuth()
  const [email, setEmail] = useState('admin@serrano.local')
  const [clave, setClave] = useState('admin123')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleLogin(e?: React.FormEvent, customEmail?: string, customPass?: string) {
    if (e) e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const u = await api.login(customEmail || email, customPass || clave)
      setAuthUser(u)
    } catch (err: unknown) {
      setError((err as Error).message || 'Credenciales inválidas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-4">
      <form onSubmit={(e) => handleLogin(e)} className="animate-in w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-40 items-center justify-center rounded-xl bg-brand-900 px-3 py-2 shadow-sm">
            <img src="/logo.png" alt="SERRANO" className="h-8 w-auto object-contain" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-brand-950">Gestión Inmobiliaria</h1>
          <p className="text-xs text-gray-400 mt-0.5">Acceso al sistema administrativo</p>
        </div>

        <Field label="Correo">
          <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña">
          <Input id="login-clave" type="password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        </Field>
        {error && <Aviso>{error}</Aviso>}
        <Button id="login-submit" className="w-full" size="lg" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </Button>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-2 text-center uppercase tracking-wider">Acceso Rápido Demo</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => { setEmail('admin@serrano.local'); setClave('admin123'); handleLogin(undefined, 'admin@serrano.local', 'admin123') }}
              className="text-xs py-1.5 px-2 bg-brand-50 text-brand-800 rounded hover:bg-brand-100 font-medium transition"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setEmail('cartera@serrano.local'); setClave('cartera123'); handleLogin(undefined, 'cartera@serrano.local', 'cartera123') }}
              className="text-xs py-1.5 px-2 bg-brand-50 text-brand-800 rounded hover:bg-brand-100 font-medium transition"
            >
              Cartera
            </button>
            <button
              type="button"
              onClick={() => { setEmail('consulta@serrano.local'); setClave('consulta123'); handleLogin(undefined, 'consulta@serrano.local', 'consulta123') }}
              className="text-xs py-1.5 px-2 bg-brand-50 text-brand-800 rounded hover:bg-brand-100 font-medium transition"
            >
              Consulta
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
