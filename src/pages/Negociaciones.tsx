import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Search, Trash2, UserCheck, UserPlus, X } from 'lucide-react'
import { api, listarNegociaciones, obtenerSaldos, principal, textoBusqueda } from '@/lib/api'
import type { Cliente, NegociacionFila } from '@/lib/types'
import { ESTADOS, formatCOP, formatFecha, hoyISO } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import { Aviso, Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'

const nuevo = {
  proyecto_id: '',
  codigo_lote: '',
  codigo_venta: '',
  fecha: hoyISO(),
  precio: '',
  cuota: '',
  vendedor: '',
  observaciones: '',
  estado: 'en_negociacion',
  cliente_id: '',
  tipo_doc: 'CC',
  documento: '',
  nombres: '',
  telefono: '',
  email: '',
}

export default function Negociaciones() {
  const { puede } = useAuth()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [abierto, setAbierto] = useState(false)
  const [f, setF] = useState(nuevo)
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente')
  const [busqCliente, setBusqCliente] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  // Estado para modal de edición rápida por admin
  const [negocioParaEditar, setNegocioParaEditar] = useState<NegociacionFila | null>(null)
  const [negocioParaEliminar, setNegocioParaEliminar] = useState<NegociacionFila | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [formEdit, setFormEdit] = useState({ precio: '', cuota: '', vendedor: '', estado: '', observaciones: '' })
  const [mensajeExito, setMensajeExito] = useState('')
  const [errorGlobal, setErrorGlobal] = useState('')

  const { data: negs = [], error } = useQuery({ queryKey: ['negociaciones'], queryFn: listarNegociaciones })
  const { data: saldos = {} } = useQuery({ queryKey: ['saldos', negs.length], queryFn: () => obtenerSaldos(negs.map((n) => n.id)), enabled: negs.length > 0 })
  const { data: proyectos = [] } = useQuery({
    queryKey: ['proyectos'],
    queryFn: () => api.proyectos(),
  })
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.clientes(),
  })
  const { data: lotesProyecto = [] } = useQuery({
    queryKey: ['lotes', f.proyecto_id],
    enabled: !!f.proyecto_id,
    queryFn: () => api.lotes(f.proyecto_id),
  })

  // Lotes disponibles en el proyecto seleccionado
  const lotesDisponibles = useMemo(() => {
    return lotesProyecto.filter((l) => l.estado_comercial === 'disponible')
  }, [lotesProyecto])

  // Filtrado de clientes para autocompletar
  const clientesFiltrados = useMemo(() => {
    const t = busqCliente.trim().toLowerCase()
    if (!t) return clientes.slice(0, 10)
    return clientes.filter((c) =>
      c.nombres.toLowerCase().includes(t) ||
      c.numero_documento.toLowerCase().includes(t) ||
      (c.telefono_principal && c.telefono_principal.includes(t))
    ).slice(0, 10)
  }, [busqCliente, clientes])

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? negs.filter((n) => textoBusqueda(n).includes(t)) : negs
  }, [q, negs])

  function seleccionarCliente(c: Cliente) {
    setClienteSeleccionado(c)
    setF((prev) => ({
      ...prev,
      cliente_id: c.id,
      tipo_doc: c.tipo_documento,
      documento: c.numero_documento,
      nombres: c.nombres,
      telefono: c.telefono_principal || '',
      email: c.email || '',
    }))
  }

  function alSeleccionarLote(codigo: string) {
    // Autocorrelacionar código de venta sugerido
    const sugerido = codigo ? `V${codigo.replace(/\D/g, '').padStart(3, '0')}` : ''
    setF((prev) => ({
      ...prev,
      codigo_lote: codigo,
      codigo_venta: prev.codigo_venta || sugerido,
    }))
  }

  const crear = useMutation({
    mutationFn: async () => {
      setErrorGlobal('')
      await api.crearNegociacion({
        proyecto_id: f.proyecto_id,
        codigo_lote: f.codigo_lote,
        codigo_venta: f.codigo_venta,
        fecha: f.fecha,
        precio: Number(f.precio),
        cuota: f.cuota === '' ? null : Number(f.cuota),
        vendedor: f.vendedor || null,
        observaciones: f.observaciones || null,
        estado: f.estado,
        cliente_id: modoCliente === 'existente' && clienteSeleccionado ? clienteSeleccionado.id : undefined,
        tipo_doc: f.tipo_doc,
        documento: f.documento,
        nombres: f.nombres,
        telefono: f.telefono || null,
        email: f.email || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries()
      setAbierto(false)
      setF(nuevo)
      setClienteSeleccionado(null)
      setMensajeExito('Negociación creada exitosamente.')
    },
    onError: (err: any) => {
      setErrorGlobal(err.message || 'Error al crear la negociación.')
    }
  })

  const setField = (k: keyof typeof nuevo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value
    if (k === 'codigo_lote') {
      alSeleccionarLote(v)
    } else {
      setF({ ...f, [k]: v })
    }
  }

  function abrirEdicion(n: NegociacionFila) {
    setNegocioParaEditar(n)
    setFormEdit({
      precio: String(n.precio_acordado),
      cuota: n.cuota_inicial_pactada != null ? String(n.cuota_inicial_pactada) : '',
      vendedor: n.vendedor || '',
      estado: n.estado,
      observaciones: n.observaciones || '',
    })
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!negocioParaEditar) return
    setErrorGlobal('')
    try {
      await api.actualizarNegociacion(negocioParaEditar.id, {
        precio_acordado: Number(formEdit.precio),
        cuota_inicial_pactada: formEdit.cuota === '' ? null : Number(formEdit.cuota),
        vendedor: formEdit.vendedor || null,
        estado: formEdit.estado,
        observaciones: formEdit.observaciones || null,
      })
      setMensajeExito(`Negociación ${negocioParaEditar.codigo_venta} actualizada.`)
      setNegocioParaEditar(null)
      qc.invalidateQueries()
    } catch (err: any) {
      setErrorGlobal(err.message || 'Error al actualizar negociación.')
    }
  }

  async function ejecutarEliminacion() {
    if (!negocioParaEliminar) return
    setErrorGlobal('')
    setEliminando(true)
    try {
      await api.eliminarNegociacion(negocioParaEliminar.id, true)
      setMensajeExito(`Negociación ${negocioParaEliminar.codigo_venta} eliminada y lote liberado.`)
      setNegocioParaEliminar(null)
      qc.invalidateQueries()
    } catch (err: any) {
      setErrorGlobal(err.message || 'Error al eliminar negociación.')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <>
      <PageHeader title="Negociaciones">
        {puede('administrador', 'cartera') && (
          <Button id="negociacion-nueva" onClick={() => setAbierto(!abierto)} className="flex items-center gap-1.5">
            <Plus size={16} /> Nueva negociación
          </Button>
        )}
      </PageHeader>

      {error && <Aviso>{(error as Error).message}</Aviso>}
      {errorGlobal && <div className="mb-4"><Aviso>{errorGlobal}</Aviso></div>}
      {mensajeExito && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800 border border-green-200">{mensajeExito}</div>}

      {abierto && (
        <Card className="mb-6 shadow-md border-brand-100">
          <div className="flex items-center justify-between pb-3 border-b mb-4">
            <div>
              <h2 className="text-base font-bold text-brand-900">Registrar Nueva Negociación</h2>
              <p className="text-xs text-gray-500">Asigna un comprador existente o nuevo a un lote del proyecto.</p>
            </div>
            <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
            {/* Paso 1: Selección de Cliente */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-800">1. Comprador de la negociación</span>
                <div className="flex rounded-lg bg-gray-200 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => { setModoCliente('existente'); setClienteSeleccionado(null) }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${modoCliente === 'existente' ? 'bg-white text-brand-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <UserCheck size={14} /> Cliente existente
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModoCliente('nuevo'); setClienteSeleccionado(null); setF({ ...f, cliente_id: '', documento: '', nombres: '', telefono: '', email: '' }) }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${modoCliente === 'nuevo' ? 'bg-white text-brand-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <UserPlus size={14} /> Nuevo cliente
                  </button>
                </div>
              </div>

              {modoCliente === 'existente' ? (
                <div>
                  {!clienteSeleccionado ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <Input
                          placeholder="Buscar cliente registrado por nombre o número de cédula/NIT..."
                          className="pl-9 bg-white"
                          value={busqCliente}
                          onChange={(e) => setBusqCliente(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y">
                        {clientesFiltrados.map((cli) => (
                          <div
                            key={cli.id}
                            onClick={() => seleccionarCliente(cli)}
                            className="p-2.5 hover:bg-brand-50 cursor-pointer flex items-center justify-between transition text-sm"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{cli.nombres}</p>
                              <p className="text-xs text-gray-500">{cli.tipo_documento} {cli.numero_documento} {cli.telefono_principal ? `· Tel: ${cli.telefono_principal}` : ''}</p>
                            </div>
                            <Button size="sm" variant="outline" type="button" className="text-xs">Seleccionar</Button>
                          </div>
                        ))}
                        {!clientesFiltrados.length && (
                          <div className="p-4 text-center text-xs text-gray-400">
                            No se encontraron clientes. Cambia a "Nuevo cliente" para registrarlo.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white rounded-lg border border-green-200 p-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-100 p-2 text-green-700"><Check size={18} /></div>
                        <div>
                          <p className="font-bold text-gray-900">{clienteSeleccionado.nombres}</p>
                          <p className="text-xs text-gray-500">
                            {clienteSeleccionado.tipo_documento} {clienteSeleccionado.numero_documento}
                            {clienteSeleccionado.telefono_principal ? ` · Tel: ${clienteSeleccionado.telefono_principal}` : ''}
                            {clienteSeleccionado.email ? ` · ${clienteSeleccionado.email}` : ''}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setClienteSeleccionado(null)}>
                        Cambiar cliente
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-white p-3 rounded-lg border">
                  <Field label="Tipo documento">
                    <Select value={f.tipo_doc} onChange={setField('tipo_doc')}>
                      {['CC', 'CE', 'NIT', 'PAS', 'TI', 'OTRO'].map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </Field>
                  <Field label="N.º documento">
                    <Input required value={f.documento} onChange={setField('documento')} placeholder="Ej: 1098765432" />
                  </Field>
                  <Field label="Nombre completo">
                    <Input required value={f.nombres} onChange={setField('nombres')} placeholder="Nombres y apellidos" />
                  </Field>
                  <Field label="Teléfono principal">
                    <Input value={f.telefono} onChange={setField('telefono')} placeholder="Ej: 3001234567" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Correo electrónico">
                      <Input type="email" value={f.email} onChange={setField('email')} placeholder="cliente@correo.com" />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* Paso 2: Proyecto, Lote y Condiciones Comerciales */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Proyecto">
                <Select required value={f.proyecto_id} onChange={setField('proyecto_id')}>
                  <option value="">Seleccione proyecto…</option>
                  {proyectos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select>
              </Field>

              <Field label="Código del lote" hint={lotesDisponibles.length ? `${lotesDisponibles.length} lotes disponibles` : ''}>
                {lotesDisponibles.length > 0 ? (
                  <Select value={f.codigo_lote} onChange={(e) => alSeleccionarLote(e.target.value)}>
                    <option value="">Elegir lote disponible…</option>
                    {lotesDisponibles.map((l) => (
                      <option key={l.id} value={l.codigo}>
                        Lote {l.codigo} {l.area_m2 ? `(${l.area_m2} m²)` : ''}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input required value={f.codigo_lote} onChange={setField('codigo_lote')} placeholder="Ej: 008 o L-008" />
                )}
              </Field>

              <Field label="Código de venta" hint="Sugerido automáticamente con el lote">
                <Input required value={f.codigo_venta} onChange={setField('codigo_venta')} placeholder="Ej: V008" />
              </Field>

              <Field label="Fecha de negociación">
                <Input type="date" required value={f.fecha} onChange={setField('fecha')} />
              </Field>

              <Field label="Precio acordado (COP)">
                <Input type="number" min="1" required value={f.precio} onChange={setField('precio')} placeholder="Ej: 90000000" />
              </Field>

              <Field label="Cuota inicial pactada" hint="Dato de compromiso; no es recaudo">
                <Input type="number" min="0" value={f.cuota} onChange={setField('cuota')} placeholder="Ej: 45000000" />
              </Field>

              <Field label="Vendedor / asesor">
                <Input value={f.vendedor} onChange={setField('vendedor')} placeholder="Nombre del vendedor" />
              </Field>

              <Field label="Estado inicial">
                <Select value={f.estado} onChange={setField('estado')}>
                  {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>

              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Observaciones">
                  <Textarea value={f.observaciones} onChange={setField('observaciones')} placeholder="Notas sobre la forma de pago acordada, promesas o acuerdos..." />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending ? 'Guardando…' : 'Crear negociación'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Modal para Editar Negociación por Administrador */}
      {negocioParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Editar Negociación {negocioParaEditar.codigo_venta}</h3>
                <p className="text-xs text-gray-500">Lote {negocioParaEditar.lotes.codigo} · {negocioParaEditar.lotes.proyectos.nombre}</p>
              </div>
              <button onClick={() => setNegocioParaEditar(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardarEdicion} className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Precio acordado (COP)">
                <Input
                  type="number"
                  required
                  min="1"
                  value={formEdit.precio}
                  onChange={(e) => setFormEdit({ ...formEdit, precio: e.target.value })}
                />
              </Field>
              <Field label="Cuota inicial pactada">
                <Input
                  type="number"
                  min="0"
                  value={formEdit.cuota}
                  onChange={(e) => setFormEdit({ ...formEdit, cuota: e.target.value })}
                />
              </Field>
              <Field label="Vendedor / Asesor">
                <Input
                  value={formEdit.vendedor}
                  onChange={(e) => setFormEdit({ ...formEdit, vendedor: e.target.value })}
                />
              </Field>
              <Field label="Estado">
                <Select
                  value={formEdit.estado}
                  onChange={(e) => setFormEdit({ ...formEdit, estado: e.target.value })}
                >
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Observaciones">
                  <Textarea
                    value={formEdit.observaciones}
                    onChange={(e) => setFormEdit({ ...formEdit, observaciones: e.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setNegocioParaEditar(null)}>Cancelar</Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Input
        id="negociaciones-buscar"
        className="mb-4 max-w-md"
        placeholder="Buscar comprador, documento, lote, venta o proyecto..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2.5">Venta</th>
              <th className="px-3 py-2.5">Comprador</th>
              <th className="px-3 py-2.5">Proyecto / Lote</th>
              <th className="px-3 py-2.5">Fecha</th>
              <th className="px-3 py-2.5 text-right">Precio</th>
              <th className="px-3 py-2.5 text-right">Saldo</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5 text-right pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtradas.map((n) => (
              <tr key={n.id} className="hover:bg-brand-50/40">
                <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  <Link className="text-brand-700 hover:underline" to={`/lotes?negociacion=${n.id}`}>
                    {n.codigo_venta}
                  </Link>
                </td>
                <td className="px-3 py-2.5 font-medium text-gray-900">{principal(n)?.nombres ?? '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-gray-600">{n.lotes.proyectos.nombre}</span> · <span className="font-medium text-gray-900">Lote {n.lotes.codigo}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatFecha(n.fecha_negociacion)}</td>
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{formatCOP(n.precio_acordado)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-brand-900 whitespace-nowrap">
                  {formatCOP(saldos[n.id]?.saldo_pendiente ?? n.precio_acordado)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap"><Badge estado={n.estado}>{ESTADOS[n.estado]}</Badge></td>
                <td className="pr-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link to={`/abonos?negociacion=${n.id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2">Abonar</Button>
                    </Link>
                    <Link to={`/lotes?negociacion=${n.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-brand-700" title="Ver ficha única del lote">
                        Ficha
                      </Button>
                    </Link>
                    {puede('administrador') && (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirEdicion(n)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                          title="Editar negociación"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNegocioParaEliminar(n)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-700"
                          title="Eliminar negociación (demo o cancelada)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtradas.length && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Sin negociaciones encontradas</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal de Confirmación de Eliminación de Negociación */}
      {negocioParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full shadow-2xl border-red-200">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-semibold text-red-700 flex items-center gap-1.5">
                <Trash2 size={18} /> Eliminar Negociación {negocioParaEliminar.codigo_venta}
              </h3>
              <button onClick={() => setNegocioParaEliminar(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-700">
                ¿Confirma que desea eliminar definitivamente la negociación <strong className="text-gray-900">{negocioParaEliminar.codigo_venta}</strong> del <strong>Lote {negocioParaEliminar.lotes.codigo}</strong> ({negocioParaEliminar.lotes.proyectos.nombre})?
              </p>
              <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 space-y-1">
                <p className="font-semibold">Resultado de la acción:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>El lote quedará nuevamente <strong>Disponible</strong> para comercializar.</li>
                  <li>Se retirará del listado comercial y de cartera.</li>
                  <li>Cualquier abono de prueba asociado será eliminado.</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setNegocioParaEliminar(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={eliminando}
                  onClick={ejecutarEliminacion}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {eliminando ? 'Eliminando…' : 'Sí, eliminar negociación'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
