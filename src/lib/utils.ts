import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...i: ClassValue[]) => twMerge(clsx(i))

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
export const formatCOP = (n: number | string | null | undefined) => cop.format(Number(n ?? 0))

export function formatFecha(d: string | null | undefined) {
  if (!d) return 'Pendiente'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

export const hoyISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const MEDIOS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', consignacion: 'Consignación', otro: 'Otro',
}
export const ESTADOS: Record<string, string> = {
  en_negociacion: 'En negociación', separado: 'Separado', vendido: 'Vendido',
  cancelado: 'Cancelado', finalizado: 'Finalizado',
}
