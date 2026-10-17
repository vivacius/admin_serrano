import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-brand-500 active:scale-[.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand-800 text-white hover:bg-brand-700 shadow-sm',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        ghost: 'text-gray-600 hover:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: { sm: 'h-8 px-3', md: 'h-10 px-4', lg: 'h-11 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
export function Button({ className, variant, size, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...p} />
}

const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(field, 'h-10', className)} {...p} />
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(field, 'h-10', className)} {...p} />
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(field, 'py-2', className)} rows={2} {...p} />

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('animate-in rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>{children}</div>
)

export function Stat({
  label,
  value,
  tone = 'default',
  sub,
  className
}: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn'
  sub?: string
  className?: string
}) {
  const isLong = value.length > 10
  return (
    <Card className={cn('!p-2.5 sm:!p-3 overflow-hidden', className)}>
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-bold tracking-tight truncate leading-tight',
          isLong ? 'text-xs sm:text-[13px] lg:text-sm' : 'text-sm sm:text-base lg:text-lg',
          tone === 'good' && 'text-brand-600',
          tone === 'warn' && 'text-amber-600'
        )}
        title={value}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
    </Card>
  )
}

const tones: Record<string, string> = {
  vendido: 'bg-brand-100 text-brand-800', finalizado: 'bg-blue-100 text-blue-800',
  separado: 'bg-amber-100 text-amber-800', en_negociacion: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700', disponible: 'bg-gray-100 text-gray-600',
}
export const Badge = ({ estado, children }: { estado: string; children: ReactNode }) => (
  <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', tones[estado] ?? tones.disponible)}>{children}</span>
)

export const PageHeader = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl font-semibold text-brand-950">{title}</h1>
    <div className="flex gap-2">{children}</div>
  </div>
)

export const Aviso = ({ tipo = 'error', children }: { tipo?: 'error' | 'ok' | 'info'; children: ReactNode }) => (
  <div className={cn('rounded-lg px-4 py-3 text-sm', tipo === 'error' && 'bg-red-50 text-red-700', tipo === 'ok' && 'bg-brand-50 text-brand-800', tipo === 'info' && 'bg-amber-50 text-amber-800')}>
    {children}
  </div>
)
