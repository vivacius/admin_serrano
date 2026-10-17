import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/auth/AuthProvider'
import { Aviso, Button, Card, PageHeader } from '@/components/ui'

export default function ImportarExcel() {
  const { puede } = useAuth()
  const qc = useQueryClient()
  const [resultado, setResultado] = useState<{
    success: boolean
    proyectosCount: number
    lotesCount: number
    ventasCount: number
    abonosCount: number
  } | null>(null)
  const [error, setError] = useState('')

  const importar = useMutation({
    mutationFn: () => api.importarExcel(),
    onSuccess: (data) => {
      setResultado(data)
      setError('')
      qc.invalidateQueries()
    },
    onError: (err: unknown) => {
      setError((err as Error).message)
    },
  })

  return (
    <>
      <PageHeader title="Importación de Datos Excel" />

      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-brand-100 p-3 text-brand-800">
            <FileSpreadsheet size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-brand-950">
              Migración desde SERRANO ACTUALIZADO 15.xlsx
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Esta herramienta procesa las hojas <strong>PROYECTOS</strong>, <strong>VENTAS</strong> y{' '}
              <strong>ABONOS</strong> del archivo Excel original. Extrae los 99 lotes de Amaranta con sus áreas en m²,
              unifica los compradores por documento y crea los abonos con generación de recibos consecutivos.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {puede('administrador') ? (
                <Button
                  id="btn-importar-excel"
                  onClick={() => importar.mutate()}
                  disabled={importar.isPending}
                  className="gap-2"
                >
                  <RefreshCw size={16} className={importar.isPending ? 'animate-spin' : ''} />
                  {importar.isPending ? 'Procesando archivo…' : 'Ejecutar Importación del Excel'}
                </Button>
              ) : (
                <Aviso tipo="info">Solo los usuarios con rol de Administrador pueden ejecutar la importación.</Aviso>
              )}
            </div>
          </div>
        </div>
      </Card>

      {error && <Aviso>{error}</Aviso>}

      {resultado && (
        <Card className="border-brand-300 bg-brand-50/50">
          <div className="flex items-center gap-2 text-brand-900 font-semibold mb-3">
            <CheckCircle2 size={20} className="text-brand-600" />
            ¡Importación completada con éxito!
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-lg bg-white p-3 border border-gray-200">
              <span className="text-xs text-gray-500 block">Proyectos</span>
              <span className="text-lg font-bold text-brand-950">{resultado.proyectosCount}</span>
            </div>
            <div className="rounded-lg bg-white p-3 border border-gray-200">
              <span className="text-xs text-gray-500 block">Lotes con Área</span>
              <span className="text-lg font-bold text-brand-950">{resultado.lotesCount}</span>
            </div>
            <div className="rounded-lg bg-white p-3 border border-gray-200">
              <span className="text-xs text-gray-500 block">Negociaciones</span>
              <span className="text-lg font-bold text-brand-950">{resultado.ventasCount}</span>
            </div>
            <div className="rounded-lg bg-white p-3 border border-gray-200">
              <span className="text-xs text-gray-500 block">Abonos y Recibos</span>
              <span className="text-lg font-bold text-brand-950">{resultado.abonosCount}</span>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <AlertCircle size={18} className="text-gray-500" />
          Reglas de negocio aplicadas durante la importación
        </h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>
            <strong>Inventario de lotes:</strong> Se importaron los 99 lotes de Amaranta respetando sus áreas en metros cuadrados.
          </li>
          <li>
            <strong>Compradores múltiples:</strong> Se unificaron por número de cédula para que un cliente pueda tener múltiples negociaciones sin duplicar su registro.
          </li>
          <li>
            <strong>Abonos incompletos:</strong> Los abonos sin fecha o sin medio de pago se importan marcados como <em>pendiente de completar</em> pero sumando al total recaudado.
          </li>
          <li>
            <strong>Recibos consecutivos:</strong> Cada abono válido tiene su consecutivo único de recibo asignado de forma inmutable.
          </li>
        </ul>
      </Card>
    </>
  )
}
