import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && key && !url.includes('TU-PROYECTO'))

export const supabase = createClient(
  supabaseConfigurado ? url! : 'https://cugajlobgbwnvhvtqnxw.supabase.co',
  supabaseConfigurado ? key! : 'sin-configurar',
  {
    db: { schema: 'admin_serrano' },
    auth: { persistSession: true },
  }
)
