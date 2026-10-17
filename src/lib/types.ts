export type Rol = 'administrador' | 'cartera' | 'comercial' | 'consulta'

export interface Proyecto {
  id: string; codigo: string; nombre: string; municipio: string | null
  departamento: string | null; descripcion: string | null; activo: boolean; created_at: string
}
export interface Cliente {
  id: string; tipo_documento: string; numero_documento: string; nombres: string
  telefono_principal: string | null; telefono_secundario: string | null; email: string | null
  direccion: string | null; municipio: string | null; observaciones: string | null
}
export interface NegociacionFila {
  id: string; codigo_venta: string; fecha_negociacion: string; precio_acordado: number
  cuota_inicial_pactada: number | null; vendedor: string | null; estado: string
  observaciones: string | null
  lotes: { id: string; codigo: string; area_m2: number | null; proyectos: { id: string; nombre: string; codigo: string } }
  negociacion_clientes: { es_principal: boolean; clientes: Cliente }[]
}
export interface Saldos {
  negociacion_id: string; total_recaudado: number; saldo_pendiente: number
  porcentaje_pagado: number; fecha_ultimo_abono: string | null; dias_desde_ultimo_abono: number | null
}
export interface MovimientoCuenta {
  abono_id: string; fecha: string | null; recibo_numero: number | null; medio: string | null
  referencia: string | null; valor: number; saldo_posterior: number; pendiente_completar: boolean
}
export interface ReciboDatos {
  numero: number | null            // null = vista preliminar
  fecha: string
  comprador: string; documento: string; telefono: string | null
  proyecto: string; lote: string; codigoVenta: string; valorNegocio: number
  totalAnterior: number; valorAbono: number; totalAcumulado: number; saldoNuevo: number
  fechaPago: string; medio: string; banco: string | null; referencia: string | null
  observaciones: string | null
}

export interface LoteInventario {
  id: string
  proyecto_id: string
  proyecto_nombre: string
  proyecto_codigo: string
  codigo: string
  area_m2: number | null
  activo: boolean
  negociacion_id: string | null
  codigo_venta: string | null
  estado_comercial: string
  precio_acordado: number | null
  comprador_principal: string | null
  comprador_documento: string | null
}
