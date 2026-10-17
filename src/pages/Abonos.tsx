import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Download, FileText, MessageCircle, Printer } from 'lucide-react'
import { api, obtenerSaldos, principal, listarNegociaciones } from '@/lib/api'
import {
  abrirOImprimirPDF,
  compartirWhatsApp,
  descargarPDF,
  generarReciboPDF,
  nombreArchivoRecibo,
} from '@/lib/pdf'
import type { NegociacionFila, ReciboDatos, Saldos } from '@/lib/types'
import { MEDIOS, formatCOP, hoyISO } from '@/lib/utils'
import { useAuth } from '@/auth/AuthProvider'
import NegociacionPicker from '@/components/NegociacionPicker'
import ReciboPreview from '@/components/ReciboPreview'
import { Aviso, Badge, Button, Card, Field, Input, PageHeader, Select, Stat, Textarea } from '@/components/ui'
import { ESTADOS } from '@/lib/utils'
import type { jsPDF } from 'jspdf'

const vacio = { fecha: hoyISO(), valor: '', medio: 'transferencia', banco: '', referencia: '', observaciones: '' }

export default function Abonos() {
  const { puede } = useAuth()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [neg, setNeg] = useState<NegociacionFila | null>(null)
  const [saldos, setSaldos] = useState<Saldos | null>(null)
  const [f, setF] = useState(vacio)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [pideDuplicado, setPideDuplicado] = useState(false)
  const [pideExcedente, setPideExcedente] = useState(false)
  const [motivoExc, setMotivoExc] = useState('')
  const [emitido, setEmitido] = useState<{ datos: ReciboDatos; pdf: jsPDF } | null>(null)
  const clave = useRef(crypto.randomUUID())

  const puedeRegistrar = puede('administrador', 'cartera')

  useEffect(() => {
    const id = params.get('negociacion')
    if (!id) return
    listarNegociaciones().then((l) => { const n = l.find((x) => x.id === id); if (n) seleccionar(n) })
  }, [params])

  async function seleccionar(n: NegociacionFila) {
    setNeg(n); setEmitido(null); setError(''); setPideDuplicado(false); setPideExcedente(false)
    const s = await obtenerSaldos([n.id]); setSaldos(s[n.id] ?? null)
  }

  const valor = Number(f.valor) || 0
  const comprador = neg ? principal(neg) : undefined

  const preliminar: ReciboDatos | null = useMemo(() => {
    if (!neg || !saldos) return null
    return {
      numero: null, fecha: hoyISO(), comprador: comprador?.nombres ?? '', documento: comprador?.numero_documento ?? '',
      telefono: comprador?.telefono_principal ?? null, proyecto: neg.lotes.proyectos.nombre, lote: neg.lotes.codigo,
      codigoVenta: neg.codigo_venta, valorNegocio: Number(neg.precio_acordado),
      totalAnterior: Number(saldos.total_recaudado), valorAbono: valor,
      totalAcumulado: Number(saldos.total_recaudado) + valor, saldoNuevo: Number(saldos.saldo_pendiente) - valor,
      fechaPago: f.fecha, medio: f.medio, banco: f.banco || null, referencia: f.referencia.trim() || null,
      observaciones: f.observaciones || null,
    }
  }, [neg, saldos, f, valor, comprador])

  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }))

  async function confirmar() {
    if (!neg || !saldos || enviando) return
    setError(''); setEnviando(true)
    try {
      let path: string | null = null
      if (archivo) {
        path = `${neg.id}/${Date.now()}-${archivo.name}`
        await api.subirArchivo('comprobantes', path, archivo)
      }

      const res = await api.registrarAbono({
        negociacion_id: neg.id,
        fecha: f.fecha,
        valor: Math.round(valor),
        medio: f.medio,
        banco: f.banco || null,
        referencia: f.referencia || null,
        observaciones: f.observaciones || null,
        comprobante_path: path,
        idempotency_key: clave.current,
        autoriza_excedente: pideExcedente,
        motivo_excedente: motivoExc || null,
        confirma_duplicado: pideDuplicado,
      })

      const r = await api.recibo(res.recibo_id)
      const datos: ReciboDatos = {
        ...preliminar!,
        numero: r.numero,
        fecha: r.fecha_emision.slice(0, 10),
        totalAnterior: Number(r.total_anterior),
        valorAbono: Number(r.valor_abono),
        totalAcumulado: Number(r.total_acumulado),
        saldoNuevo: Number(r.saldo_nuevo),
      }
      const pdf = await generarReciboPDF(datos)
      const ruta = `${neg.id}/recibo-${String(r.numero).padStart(6, '0')}.pdf`
      await api.guardarPdfRecibo(r.id, ruta, pdf.output('blob')).catch(() => {})

      setEmitido({ datos, pdf })
      clave.current = crypto.randomUUID()
      setF(vacio); setArchivo(null); setPideDuplicado(false); setPideExcedente(false); setMotivoExc('')
      qc.invalidateQueries()
      const s = await obtenerSaldos([neg.id]); setSaldos(s[neg.id] ?? null)
    } catch (e) {
      const msg = (e as Error).message ?? 'Error desconocido'
      if (msg.includes('POSIBLE_DUPLICADO')) {
        setPideDuplicado(true)
        setError('Existe un abono idéntico en esta negociación. Si es un pago distinto, pulsa "Confirmar y registrar".')
      } else if (msg.includes('supera el saldo')) {
        setPideExcedente(puede('administrador'))
        setError(msg)
      } else {
        setError(msg)
      }
    } finally {
      setEnviando(false)
    }
  }

  const invalido = !neg || valor <= 0 || !f.fecha
  const nombrePdf = emitido
    ? nombreArchivoRecibo({
        numero: emitido.datos.numero,
        codigoVenta: emitido.datos.codigoVenta,
        proyecto: emitido.datos.proyecto,
        lote: emitido.datos.lote,
        comprador: emitido.datos.comprador,
        fechaPago: emitido.datos.fechaPago,
      })
    : ''

  return (
    <>
      <PageHeader title="Registrar abono" />
      {!puedeRegistrar && <Aviso tipo="info">Tu rol no permite registrar abonos.</Aviso>}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <Card className="relative z-30 overflow-visible">
            <Field label="Seleccionar Negociación"><NegociacionPicker onSelect={seleccionar} soloActivas /></Field>
            {neg && saldos && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{comprador?.nombres}</span>
                  <span className="text-gray-500">· {neg.lotes.proyectos.nombre} · {neg.lotes.codigo} · {neg.codigo_venta}</span>
                  <Badge estado={neg.estado}>{ESTADOS[neg.estado]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4">
                  <Stat label="Precio" value={formatCOP(neg.precio_acordado)} />
                  <Stat label="Abonado" value={formatCOP(saldos.total_recaudado)} tone="good" />
                  <Stat label="Saldo" value={formatCOP(saldos.saldo_pendiente)} tone="warn" />
                  <Stat label="% pagado" value={`${Number(saldos.porcentaje_pagado).toFixed(1)} %`} />
                </div>
              </div>
            )}
          </Card>

          <Card>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); confirmar() }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fecha del pago"><Input id="abono-fecha" type="date" max={hoyISO()} required value={f.fecha} onChange={set('fecha')} /></Field>
                <Field label="Valor recibido (COP)"><Input id="abono-valor" type="number" min="1" step="1" required value={f.valor} onChange={set('valor')} placeholder="5000000" /></Field>
                <Field label="Medio de pago">
                  <Select id="abono-medio" value={f.medio} onChange={set('medio')}>
                    {Object.entries(MEDIOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                {f.medio !== 'efectivo' && <Field label="Banco"><Input id="abono-banco" value={f.banco} onChange={set('banco')} /></Field>}
                <Field label="Referencia / N.º de transacción" hint="Opcional. No se inventa si no existe."><Input id="abono-referencia" value={f.referencia} onChange={set('referencia')} /></Field>
                <Field label="Comprobante (opcional)"><Input id="abono-archivo" type="file" accept="image/*,application/pdf" className="pt-1.5" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /></Field>
              </div>
              <Field label="Observaciones"><Textarea id="abono-obs" value={f.observaciones} onChange={set('observaciones')} /></Field>

              {pideExcedente && (
                <Field label="Motivo de autorización del excedente (administrador)"><Input id="abono-motivo" value={motivoExc} onChange={(e) => setMotivoExc(e.target.value)} /></Field>
              )}
              {error && <Aviso>{error}</Aviso>}
              <Button id="abono-confirmar" size="lg" className="w-full" disabled={invalido || enviando || !puedeRegistrar}>
                {enviando ? 'Registrando…' : pideDuplicado || pideExcedente ? 'Confirmar y registrar' : 'Registrar abono'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {emitido ? (
            <>
              <Aviso tipo="ok"><CheckCircle2 className="mr-1 inline" size={16} />Abono registrado. Recibo N.º {String(emitido.datos.numero).padStart(6, '0')} generado.</Aviso>
              <ReciboPreview d={emitido.datos} />
              <div className="no-print flex flex-wrap gap-2">
                <Button id="recibo-pdf" onClick={() => descargarPDF(emitido.pdf, nombrePdf)}><Download size={16} />Descargar PDF</Button>
                <Button id="recibo-imprimir" variant="outline" onClick={() => abrirOImprimirPDF(emitido.pdf, nombrePdf, true)}><Printer size={16} />Imprimir</Button>
                <Button id="recibo-whatsapp" variant="outline" onClick={async () => {
                  const r = await compartirWhatsApp(emitido.pdf, nombrePdf, `Recibo de abono N.º ${emitido.datos.numero} — ${emitido.datos.proyecto} ${emitido.datos.lote}`)
                  if (r === 'manual') alert('Se descargó el PDF. Adjúntalo en WhatsApp (tu navegador no permite adjuntarlo automáticamente).')
                }}><MessageCircle size={16} />WhatsApp</Button>
                {neg && <Link to={`/estado-cuenta?negociacion=${neg.id}`}><Button variant="outline"><FileText size={16} />Estado de cuenta</Button></Link>}
              </div>
            </>
          ) : preliminar ? <ReciboPreview d={preliminar} /> : (
            <Card className="py-16 text-center text-gray-400">Selecciona una negociación para ver la vista previa del recibo.</Card>
          )}
        </div>
      </div>
    </>
  )
}
