import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, listarNegociaciones, obtenerSaldos } from '@/lib/api'
import { ESTADOS, formatCOP } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { Aviso, Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'

const nuevo = { tipo_documento: 'CC', numero_documento: '', nombres: '', telefono_principal: '', telefono_secundario: '', email: '', direccion: '', municipio: '', observaciones: '' }

export default function Clientes() {
  const { puede } = useAuth()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState(nuevo)
  const [editando, setEditando] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<string | null>(null)

  const { data = [], error } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.clientes(),
  })
  const { data: negs = [] } = useQuery({ queryKey: ['negociaciones'], queryFn: listarNegociaciones })
  const { data: saldos = {} } = useQuery({ queryKey: ['saldos', negs.length], queryFn: () => obtenerSaldos(negs.map((n) => n.id)), enabled: negs.length > 0 })

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? data.filter((c) => `${c.nombres} ${c.numero_documento} ${c.telefono_principal ?? ''} ${c.telefono_secundario ?? ''}`.toLowerCase().includes(t)) : data
  }, [q, data])

  const guardar = useMutation({
    mutationFn: async () => {
      const fila = { ...f, nombres: f.nombres.trim().toUpperCase(), numero_documento: f.numero_documento.trim() }
      if (editando) {
        await api.actualizarCliente(editando, fila)
      } else {
        await api.crearCliente(fila)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); setAbierto(false); setF(nuevo); setEditando(null) },
  })
  const set = (k: keyof typeof nuevo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <>
      <PageHeader title="Clientes">{puede('administrador', 'cartera') && <Button id="cliente-nuevo" onClick={() => { setF(nuevo); setEditando(null); setAbierto(!abierto) }}>Nuevo cliente</Button>}</PageHeader>
      {error && <Aviso>{(error as Error).message}</Aviso>}
      {abierto && (
        <Card className="mb-6">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
            <Field label="Tipo de documento"><Select value={f.tipo_documento} onChange={set('tipo_documento')}>{['CC', 'CE', 'NIT', 'PAS', 'TI', 'OTRO'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Número de documento"><Input required value={f.numero_documento} onChange={set('numero_documento')} /></Field>
            <Field label="Nombres y apellidos"><Input required value={f.nombres} onChange={set('nombres')} /></Field>
            <Field label="Teléfono principal"><Input value={f.telefono_principal} onChange={set('telefono_principal')} /></Field>
            <Field label="Teléfono secundario"><Input value={f.telefono_secundario} onChange={set('telefono_secundario')} /></Field>
            <Field label="Correo"><Input type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Dirección"><Input value={f.direccion} onChange={set('direccion')} /></Field>
            <Field label="Municipio"><Input value={f.municipio} onChange={set('municipio')} /></Field>
            <Field label="Observaciones"><Textarea value={f.observaciones} onChange={set('observaciones')} /></Field>
            {guardar.error && <div className="sm:col-span-3"><Aviso>{(guardar.error as Error).message}</Aviso></div>}
            <div><Button disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</Button></div>
          </form>
        </Card>
      )}
      <Input id="clientes-buscar" className="mb-4 max-w-md" placeholder="Buscar por nombre, documento o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Nombre</th><th>Documento</th><th>Teléfono</th><th>Municipio</th><th /></tr></thead>
          <tbody>{filtrados.map((c) => {
            return (
              <tr key={c.id} className="border-t hover:bg-brand-50/40">
                <td className="p-3 font-medium cursor-pointer" onClick={() => setDetalle(detalle === c.id ? null : c.id)}>{c.nombres}</td>
                <td className="cursor-pointer" onClick={() => setDetalle(detalle === c.id ? null : c.id)}>{c.tipo_documento} {c.numero_documento}</td>
                <td>{c.telefono_principal}</td>
                <td>{c.municipio}</td>
                <td className="pr-3 text-right">
                  {puede('administrador', 'cartera') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditando(c.id)
                        setF({
                          tipo_documento: c.tipo_documento,
                          numero_documento: c.numero_documento,
                          nombres: c.nombres,
                          telefono_principal: c.telefono_principal ?? '',
                          telefono_secundario: c.telefono_secundario ?? '',
                          email: c.email ?? '',
                          direccion: c.direccion ?? '',
                          municipio: c.municipio ?? '',
                          observaciones: c.observaciones ?? '',
                        })
                        setAbierto(true)
                      }}
                    >
                      Editar
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      </Card>
      {detalle && (
        <Card className="mt-4">
          <h3 className="font-semibold text-brand-950 mb-2">Negociaciones del cliente seleccionado</h3>
          {(() => {
            const mias = negs.filter((n) => n.negociacion_clientes.some((x) => x.clientes.id === detalle))
            if (!mias.length) return <p className="text-gray-400 text-sm">Sin negociaciones</p>
            return (
              <table className="w-full text-xs">
                <thead className="text-left text-gray-500">
                  <tr><th>Venta</th><th>Proyecto</th><th>Lote</th><th>Estado</th><th>Recaudado</th><th>Saldo</th></tr>
                </thead>
                <tbody>
                  {mias.map((n) => (
                    <tr key={n.id} className="border-t">
                      <td className="py-2"><Link className="text-brand-700 font-medium underline" to={`/lotes?negociacion=${n.id}`}>{n.codigo_venta}</Link></td>
                      <td>{n.lotes.proyectos.nombre}</td>
                      <td>{n.lotes.codigo}</td>
                      <td><Badge estado={n.estado}>{ESTADOS[n.estado]}</Badge></td>
                      <td>{formatCOP(saldos[n.id]?.total_recaudado)}</td>
                      <td>{formatCOP(saldos[n.id]?.saldo_pendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          })()}
        </Card>
      )}
    </>
  )
}
