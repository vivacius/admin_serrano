import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, MessageCircle, Pencil, Trash2, X } from 'lucide-react'
import { api, listarNegociaciones, obtenerSaldos, principal, type AbonoFila } from '@/lib/api'
import type { NegociacionFila } from '@/lib/types'
import { ESTADOS, MEDIOS, formatCOP, formatFecha } from '@/lib/utils'
import { compartirWhatsApp, descargarPDF, generarReciboPDF } from '@/lib/pdf'
import { useAuth } from '@/auth/AuthProvider'
import NegociacionPicker from '@/components/NegociacionPicker'
import { Aviso, Badge, Button, Card, Field, Input, PageHeader, Select, Stat, Textarea } from '@/components/ui'

const Seccion = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <Card><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-800">{t}</h2>{children}</Card>
)
const Dato = ({ k, v }: { k: string; v?: string | null }) => (
  <div><p className="text-xs text-gray-500">{k}</p><p className="text-sm font-medium">{v || '—'}</p></div>
)

export default function FichaLote() {
  const { puede } = useAuth()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [abonoParaAnular, setAbonoParaAnular] = useState<AbonoFila | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [editandoNegociacion, setEditandoNegociacion] = useState(false)
  const [modalEliminarNegociacion, setModalEliminarNegociacion] = useState(false)
  const [formEditNeg, setFormEditNeg] = useState<{ precio: string; cuota: string; vendedor: string; estado: string; observaciones: string }>({
    precio: '', cuota: '', vendedor: '', estado: '', observaciones: ''
  })
  const [cargandoAccion, setCargandoAccion] = useState(false)

  const negId = params.get('negociacion')

  const { data: todas = [] } = useQuery({ queryKey: ['negociaciones'], queryFn: listarNegociaciones })
  const neg: NegociacionFila | undefined = todas.find((n) => n.id === negId)
  const historial = neg ? todas.filter((n) => n.lotes.id === neg.lotes.id) : []

  const { data: saldos } = useQuery({
    queryKey: ['saldo', negId], enabled: !!negId,
    queryFn: async () => (await obtenerSaldos([negId!]))[negId!],
  })
  const { data: abonos = [] } = useQuery({
    queryKey: ['abonos', negId], enabled: !!negId,
    queryFn: () => api.abonos(negId!),
  })
  const { data: comision } = useQuery({
    queryKey: ['comision', negId], enabled: !!negId,
    queryFn: () => api.comision(negId!),
  })
  const { data: docs = [] } = useQuery({
    queryKey: ['docs', negId], enabled: !!negId,
    queryFn: () => api.documentos(negId!),
  })

  const c = neg ? principal(neg) : undefined

  // Preparar formulario de edición al abrirlo
  function abrirEdicion() {
    if (!neg) return
    setFormEditNeg({
      precio: String(neg.precio_acordado),
      cuota: neg.cuota_inicial_pactada != null ? String(neg.cuota_inicial_pactada) : '',
      vendedor: neg.vendedor || '',
      estado: neg.estado,
      observaciones: neg.observaciones || '',
    })
    setEditandoNegociacion(true)
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!neg) return
    setCargandoAccion(true)
    setError('')
    try {
      await api.actualizarNegociacion(neg.id, {
        precio_acordado: Number(formEditNeg.precio),
        cuota_inicial_pactada: formEditNeg.cuota === '' ? null : Number(formEditNeg.cuota),
        vendedor: formEditNeg.vendedor || null,
        estado: formEditNeg.estado,
        observaciones: formEditNeg.observaciones || null,
      })
      setExito('Negociación actualizada correctamente.')
      setEditandoNegociacion(false)
      qc.invalidateQueries()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar negociación')
    } finally {
      setCargandoAccion(false)
    }
  }

  async function ejecutarEliminarNegociacion() {
    if (!neg) return
    setCargandoAccion(true)
    setError('')
    try {
      await api.eliminarNegociacion(neg.id, true)
      qc.invalidateQueries()
      setModalEliminarNegociacion(false)
      nav('/inventario-lotes')
    } catch (err: any) {
      setError(err.message || 'Error al eliminar negociación')
      setCargandoAccion(false)
    }
  }

  // Generador de PDF en memoria para abonos pasados
  async function obtenerDocRecibo(a: AbonoFila, index: number) {
    if (!neg) throw new Error('No hay negociación activa')
    let totalAnterior = 0
    for (let i = 0; i < index; i++) {
      if (abonos[i].estado === 'vigente') totalAnterior += abonos[i].valor
    }
    const totalAcumulado = totalAnterior + a.valor
    const saldoNuevo = neg.precio_acordado - totalAcumulado
    const num = a.recibos?.numero ?? (index + 1)

    return await generarReciboPDF({
      numero: num,
      fecha: a.fecha_pago || neg.fecha_negociacion,
      comprador: c?.nombres ?? 'COMPRADOR',
      documento: `${c?.tipo_documento ?? 'CC'} ${c?.numero_documento ?? ''}`,
      telefono: c?.telefono_principal ?? null,
      proyecto: neg.lotes.proyectos.nombre,
      lote: neg.lotes.codigo,
      codigoVenta: neg.codigo_venta,
      valorNegocio: neg.precio_acordado,
      totalAnterior,
      valorAbono: a.valor,
      totalAcumulado,
      saldoNuevo,
      fechaPago: a.fecha_pago || neg.fecha_negociacion,
      medio: (a.medio as any) || 'efectivo',
      banco: null,
      referencia: a.referencia ?? null,
      observaciones: a.pendiente_completar ? 'Pendiente de completar fecha u origen' : null,
    })
  }

  async function verRecibo(a: AbonoFila, index: number) {
    setError('')
    try {
      if (a.recibos?.pdf_path) {
        await api.abrirArchivo('recibos', a.recibos.pdf_path)
        return
      }
      const doc = await obtenerDocRecibo(a, index)
      const blob = new Blob([doc.output('blob')], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err: any) {
      setError(err.message || 'No se pudo generar el recibo')
    }
  }

  async function descargarRecibo(a: AbonoFila, index: number) {
    setError('')
    try {
      const num = a.recibos?.numero ? String(a.recibos.numero).padStart(6, '0') : `00000${index + 1}`
      const filename = `Recibo-${num}-${neg?.codigo_venta || 'Lote'}.pdf`
      if (a.recibos?.pdf_path) {
        await api.descargarArchivo('recibos', a.recibos.pdf_path, filename)
        return
      }
      const doc = await obtenerDocRecibo(a, index)
      descargarPDF(doc, filename)
    } catch (err: any) {
      setError(err.message || 'No se pudo descargar el recibo')
    }
  }

  async function enviarReciboWhatsApp(a: AbonoFila, index: number) {
    setError('')
    try {
      const doc = await obtenerDocRecibo(a, index)
      const num = a.recibos?.numero ? String(a.recibos.numero).padStart(6, '0') : `00000${index + 1}`
      const nombreArchivo = `Recibo-${num}-${neg?.codigo_venta}.pdf`
      const texto = `Estimado(a) ${c?.nombres || 'Cliente'}, le enviamos el recibo N.° ${num} por valor de ${formatCOP(a.valor)} de su abono para el Lote ${neg?.lotes.codigo} del proyecto ${neg?.lotes.proyectos.nombre}. SERRANO Gestión Inmobiliaria.`
      await compartirWhatsApp(doc, nombreArchivo, texto)
    } catch (err: any) {
      setError(err.message || 'No se pudo compartir por WhatsApp')
    }
  }

  async function confirmarAnulacion(e: React.FormEvent) {
    e.preventDefault()
    if (!abonoParaAnular || !motivoAnulacion.trim()) return
    setError('')
    setCargandoAccion(true)
    try {
      await api.anularAbono(abonoParaAnular.id, motivoAnulacion.trim())
      setExito('Abono anulado con éxito. El saldo fue recalculado automáticamente.')
      setAbonoParaAnular(null)
      setMotivoAnulacion('')
      qc.invalidateQueries()
    } catch (err: any) {
      setError(err.message || 'Error al anular el abono')
    } finally {
      setCargandoAccion(false)
    }
  }

  return (
    <>
      <PageHeader title="Ficha única del lote" />
      <Card className="mb-6 relative z-30 overflow-visible">
        <Field label="Buscar lote por proyecto, código de lote, comprador o venta">
          <NegociacionPicker onSelect={(n) => setParams({ negociacion: n.id })} />
        </Field>
      </Card>

      {error && <div className="mb-4"><Aviso>{error}</Aviso></div>}
      {exito && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800 border border-green-200">{exito}</div>}

      {!neg && <Card className="py-16 text-center text-gray-400">Selecciona un lote para ver su ficha completa.</Card>}

      {neg && (
        <div className="space-y-6">
          {/* Encabezado Principal del Lote */}
          <Card className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 !text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-200 uppercase tracking-wider">{neg.lotes.proyectos.nombre}</p>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold tracking-tight">Lote {neg.lotes.codigo}</h1>
                  {neg.lotes.area_m2 && (
                    <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-brand-100 backdrop-blur-sm">
                      {neg.lotes.area_m2} m²
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-brand-100">
                  {c?.nombres ?? 'Sin comprador principal'} · Negociación: <span className="font-semibold">{neg.codigo_venta}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge estado={neg.estado}>{ESTADOS[neg.estado]}</Badge>
                {puede('administrador') && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={abrirEdicion}
                      className="inline-flex items-center gap-1 rounded bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 transition"
                    >
                      <Pencil size={13} /> Modificar negociación
                    </button>
                    <button
                      onClick={() => setModalEliminarNegociacion(true)}
                      disabled={cargandoAccion}
                      className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-200 hover:bg-red-500/30 transition"
                      title="Eliminar negociación de prueba o venta cancelada"
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5 border-t border-brand-800/80 pt-4">
              {puede('administrador', 'cartera') && (
                <Link to={`/abonos?negociacion=${neg.id}`}>
                  <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                    Registrar abono
                  </Button>
                </Link>
              )}
              <Link to={`/estado-cuenta?negociacion=${neg.id}`}>
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  Generar estado de cuenta
                </Button>
              </Link>
            </div>
          </Card>

          {/* Información Comercial */}
          <Seccion t="Información comercial y del comprador">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Dato k="Fecha de negociación" v={formatFecha(neg.fecha_negociacion)} />
              <Dato k="Precio acordado" v={formatCOP(neg.precio_acordado)} />
              <Dato k="Cuota inicial pactada" v={neg.cuota_inicial_pactada != null ? formatCOP(neg.cuota_inicial_pactada) : null} />
              <Dato k="Vendedor / Asesor" v={neg.vendedor} />
              <Dato k="Comprador principal" v={c?.nombres} />
              <Dato k="Documento" v={c ? `${c.tipo_documento} ${c.numero_documento}` : null} />
              <Dato k="Teléfono de contacto" v={c?.telefono_principal} />
              <Dato k="Correo electrónico" v={c?.email} />
              <Dato k="Observaciones" v={neg.observaciones} />
              <Dato k="Comisionista asignado" v={comision?.comisionista} />
            </div>
          </Seccion>

          {/* Tarjetas de Saldo y Cartera */}
          {saldos && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              <Stat label="Valor negocio" value={formatCOP(neg.precio_acordado)} />
              <Stat label="Recaudado" value={formatCOP(saldos.total_recaudado)} tone="good" />
              <Stat label="Saldo pendiente" value={formatCOP(saldos.saldo_pendiente)} tone="warn" />
              <Stat label="% Pagado" value={`${Number(saldos.porcentaje_pagado).toFixed(1)} %`} />
              <Stat label="Último abono" value={saldos.fecha_ultimo_abono ? formatFecha(saldos.fecha_ultimo_abono) : '—'} />
              <Stat label="Días desde último" value={saldos.dias_desde_ultimo_abono != null ? String(saldos.dias_desde_ultimo_abono) : '—'} />
            </div>
          )}

          {/* Historial de Abonos con Acciones Completas de Recibo */}
          <Seccion t="Historial de abonos y recibos">
            <p className="text-xs text-gray-500 mb-3">
              Todos los abonos confirmados cuentan con recibo inmutable con numeración consecutiva. Puedes consultar, descargar o compartir por WhatsApp cualquier recibo.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">N.º Recibo</th>
                    <th className="px-3 py-2.5">Medio de pago</th>
                    <th className="px-3 py-2.5">Referencia</th>
                    <th className="px-3 py-2.5 text-right">Valor abonado</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right pr-4">Acciones del recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {abonos.map((a, idx) => {
                    const r = a.recibos
                    const esAnulado = a.estado === 'anulado'
                    const numTexto = r ? `#${String(r.numero).padStart(6, '0')}` : `#${String(idx + 1).padStart(6, '0')}`

                    return (
                      <tr key={a.id} className={`hover:bg-brand-50/20 ${esAnulado ? 'bg-red-50/30 text-gray-400' : ''}`}>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatFecha(a.fecha_pago)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`font-semibold ${esAnulado ? 'text-gray-400 line-through' : 'text-brand-800'}`}>
                            {numTexto}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{a.medio ? (MEDIOS[a.medio] ?? a.medio) : '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">{a.referencia ?? '—'}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${esAnulado ? 'line-through text-gray-400' : 'text-brand-900'}`}>
                          {formatCOP(a.valor)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {esAnulado ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Anulado: {a.motivo_anulacion}
                            </span>
                          ) : a.pendiente_completar ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Pendiente completar
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Vigente
                            </span>
                          )}
                        </td>
                        <td className="text-right pr-2 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {!esAnulado && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => verRecibo(a, idx)}
                                  className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition"
                                  title="Ver recibo oficial en PDF"
                                >
                                  <FileText size={13} /> Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => descargarRecibo(a, idx)}
                                  className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition"
                                  title="Descargar PDF"
                                >
                                  <Download size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => enviarReciboWhatsApp(a, idx)}
                                  className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition"
                                  title="Enviar recibo por WhatsApp"
                                >
                                  <MessageCircle size={13} /> WhatsApp
                                </button>
                              </>
                            )}
                            {!esAnulado && puede('administrador') && (
                              <button
                                type="button"
                                onClick={() => { setAbonoParaAnular(a); setMotivoAnulacion('') }}
                                className="ml-2 inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                                title="Anular este abono y recalcular saldos"
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!abonos.length && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Sin abonos registrados en este lote.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Seccion>

          {/* Modal de Anulación de Abono */}
          {abonoParaAnular && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h3 className="font-semibold text-red-700">Anulación de Abono</h3>
                  <button onClick={() => setAbonoParaAnular(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <form onSubmit={confirmarAnulacion} className="mt-4 space-y-4">
                  <p className="text-sm text-gray-600">
                    Se anulará el abono por valor de <strong className="text-gray-900">{formatCOP(abonoParaAnular.valor)}</strong> del día {formatFecha(abonoParaAnular.fecha_pago)}.
                    Esta acción recalcula inmediatamente el saldo pendiente de la negociación.
                  </p>
                  <Field label="Motivo de anulación (obligatorio)" hint="Quedará registrado en la pista de auditoría">
                    <Textarea
                      required
                      placeholder="Ej: Registro erróneo / Cheque devuelto / Venta de prueba..."
                      value={motivoAnulacion}
                      onChange={(e) => setMotivoAnulacion(e.target.value)}
                    />
                  </Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setAbonoParaAnular(null)}>Cancelar</Button>
                    <Button type="submit" disabled={cargandoAccion || !motivoAnulacion.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                      {cargandoAccion ? 'Anulando…' : 'Confirmar anulación'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* Modal de Modificación de Negociación */}
          {editandoNegociacion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="max-w-xl w-full shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <h3 className="font-semibold text-gray-900">Modificar Negociación {neg.codigo_venta}</h3>
                    <p className="text-xs text-gray-500">Lote {neg.lotes.codigo} · {neg.lotes.proyectos.nombre}</p>
                  </div>
                  <button onClick={() => setEditandoNegociacion(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <form onSubmit={guardarEdicion} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Precio acordado (COP)">
                    <Input
                      type="number"
                      required
                      min="1"
                      value={formEditNeg.precio}
                      onChange={(e) => setFormEditNeg({ ...formEditNeg, precio: e.target.value })}
                    />
                  </Field>
                  <Field label="Cuota inicial pactada">
                    <Input
                      type="number"
                      min="0"
                      value={formEditNeg.cuota}
                      onChange={(e) => setFormEditNeg({ ...formEditNeg, cuota: e.target.value })}
                    />
                  </Field>
                  <Field label="Vendedor / Asesor">
                    <Input
                      value={formEditNeg.vendedor}
                      onChange={(e) => setFormEditNeg({ ...formEditNeg, vendedor: e.target.value })}
                    />
                  </Field>
                  <Field label="Estado">
                    <Select
                      value={formEditNeg.estado}
                      onChange={(e) => setFormEditNeg({ ...formEditNeg, estado: e.target.value })}
                    >
                      {Object.entries(ESTADOS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Observaciones">
                      <Textarea
                        value={formEditNeg.observaciones}
                        onChange={(e) => setFormEditNeg({ ...formEditNeg, observaciones: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="outline" onClick={() => setEditandoNegociacion(false)}>Cancelar</Button>
                    <Button type="submit" disabled={cargandoAccion}>
                      {cargandoAccion ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* Modal de Confirmación de Eliminación de Negociación */}
          {modalEliminarNegociacion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="max-w-md w-full shadow-2xl border-red-200">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h3 className="font-semibold text-red-700 flex items-center gap-1.5">
                    <Trash2 size={18} /> Eliminar Negociación {neg.codigo_venta}
                  </h3>
                  <button onClick={() => setModalEliminarNegociacion(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    ¿Estás seguro de que deseas eliminar definitivamente la negociación <strong className="text-gray-900">{neg.codigo_venta}</strong> del <strong>Lote {neg.lotes.codigo}</strong>?
                  </p>
                  <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 space-y-1">
                    <p className="font-semibold">Consecuencias:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>El lote quedará nuevamente <strong>Disponible</strong> en el inventario.</li>
                      <li>Si tiene abonos o comisiones asociadas, se limpiarán del registro local.</li>
                      <li>Esta acción no se puede deshacer.</li>
                    </ul>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button type="button" variant="outline" onClick={() => setModalEliminarNegociacion(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={cargandoAccion}
                      onClick={ejecutarEliminarNegociacion}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {cargandoAccion ? 'Eliminando…' : 'Sí, eliminar negociación'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Documentos */}
          <Seccion t="Documentos">
            {docs.length ? (
              <ul className="space-y-1 text-sm">
                {docs.map((d) => (
                  <li key={d.id}>
                    <button className="text-brand-700 underline font-medium" onClick={() => api.abrirArchivo('documentos', d.storage_path)}>
                      {d.nombre}
                    </button>
                    <span className="text-gray-400"> · {d.categoria} · v{d.version}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Sin documentos adjuntos.</p>
            )}
          </Seccion>

          {/* Comisiones */}
          <Seccion t="Comisiones">
            {comision ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <Dato k="Comisionista" v={comision.comisionista} />
                <Dato k="Porcentaje" v={comision.porcentaje != null ? `${comision.porcentaje} %` : null} />
                <Dato k="Valor de comisión" v={formatCOP(comision.valor_comision)} />
                <Dato k="Pagada" v={formatCOP(comision.pagado)} />
                <Dato k="Saldo de comisión" v={formatCOP(Number(comision.valor_comision) - comision.pagado)} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin comisión registrada.</p>
            )}
          </Seccion>

          {/* Historial de Negociaciones del Lote */}
          <Seccion t="Historial de negociaciones del lote">
            <ul className="space-y-1 text-sm">
              {historial.map((n) => (
                <li key={n.id} className="flex items-center gap-3">
                  <Link
                    className={`font-medium ${n.id === neg.id ? 'text-brand-700' : 'text-gray-700 hover:underline'}`}
                    to={`/lotes?negociacion=${n.id}`}
                  >
                    {n.codigo_venta}
                  </Link>
                  <span className="text-gray-500">
                    {principal(n)?.nombres} · {formatFecha(n.fecha_negociacion)}
                  </span>
                  <Badge estado={n.estado}>{ESTADOS[n.estado]}</Badge>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      )}
    </>
  )
}
