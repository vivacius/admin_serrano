import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { listarNegociaciones, principal, textoBusqueda } from '@/lib/api'
import type { NegociacionFila } from '@/lib/types'
import { ESTADOS, formatCOP } from '@/lib/utils'
import { Badge, Input } from './ui'

/** Buscador de negociaciones por comprador, documento, proyecto, lote o código de venta. */
export default function NegociacionPicker({
  onSelect,
  soloActivas = false,
  placeholder = 'Buscar por comprador, documento, lote, venta o proyecto…',
}: {
  onSelect: (n: NegociacionFila) => void
  soloActivas?: boolean
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data = [], isLoading, error } = useQuery({ queryKey: ['negociaciones'], queryFn: listarNegociaciones })

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return data
      .filter((n) => (!soloActivas || !['cancelado', 'finalizado'].includes(n.estado)) && textoBusqueda(n).includes(t))
      .slice(0, 10)
  }, [q, data, soloActivas])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
        <Input
          id="picker-negociacion"
          className="pl-9 pr-8"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setAbierto(false)
            }}
            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isLoading && <p className="mt-1 text-xs text-gray-400">Cargando negociaciones…</p>}
      {error && <p className="mt-1 text-xs text-red-600">No se pudo cargar: {(error as Error).message}</p>}

      {abierto && resultados.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl divide-y divide-gray-50 animate-in">
          {resultados.map((n) => {
            const cli = principal(n)
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-brand-50/80 flex items-center justify-between gap-3 group"
                  onClick={() => {
                    onSelect(n)
                    setQ('')
                    setAbierto(false)
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-950 group-hover:text-brand-800 truncate">
                      {cli?.nombres ?? 'Sin comprador'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {cli?.tipo_documento ?? 'CC'} {cli?.numero_documento ?? '—'} ·{' '}
                      <span className="font-medium text-gray-700">{n.lotes.proyectos.nombre}</span> · Lote{' '}
                      <span className="font-medium text-brand-900">{n.lotes.codigo}</span>
                      {n.lotes.area_m2 ? ` (${n.lotes.area_m2} m²)` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end mb-0.5">
                      <span className="text-xs font-mono font-bold text-brand-900 bg-brand-50 px-1.5 py-0.5 rounded">
                        {n.codigo_venta}
                      </span>
                      <Badge estado={n.estado}>{ESTADOS[n.estado] ?? n.estado}</Badge>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{formatCOP(n.precio_acordado)}</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {abierto && q.trim().length > 1 && !isLoading && resultados.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white p-4 shadow-xl text-center text-xs text-gray-500">
          No se encontraron negociaciones que coincidan con &ldquo;{q}&rdquo;
        </div>
      )}
    </div>
  )
}
