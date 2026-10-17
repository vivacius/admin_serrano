import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LoteInventario } from '@/lib/types'
import { ESTADOS, formatCOP } from '@/lib/utils'
import { Aviso, Badge, Button, Card, Field, Input, PageHeader, Select, Stat } from '@/components/ui'

export default function LotesInventario() {
  const [proyectoId, setProyectoId] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [q, setQ] = useState('')

  const { data: proyectos = [] } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => api.proyectos(),
  })

  const proyectosActivos = proyectos.filter((p) => p.activo)
  const idActivo = proyectoId || (proyectosActivos.find((p) => p.codigo === 'AMA')?.id ?? proyectosActivos[0]?.id ?? '')

  const { data: lotes = [], isLoading, error } = useQuery({
    queryKey: ['lotes', idActivo],
    queryFn: () => api.lotes(idActivo),
    enabled: !!idActivo,
  })

  const filtrados = useMemo(() => {
    let res = lotes
    if (filtroEstado !== 'todos') {
      res = res.filter((l) => l.estado_comercial === filtroEstado)
    }
    const t = q.trim().toLowerCase()
    if (t) {
      res = res.filter((l) =>
        `${l.codigo} ${l.comprador_principal ?? ''} ${l.comprador_documento ?? ''} ${l.codigo_venta ?? ''}`
          .toLowerCase()
          .includes(t)
      )
    }
    return res
  }, [lotes, filtroEstado, q])

  // Estadísticas
  const total = lotes.length
  const disponibles = lotes.filter((l) => l.estado_comercial === 'disponible').length
  const vendidos = lotes.filter((l) => l.estado_comercial === 'vendido').length
  const enNegoc = lotes.filter((l) => ['en_negociacion', 'separado'].includes(l.estado_comercial)).length

  return (
    <>
      <PageHeader title="Inventario de Lotes">
        <Link to="/negociaciones">
          <Button>Nueva Negociación</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <Stat label="Total Lotes" value={String(total)} />
        <Stat label="Disponibles" value={String(disponibles)} tone="good" />
        <Stat label="Vendidos" value={String(vendidos)} />
        <Stat label="En Negociación" value={String(enNegoc)} tone="warn" />
      </div>

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Proyecto">
            <Select value={idActivo} onChange={(e) => setProyectoId(e.target.value)}>
              {proyectosActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.codigo})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado Comercial">
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="disponible">Disponibles</option>
              <option value="vendido">Vendidos</option>
              <option value="separado">Separados</option>
              <option value="en_negociacion">En negociación</option>
            </Select>
          </Field>
          <Field label="Buscar Lote o Comprador">
            <Input
              id="lotes-buscar"
              placeholder="Ej: L-008 o nombre de comprador"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error && <Aviso>{(error as Error).message}</Aviso>}

      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Código</th>
              <th>Área m²</th>
              <th>Estado</th>
              <th>Comprador Actual</th>
              <th>Venta</th>
              <th className="text-right">Precio Acordado</th>
              <th className="text-right pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  Cargando inventario de lotes...
                </td>
              </tr>
            )}
            {!isLoading && filtrados.map((l: LoteInventario) => (
              <tr key={l.id} className="border-t hover:bg-brand-50/40">
                <td className="p-3 font-semibold text-brand-950">{l.codigo}</td>
                <td>{l.area_m2 ? `${l.area_m2} m²` : '—'}</td>
                <td>
                  <Badge estado={l.estado_comercial}>
                    {ESTADOS[l.estado_comercial] ?? l.estado_comercial}
                  </Badge>
                </td>
                <td className="font-medium text-gray-800">
                  {l.comprador_principal || <span className="text-gray-400 font-normal">Sin asignar</span>}
                </td>
                <td>
                  {l.codigo_venta ? (
                    <span className="font-medium text-brand-800">{l.codigo_venta}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="text-right">
                  {l.precio_acordado ? formatCOP(l.precio_acordado) : '—'}
                </td>
                <td className="pr-4 text-right space-x-1">
                  {l.negociacion_id ? (
                    <>
                      <Link to={`/lotes?negociacion=${l.negociacion_id}`}>
                        <Button size="sm" variant="outline">
                          Ficha
                        </Button>
                      </Link>
                      <Link to={`/abonos?negociacion=${l.negociacion_id}`}>
                        <Button size="sm" variant="outline">
                          Abonar
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link to="/negociaciones">
                      <Button size="sm" variant="ghost">
                        Vender
                      </Button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && !filtrados.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No se encontraron lotes con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  )
}
