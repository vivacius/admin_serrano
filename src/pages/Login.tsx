import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthProvider'

export default function Login() {
  const { user, entrar: setAuthUser } = useAuth()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const u = await api.login(email.trim(), clave)
      setAuthUser(u)
    } catch (err: unknown) {
      setError((err as Error).message || 'Credenciales inválidas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="login-bg-video"
      >
        <source src="/video_fondo.mp4" type="video/mp4" />
      </video>

      <div className="login-video-overlay" />

      <div className="login-card">
        <div className="login-logo">
          <img src="/logo_sin_fondo.png" alt="SERRANO" className="login-logo-img" />
          <p>Gestión Inmobiliaria · Acceso Administrativo</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@serrano.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-clave">Contraseña</label>
            <input
              id="login-clave"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            id="login-submit"
            type="submit"
            className="login-btn-submit"
            disabled={cargando}
          >
            {cargando ? 'Ingresando…' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
