import type { ReciboDatos } from '@/lib/types'
import { MEDIOS, formatCOP, formatFecha } from '@/lib/utils'
import { Card, Stat } from '@/components/ui'

/** Vista HTML enriquecida del recibo, espejo visual de Estado de Cuenta */
export default function ReciboPreview({ d }: { d: ReciboDatos }) {
  const prelim = d.numero === null
  const pctAnt = d.valorNegocio > 0 ? ((d.totalAnterior / d.valorNegocio) * 100).toFixed(1) : '0'
  const pctAbono = d.valorNegocio > 0 ? ((d.valorAbono / d.valorNegocio) * 100).toFixed(1) : '0'
  const pctAcum = d.valorNegocio > 0 ? ((d.totalAcumulado / d.valorNegocio) * 100).toFixed(1) : '0'
  const pctSaldo = d.valorNegocio > 0 ? ((d.saldoNuevo / d.valorNegocio) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      {/* Cabecera corporativa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-brand-900 px-5 py-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SERRANO" className="h-8 w-auto object-contain" />
          <div className="border-l border-brand-700 pl-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">SERRANO Gestión Inmobiliaria</p>
            <p className="text-sm font-bold text-white">RECIBO OFICIAL DE ABONO</p>
          </div>
        </div>
        <div className="text-left sm:text-right text-xs">
          <p className="font-semibold text-white">{prelim ? 'N.º: Asignado al confirmar' : `RECIBO N.º ${String(d.numero).padStart(6, '0')}`}</p>
          <p className="text-brand-200">Emisión: {formatFecha(d.fecha)}</p>
        </div>
      </div>

      {prelim && (
        <p className="rounded-lg bg-red-50 py-1.5 text-center text-xs font-bold text-red-700 border border-red-200">
          VISTA PRELIMINAR — SIN VALIDEZ FISCAL NI CONTRACTUAL
        </p>
      )}

      {/* Tarjeta de Información General */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-base font-bold text-gray-900">{d.comprador}</p>
            <p className="text-xs text-gray-500">
              {d.documento} {d.telefono ? `· Tel: ${d.telefono}` : ''}
            </p>
          </div>
          <div className="sm:text-right">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-200">
              {d.proyecto} · Lote {d.lote} · {d.codigoVenta}
            </span>
          </div>
        </div>
      </Card>

      {/* Grid de 4 Estadísticas Financieras */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Stat label="Negociación" value={formatCOP(d.valorNegocio)} sub="Precio pactado" />
        <Stat label="Abonado antes" value={formatCOP(d.totalAnterior)} sub={`${pctAnt}% previo`} />
        <Stat label="Abono actual" value={formatCOP(d.valorAbono)} tone="good" sub={`+${pctAbono}% recibido`} />
        <Stat label="Nuevo saldo" value={formatCOP(d.saldoNuevo)} tone="warn" sub={`${pctSaldo}% restante`} />
      </div>

      {/* Tabla estructurada con bordes */}
      <Card className="overflow-x-auto !p-0 border border-gray-200">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="p-3">Concepto Financiero</th>
              <th className="p-3">Descripción</th>
              <th className="p-3 text-right">Monto (COP)</th>
              <th className="pr-3 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="p-3 font-medium text-gray-800">Valor total acordado</td>
              <td className="p-3 text-gray-500">Precio pactado lote {d.lote}</td>
              <td className="p-3 text-right font-semibold">{formatCOP(d.valorNegocio)}</td>
              <td className="pr-3 text-right text-gray-500">100.0 %</td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-gray-800">Total abonado antes de este recibo</td>
              <td className="p-3 text-gray-500">Saldo acumulado anterior</td>
              <td className="p-3 text-right font-semibold">{formatCOP(d.totalAnterior)}</td>
              <td className="pr-3 text-right text-gray-500">{pctAnt} %</td>
            </tr>
            <tr className="bg-brand-50/60 font-semibold text-brand-900">
              <td className="p-3">+ ABONO RECIBIDO (ESTE RECIBO)</td>
              <td className="p-3 text-brand-700">{MEDIOS[d.medio] ?? d.medio} {d.banco ? `· ${d.banco}` : ''} {d.referencia ? `· Ref: ${d.referencia}` : ''}</td>
              <td className="p-3 text-right text-brand-800 font-bold">{formatCOP(d.valorAbono)}</td>
              <td className="pr-3 text-right text-brand-800">{pctAbono} %</td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-gray-800">Total acumulado pagado</td>
              <td className="p-3 text-gray-500">Total recaudado a la fecha</td>
              <td className="p-3 text-right font-semibold">{formatCOP(d.totalAcumulado)}</td>
              <td className="pr-3 text-right text-gray-500">{pctAcum} %</td>
            </tr>
            <tr className="bg-amber-50/30 font-semibold text-amber-900">
              <td className="p-3">NUEVO SALDO PENDIENTE</td>
              <td className="p-3 text-gray-500">Saldo restante por cancelar</td>
              <td className="p-3 text-right font-bold text-amber-800">{formatCOP(d.saldoNuevo)}</td>
              <td className="pr-3 text-right text-amber-800">{pctSaldo} %</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Detalle y notas del pago */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
          <p className="font-semibold text-gray-700 mb-1">Detalle de la Operación</p>
          <p className="text-gray-600">Fecha de aplicación: <span className="font-medium text-gray-900">{formatFecha(d.fechaPago)}</span></p>
          <p className="text-gray-600">Medio: <span className="font-medium text-gray-900">{MEDIOS[d.medio] ?? d.medio}</span></p>
          {d.referencia && <p className="text-gray-600">Referencia / Comprobante: <span className="font-medium text-gray-900">{d.referencia}</span></p>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
          <p className="font-semibold text-gray-700 mb-1">Observaciones</p>
          <p className="text-gray-600 italic">{d.observaciones || 'Sin observaciones registradas.'}</p>
        </div>
      </div>
    </div>
  )
}
