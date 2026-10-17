import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthProvider'
import Layout from '@/components/Layout'
import { Card, PageHeader } from '@/components/ui'
import Login from '@/pages/Login'
import Inicio from '@/pages/Inicio'
import Proyectos from '@/pages/Proyectos'
import Clientes from '@/pages/Clientes'
import Negociaciones from '@/pages/Negociaciones'
import Abonos from '@/pages/Abonos'
import EstadoCuenta from '@/pages/EstadoCuenta'
import FichaLote from '@/pages/FichaLote'
import LotesInventario from '@/pages/LotesInventario'
import ImportarExcel from '@/pages/ImportarExcel'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } } })

const Pronto = ({ t }: { t: string }) => (
  <>
    <PageHeader title={t} />
    <Card className="py-16 text-center text-gray-400">Este módulo corresponde a la Fase 2 del plan de desarrollo.</Card>
  </>
)

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="abonos" element={<Abonos />} />
              <Route path="negociaciones" element={<Negociaciones />} />
              <Route path="inventario-lotes" element={<LotesInventario />} />
              <Route path="lotes" element={<FichaLote />} />
              <Route path="estado-cuenta" element={<EstadoCuenta />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="proyectos" element={<Proyectos />} />
              <Route path="importar-excel" element={<ImportarExcel />} />
              <Route path="cartera" element={<Pronto t="Cartera" />} />
              <Route path="comisiones" element={<Pronto t="Comisiones" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
