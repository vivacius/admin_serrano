import { useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Building2, FileText, FileUp, HandCoins, Home, LayoutGrid, LogOut, Menu, Receipt, Search, Users, Wallet, X, MapPin } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { cn } from '@/lib/utils'

const MODULOS = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/negociaciones', label: 'Negociaciones', icon: HandCoins },
  { to: '/inventario-lotes', label: 'Inventario de lotes', icon: LayoutGrid },
  { to: '/lotes', label: 'Ficha del lote', icon: MapPin },
  { to: '/abonos', label: 'Registrar abono', icon: Receipt },
  { to: '/estado-cuenta', label: 'Estados de cuenta', icon: FileText },
  { to: '/cartera', label: 'Cartera', icon: Wallet },
  { to: '/comisiones', label: 'Comisiones', icon: BarChart3 },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/proyectos', label: 'Proyectos', icon: Building2 },
  { to: '/importar-excel', label: 'Importar Excel', icon: FileUp },
]

export default function Layout() {
  const { user, cargando, rol, nombre, salir } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState('')
  const nav = useNavigate()

  if (cargando) return <div className="p-10 text-gray-500">Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!rol) return <div className="p-10 text-red-600">Tu usuario no tiene un perfil activo. Contacta al administrador.</div>

  return (
    <div className="flex h-full">
      <aside className={cn('fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-950 text-brand-100 transition-transform lg:static lg:translate-x-0', abierto ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/logo.png" alt="SERRANO" className="h-9 w-auto max-w-[170px] object-contain" />
          <button className="ml-auto lg:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {MODULOS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setAbierto(false)}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-brand-700 text-white' : 'hover:bg-brand-900')}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-brand-900 p-4 text-sm">
          <p className="truncate font-medium text-white">{nombre}</p>
          <p className="mb-3 text-xs capitalize text-brand-200">{rol}</p>
          <button onClick={salir} className="flex items-center gap-2 text-brand-200 hover:text-white"><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </aside>
      {abierto && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setAbierto(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button className="lg:hidden" onClick={() => setAbierto(true)} aria-label="Abrir menú"><Menu size={22} /></button>
          <form className="relative max-w-xl flex-1" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/negociaciones?q=${encodeURIComponent(q.trim())}`) }}>
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input id="buscador-global" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, documento, lote, venta o proyecto…"
              className="h-10 w-full rounded-lg bg-gray-100 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
