import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LabelList } from 'recharts'
import { ArrowUpRight, DollarSign, HandCoins, LayoutGrid, Receipt } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCOP, formatFecha, MEDIOS } from '@/lib/utils'
import { Aviso, Button, Card, PageHeader, Stat } from '@/components/ui'

const COLORES_LOTES = {
  disponibles: '#16a34a', // Verde disponible
  en_proceso: '#eab308', // Amarillo / ámbar proceso
  vendidos: '#1e40af', // Azul vendido / escriturado
}

const NOMBRES_MES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
}
function formatMes(mes: string) {
  if (!mes) return ''
  const partes = mes.split('-')
  if (partes.length < 2) return mes
  const [y, m] = partes
  return `${NOMBRES_MES[m] || m} ${y}`
}

export default function Inicio() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard(),
  })

  const k = data?.kpis
  const pctRecaudo = k && k.negociado > 0 ? ((k.recaudo / k.negociado) * 100).toFixed(1) : '0'

  const pieData = k ? [
    { name: `Disponibles: ${k.disponibles}`, value: k.disponibles, color: COLORES_LOTES.disponibles },
    { name: `En proceso: ${k.en_proceso}`, value: k.en_proceso, color: COLORES_LOTES.en_proceso },
    { name: `Vendidos: ${k.vendidos}`, value: k.vendidos, color: COLORES_LOTES.vendidos },
  ].filter((d) => d.value > 0) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader title="Panel de Control" />
          <p className="mt-1 text-sm text-gray-500">
            Resumen comercial, financiero y operativo de proyectos inmobiliarios SERRANO.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/abonos">
            <Button className="flex items-center gap-2">
              <Receipt size={16} /> Registrar abono
            </Button>
          </Link>
          <Link to="/negociaciones">
            <Button variant="outline" className="flex items-center gap-2">
              <HandCoins size={16} /> Negociaciones
            </Button>
          </Link>
          <Link to="/inventario-lotes">
            <Button variant="outline" className="flex items-center gap-2">
              <LayoutGrid size={16} /> Ver lotes
            </Button>
          </Link>
        </div>
      </div>

      {error && <Aviso>{(error as Error).message}</Aviso>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat
          label="Total negociado"
          value={formatCOP(k?.negociado ?? 0)}
          sub={`${k?.activas ?? 0} negociaciones activas`}
        />
        <Stat
          label="Recaudo acumulado"
          value={formatCOP(k?.recaudo ?? 0)}
          tone="good"
          sub={`${pctRecaudo}% del valor negociado`}
        />
        <Stat
          label="Cartera pendiente"
          value={formatCOP(k?.cartera ?? 0)}
          tone="warn"
          sub="Saldo por cobrar"
        />
        <Stat
          label="Lotes disponibles"
          value={String(k?.disponibles ?? 0)}
          sub={`De ${k?.total_lotes ?? 0} lotes totales`}
        />
        <Stat
          label="Proyectos activos"
          value={String(k?.proyectos ?? 0)}
          sub="Portafolio SERRANO"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Collections Chart */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Histórico de Recaudo Mensual</h2>
              <p className="text-xs text-gray-500">Comportamiento de ingresos por abonos confirmados</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded">
              <DollarSign size={14} /> Recaudo en COP
            </span>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">Cargando gráfico…</div>
            ) : data?.mensual?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.mensual} margin={{ top: 28, right: 15, left: 10, bottom: 20 }}>
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={formatMes}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCOP(Number(val) || 0), 'Recaudo']}
                    labelFormatter={(label) => `Mes: ${formatMes(String(label))}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total" fill="#124a31" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="total"
                      position="top"
                      formatter={(val: any) => (Number(val) >= 1_000_000 ? `$${(Number(val) / 1_000_000).toFixed(0)}M` : formatCOP(Number(val) || 0))}
                      fill="#124a31"
                      fontSize={11}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Sin datos de abonos históricos registrados
              </div>
            )}
          </div>
        </Card>

        {/* Lot Inventory Distribution Pie */}
        <Card>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Estado de Lotes</h2>
            <p className="text-xs text-gray-500">Distribución de inventario global ({k?.total_lotes ?? 99} lotes)</p>
          </div>

          <div className="h-64 w-full flex flex-col items-center justify-center relative">
            {isLoading ? (
              <div className="text-sm text-gray-400">Cargando…</div>
            ) : pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} lotes (${Math.round((Number(val) / (k?.total_lotes || 99)) * 100)}%)`, 'Cantidad']} />
                  <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-400">Sin datos de lotes</div>
            )}
          </div>
        </Card>
      </div>

      {/* Projects Overview and Recent Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Projects Breakdown */}
        <Card className="lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Proyectos</h2>
              <p className="text-xs text-gray-500">Métricas por parcelación</p>
            </div>
            <Link to="/proyectos" className="text-xs font-medium text-brand-700 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-4">
            {data?.por_proyecto?.map((p) => {
              const recPct = p.negociado > 0 ? Math.min(100, Math.round((p.recaudo / p.negociado) * 100)) : 0
              return (
                <div key={p.id} className="rounded-lg border border-gray-100 p-3 bg-gray-50/50 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-900">{p.nombre}</span>
                    <span className="text-xs text-gray-500">{p.total_lotes} lotes</span>
                  </div>
                  <div className="grid grid-cols-2 text-xs text-gray-600 mb-2">
                    <div>Recaudo: <span className="font-medium text-brand-800">{formatCOP(p.recaudo)}</span></div>
                    <div className="text-right">Cartera: <span className="font-medium text-amber-700">{formatCOP(p.cartera)}</span></div>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-700 h-full rounded-full transition-all" style={{ width: `${recPct}%` }} />
                  </div>
                  <div className="text-right text-[11px] text-gray-400 mt-1">{recPct}% recaudado</div>
                </div>
              )
            })}
            {!data?.por_proyecto?.length && (
              <p className="py-6 text-center text-sm text-gray-400">Sin proyectos registrados.</p>
            )}
          </div>
        </Card>

        {/* Recent Collections Table */}
        <Card className="lg:col-span-2 overflow-hidden !p-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Últimos Abonos Registrados</h2>
              <p className="text-xs text-gray-500">Transacciones y recibos más recientes</p>
            </div>
            <Link to="/abonos" className="text-xs font-medium text-brand-700 hover:underline flex items-center gap-0.5">
              Nuevo abono <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Recibo</th>
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Comprador</th>
                  <th className="px-3 py-2.5">Lote</th>
                  <th className="px-3 py-2.5 text-right">Valor</th>
                  <th className="px-3 py-2.5">Medio</th>
                  <th className="px-3 py-2.5 text-right pr-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.ultimos_abonos?.map((a) => (
                  <tr key={a.id} className="hover:bg-brand-50/30">
                    <td className="px-3 py-2.5 font-semibold text-brand-800 whitespace-nowrap">
                      {a.recibo_numero ? `#${String(a.recibo_numero).padStart(6, '0')}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatFecha(a.fecha_pago)}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 truncate max-w-[150px]">{a.cliente_nombre ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {a.proyecto_nombre ? `${a.proyecto_nombre.slice(0, 3)}. ` : ''}{a.lote_codigo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-brand-800 whitespace-nowrap">{formatCOP(a.valor)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 capitalize">{a.medio ? (MEDIOS[a.medio] ?? a.medio) : '—'}</td>
                    <td className="px-3 py-2.5 text-right pr-4 whitespace-nowrap">
                      <Link to={`/lotes?negociacion=${a.negociacion_id}`} className="text-xs text-brand-700 hover:underline font-medium">
                        Ficha lote
                      </Link>
                    </td>
                  </tr>
                ))}
                {!data?.ultimos_abonos?.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No hay abonos registrados recientemente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span>Conexión en la nube: Supabase PostgreSQL (admin_serrano) · En línea</span>
        <span>SERRANO Gestión Inmobiliaria v1.0</span>
      </div>
    </div>
  )
}
