import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Proyecto } from '@/lib/types'
import { formatFecha } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { Aviso, Badge, Button, Card, Field, Input, PageHeader, Textarea } from '@/components/ui'

const nuevo = { codigo: '', nombre: '', municipio: '', departamento: '', descripcion: '' }

export default function Proyectos() {
  const { puede } = useAuth()
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState(nuevo)
  const [editando, setEditando] = useState<string | null>(null)

  const { data = [], error } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => api.proyectos(),
  })

  const guardar = useMutation({
    mutationFn: async () => {
      const fila = { ...f, codigo: f.codigo.trim().toUpperCase() }
      if (editando) {
        await api.actualizarProyecto(editando, fila)
      } else {
        await api.crearProyecto(fila)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proyectos'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setAbierto(false)
      setF(nuevo)
      setEditando(null)
    },
  })

  const alternar = useMutation({
    mutationFn: async (p: Proyecto) => {
      await api.actualizarProyecto(p.id, { activo: !p.activo })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proyectos'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const edita = puede('administrador', 'cartera')
  const set = (k: keyof typeof nuevo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <>
      <PageHeader title="Proyectos">
        {edita && (
          <Button id="proyecto-nuevo" onClick={() => { setF(nuevo); setEditando(null); setAbierto(!abierto) }}>
            Nuevo proyecto
          </Button>
        )}
      </PageHeader>
      {error && <Aviso>{(error as Error).message}</Aviso>}
      {abierto && (
        <Card className="mb-6">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
            <Field label="Código"><Input required value={f.codigo} onChange={set('codigo')} /></Field>
            <Field label="Nombre"><Input required value={f.nombre} onChange={set('nombre')} /></Field>
            <Field label="Municipio"><Input value={f.municipio} onChange={set('municipio')} /></Field>
            <Field label="Departamento"><Input value={f.departamento} onChange={set('departamento')} /></Field>
            <div className="sm:col-span-2"><Field label="Descripción"><Textarea value={f.descripcion} onChange={set('descripcion')} /></Field></div>
            {guardar.error && <div className="sm:col-span-2"><Aviso>{(guardar.error as Error).message}</Aviso></div>}
            <div className="sm:col-span-2"><Button disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</Button></div>
          </form>
        </Card>
      )}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Código</th>
              <th>Nombre</th>
              <th>Municipio</th>
              <th>Creado</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t hover:bg-brand-50/40">
                <td className="p-3 font-medium">{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.municipio}</td>
                <td>{formatFecha(p.created_at)}</td>
                <td><Badge estado={p.activo ? 'vendido' : 'cancelado'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="space-x-2 pr-3 text-right">
                  {edita && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditando(p.id)
                          setF({
                            codigo: p.codigo,
                            nombre: p.nombre,
                            municipio: p.municipio ?? '',
                            departamento: p.departamento ?? '',
                            descripcion: p.descripcion ?? '',
                          })
                          setAbierto(true)
                        }}
                      >
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => alternar.mutate(p)}>
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin proyectos</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  )
}
