import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, MessageCircle, Printer } from 'lucide-react'
import { api, listarNegociaciones, principal } from '@/lib/api'
import {
  abrirOImprimirPDF,
  compartirWhatsApp,
  descargarPDF,
  generarEstadoCuentaPDF,
  nombreArchivoEstadoCuenta,
  type DatosEstadoCuenta,
} from '@/lib/pdf'
import type { MovimientoCuenta, NegociacionFila } from '@/lib/types'
import { MEDIOS, formatCOP, formatFecha, hoyISO } from '@/lib/utils'
import NegociacionPicker from '@/components/NegociacionPicker'
import { Aviso, Button, Card, Field, Input, PageHeader, Stat } from '@/components/ui'

export async function cargarEstadoCuenta(neg: NegociacionFila, corte: string): Promise<DatosEstadoCuenta> {
  const movs = (await api.estadoCuenta(neg.id, corte)) as MovimientoCuenta[]
  const total = movs.reduce((s, m) => s + Number(m.valor), 0)
  const precio = Number(neg.precio_acordado)
  const c = principal(neg)
  return {
    comprador: c?.nombres ?? '', documento: c?.numero_documento ?? '', proyecto: neg.lotes.proyectos.nombre,
    lote: neg.lotes.codigo, codigoVenta: neg.codigo_venta, fechaNegociacion: neg.fecha_negociacion,
    valorNegocio: precio, totalRecaudado: total, saldo: precio - total, porcentaje: (total / precio) * 100,
    corte, movimientos: movs,
  }
}

export default function EstadoCuenta() {
  const [params] = useSearchParams()
  const [neg, setNeg] = useState<NegociacionFila | null>(null)
  const [corte, setCorte] = useState(hoyISO())
  const [d, setD] = useState<DatosEstadoCuenta | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = params.get('negociacion')
    if (id) listarNegociaciones().then((l) => setNeg(l.find((x) => x.id === id) ?? null))
  }, [params])

  useEffect(() => {
    if (!neg) return
    setError('')
    cargarEstadoCuenta(neg, corte).then(setD).catch((e) => setError(e.message))
  }, [neg, corte])

  const nombre = d ? nombreArchivoEstadoCuenta(d) : ''

  return (
    <>
      <PageHeader title="Estado de cuenta" />
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <Field label="Negociación"><NegociacionPicker onSelect={setNeg} /></Field>
          <Field label="Fecha de corte"><Input type="date" max={hoyISO()} value={corte} onChange={(e) => setCorte(e.target.value)} /></Field>
        </div>
      </Card>
      {error && <Aviso>{error}</Aviso>}
      {d && (
        <div className="space-y-6">
          <Card>
            <p className="text-lg font-semibold">{d.comprador}</p>
            <p className="text-sm text-gray-500">{d.documento} · {d.proyecto} · Lote {d.lote} · {d.codigoVenta} · Negociado {formatFecha(d.fechaNegociacion)}</p>
          </Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Valor del negocio" value={formatCOP(d.valorNegocio)} />
            <Stat label="Total recaudado" value={formatCOP(d.totalRecaudado)} tone="good" />
            <Stat label="Saldo pendiente" value={formatCOP(d.saldo)} tone="warn" />
            <Stat label="% pagado" value={`${d.porcentaje.toFixed(2)} %`} />
          </div>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Fecha</th><th>Recibo</th><th>Medio</th><th>Referencia</th><th className="text-right">Abono</th><th className="pr-3 text-right">Saldo posterior</th></tr></thead>
              <tbody>{d.movimientos.map((m) => (
                <tr key={m.abono_id} className="border-t">
                  <td className="p-3">{formatFecha(m.fecha)}{m.pendiente_completar && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs text-amber-800">pendiente de completar</span>}</td>
                  <td>{m.recibo_numero ? String(m.recibo_numero).padStart(6, '0') : '—'}</td><td>{m.medio ? MEDIOS[m.medio] : '—'}</td><td>{m.referencia ?? '—'}</td>
                  <td className="text-right">{formatCOP(m.valor)}</td><td className="pr-3 text-right">{formatCOP(m.saldo_posterior)}</td>
                </tr>))}
                {!d.movimientos.length && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin abonos a la fecha de corte</td></tr>}
              </tbody>
            </table>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button id="ec-pdf" onClick={async () => descargarPDF(await generarEstadoCuentaPDF(d), nombre)}><Download size={16} />Descargar PDF</Button>
            <Button variant="outline" onClick={async () => abrirOImprimirPDF(await generarEstadoCuentaPDF(d), nombre, true)}><Printer size={16} />Imprimir</Button>
            <Button variant="outline" onClick={async () => {
              const r = await compartirWhatsApp(await generarEstadoCuentaPDF(d), nombre, `Estado de cuenta ${d.codigoVenta} — ${d.proyecto} ${d.lote}`)
              if (r === 'manual') alert('Se descargó el PDF con el nombre oficial. Adjúntalo en WhatsApp.')
            }}><MessageCircle size={16} />Compartir</Button>
          </div>
        </div>
      )}
    </>
  )
}
