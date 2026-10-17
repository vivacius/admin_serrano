// Capa de acceso a datos 100% en línea conectada a Supabase (schema admin_serrano)
// Lista para despliegue directo en Vercel sin servidor backend Node intermediario.
import { supabase } from './supabase'
import type { Cliente, LoteInventario, MovimientoCuenta, NegociacionFila, Proyecto, Rol, Saldos } from './types'

const KEY_USER = 'serrano_user'
const KEY_TOKEN = 'serrano_token'

export const getToken = () => localStorage.getItem(KEY_TOKEN)

export class ApiError extends Error {
  status: number
  constructor(status: number, msg: string) {
    super(msg)
    this.status = status
  }
}

export interface Usuario { id: string; email: string; nombre: string; rol: Rol }
export interface AbonoFila {
  id: string; fecha_pago: string | null; valor: number; medio: string | null; referencia: string | null
  estado: string; pendiente_completar: boolean; motivo_anulacion: string | null
  recibos: { numero: number; pdf_path: string | null } | null
}
export interface ReciboFila {
  id: string; numero: number; fecha_emision: string; total_anterior: number; valor_abono: number
  total_acumulado: number; saldo_nuevo: number
}
export interface ComisionFila {
  comisionista: string; porcentaje: number | null; valor_comision: number; pagado: number
}
export interface Kpis { proyectos: number; activas: number; negociado: number; recaudo: number; cartera: number }
export interface RegistroAbono {
  negociacion_id: string; fecha: string; valor: number; medio: string; banco: string | null
  referencia: string | null; observaciones: string | null; comprobante_path: string | null
  idempotency_key: string; autoriza_excedente: boolean; motivo_excedente: string | null; confirma_duplicado: boolean
}

export interface DashboardData {
  kpis: {
    proyectos: number
    activas: number
    negociado: number
    recaudo: number
    cartera: number
    total_lotes: number
    disponibles: number
    en_proceso: number
    vendidos: number
  }
  mensual: { mes: string; total: number; cantidad: number }[]
  por_proyecto: { id: string; nombre: string; codigo: string; total_lotes: number; negociaciones_activas: number; negociado: number; recaudo: number; cartera: number }[]
  ultimos_abonos: {
    id: string; fecha_pago: string | null; valor: number; medio: string | null; estado: string
    recibo_numero: number | null; recibo_pdf: string | null
    negociacion_id: string; codigo_venta: string; lote_codigo: string; proyecto_nombre: string; cliente_nombre: string | null
  }[]
}

export const api = {
  async login(email: string, clave: string): Promise<Usuario> {
    const { data, error } = await supabase.rpc('login', {
      p_email: email.trim().toLowerCase(),
      p_clave: clave,
    })

    if (error || !data) {
      throw new ApiError(401, error?.message || 'Credenciales inválidas')
    }

    const u = data as Usuario
    localStorage.setItem(KEY_USER, JSON.stringify(u))
    localStorage.setItem(KEY_TOKEN, u.id)
    return u
  },

  async me(): Promise<Usuario> {
    const raw = localStorage.getItem(KEY_USER)
    if (!raw) throw new ApiError(401, 'No autenticado')
    try {
      const u = JSON.parse(raw) as Usuario
      return u
    } catch {
      localStorage.removeItem(KEY_USER)
      localStorage.removeItem(KEY_TOKEN)
      throw new ApiError(401, 'Sesión inválida')
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem(KEY_USER)
    localStorage.removeItem(KEY_TOKEN)
  },

  async proyectos(): Promise<Proyecto[]> {
    const { data, error } = await supabase
      .from('proyectos')
      .select('*')
      .order('codigo')

    if (error) throw new ApiError(500, error.message)
    return (data || []).map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      municipio: p.municipio,
      departamento: p.departamento,
      descripcion: p.descripcion,
      activo: Boolean(p.activo),
      created_at: p.created_at,
    }))
  },

  async crearProyecto(p: unknown) {
    const { data, error } = await supabase.from('proyectos').insert(p as any).select().single()
    if (error) throw new ApiError(400, error.message)
    return data
  },

  async actualizarProyecto(id: string, p: unknown) {
    const { data, error } = await supabase.from('proyectos').update(p as any).eq('id', id).select().single()
    if (error) throw new ApiError(400, error.message)
    return data
  },

  async lotes(proyectoId?: string): Promise<LoteInventario[]> {
    let q = supabase
      .from('lotes')
      .select('id, proyecto_id, codigo, area_m2, activo, id_externo, proyectos ( id, nombre, codigo )')

    if (proyectoId) {
      q = q.eq('proyecto_id', proyectoId)
    }

    const { data: lotesData, error: lotesErr } = await q.order('codigo')
    if (lotesErr) throw new ApiError(500, lotesErr.message)

    const { data: negsData, error: negsErr } = await supabase
      .from('negociaciones')
      .select(`
        id, codigo_venta, estado, precio_acordado, lote_id,
        negociacion_clientes ( es_principal, clientes ( nombres, numero_documento ) )
      `)
      .neq('estado', 'cancelado')

    if (negsErr) throw new ApiError(500, negsErr.message)

    const negMap = new Map((negsData || []).map((n) => [n.lote_id, n]))

    return (lotesData || []).map((l: any) => {
      const neg = negMap.get(l.id)
      const principal = (neg?.negociacion_clientes || []).find((c: any) => c.es_principal) || neg?.negociacion_clientes?.[0]
      const cli = Array.isArray(principal?.clientes) ? principal?.clientes[0] : principal?.clientes
      return {
        id: l.id,
        proyecto_id: l.proyecto_id,
        proyecto_nombre: l.proyectos?.nombre || '',
        proyecto_codigo: l.proyectos?.codigo || '',
        codigo: l.codigo,
        area_m2: l.area_m2 ? Number(l.area_m2) : null,
        activo: Boolean(l.activo),
        negociacion_id: neg ? neg.id : null,
        codigo_venta: neg ? neg.codigo_venta : null,
        estado_comercial: neg ? neg.estado : 'disponible',
        precio_acordado: neg ? Number(neg.precio_acordado) : null,
        comprador_principal: cli?.nombres || null,
        comprador_documento: cli?.numero_documento || null,
      }
    })
  },

  async importarExcel() {
    throw new ApiError(400, 'Los datos ya están sincronizados en línea en Supabase.')
  },

  async clientes(): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombres')
      .limit(2000)

    if (error) throw new ApiError(500, error.message)
    return data as Cliente[]
  },

  async crearCliente(c: unknown) {
    const { data, error } = await supabase.from('clientes').insert(c as any).select().single()
    if (error) throw new ApiError(400, error.message)
    return data
  },

  async actualizarCliente(id: string, c: unknown) {
    const { data, error } = await supabase.from('clientes').update(c as any).eq('id', id).select().single()
    if (error) throw new ApiError(400, error.message)
    return data
  },

  async negociaciones(): Promise<NegociacionFila[]> {
    const { data, error } = await supabase
      .from('negociaciones')
      .select(`
        id, codigo_venta, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, estado, observaciones,
        lotes ( id, codigo, area_m2, proyectos ( id, nombre, codigo ) ),
        negociacion_clientes ( es_principal, clientes ( * ) )
      `)
      .order('fecha_negociacion', { ascending: false })
      .order('codigo_venta', { ascending: false })

    if (error) throw new ApiError(500, error.message)

    return (data || []).map((n: any) => ({
      id: n.id,
      codigo_venta: n.codigo_venta,
      fecha_negociacion: n.fecha_negociacion,
      precio_acordado: Number(n.precio_acordado),
      cuota_inicial_pactada: n.cuota_inicial_pactada !== null ? Number(n.cuota_inicial_pactada) : null,
      vendedor: n.vendedor,
      estado: n.estado,
      observaciones: n.observaciones,
      lotes: {
        id: n.lotes?.id,
        codigo: n.lotes?.codigo,
        area_m2: n.lotes?.area_m2 ? Number(n.lotes.area_m2) : null,
        proyectos: {
          id: n.lotes?.proyectos?.id,
          nombre: n.lotes?.proyectos?.nombre,
          codigo: n.lotes?.proyectos?.codigo,
        },
      },
      negociacion_clientes: (n.negociacion_clientes || []).map((nc: any) => ({
        es_principal: Boolean(nc.es_principal),
        clientes: nc.clientes,
      })),
    }))
  },

  async crearNegociacion(b: any): Promise<{ id: string }> {
    // 1. Obtener o crear lote
    let loteId = ''
    const { data: loteExistente } = await supabase
      .from('lotes')
      .select('id')
      .eq('proyecto_id', b.proyecto_id)
      .eq('codigo', b.codigo_lote.trim())
      .maybeSingle()

    if (loteExistente) {
      loteId = loteExistente.id
    } else {
      const { data: nuevoLote, error: errLote } = await supabase
        .from('lotes')
        .insert({ proyecto_id: b.proyecto_id, codigo: b.codigo_lote.trim() })
        .select('id')
        .single()
      if (errLote) throw new ApiError(400, errLote.message)
      loteId = nuevoLote.id
    }

    // 2. Obtener o crear cliente
    let clienteId = b.cliente_id
    if (!clienteId) {
      const { data: cliExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tipo_documento', b.tipo_doc || 'CC')
        .eq('numero_documento', b.documento.trim())
        .maybeSingle()

      if (cliExistente) {
        clienteId = cliExistente.id
      } else {
        const { data: nuevoCli, error: errCli } = await supabase
          .from('clientes')
          .insert({
            tipo_documento: b.tipo_doc || 'CC',
            numero_documento: b.documento.trim(),
            nombres: b.nombres.trim().toUpperCase(),
            telefono_principal: b.telefono || null,
            email: b.email || null,
          })
          .select('id')
          .single()
        if (errCli) throw new ApiError(400, errCli.message)
        clienteId = nuevoCli.id
      }
    }

    // 3. Insertar negociación
    const user = JSON.parse(localStorage.getItem(KEY_USER) || '{}')
    const { data: nuevaNeg, error: errNeg } = await supabase
      .from('negociaciones')
      .insert({
        codigo_venta: b.codigo_venta.trim(),
        lote_id: loteId,
        fecha_negociacion: b.fecha,
        precio_acordado: Math.round(Number(b.precio)),
        cuota_inicial_pactada: b.cuota === '' || b.cuota == null ? null : Math.round(Number(b.cuota)),
        vendedor: b.vendedor?.trim() || null,
        observaciones: b.observaciones?.trim() || null,
        estado: b.estado || 'en_negociacion',
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (errNeg) throw new ApiError(400, errNeg.message)

    // 4. Asociar cliente principal
    await supabase.from('negociacion_clientes').insert({
      negociacion_id: nuevaNeg.id,
      cliente_id: clienteId,
      es_principal: true,
    })

    return { id: nuevaNeg.id }
  },

  async actualizarNegociacion(id: string, n: any) {
    const updateObj: Record<string, unknown> = {}
    if (n.precio !== undefined) updateObj.precio_acordado = Math.round(Number(n.precio))
    if (n.fecha !== undefined) updateObj.fecha_negociacion = n.fecha
    if (n.estado !== undefined) updateObj.estado = n.estado
    if (n.vendedor !== undefined) updateObj.vendedor = n.vendedor?.trim() || null
    if (n.observaciones !== undefined) updateObj.observaciones = n.observaciones?.trim() || null
    if (n.cuota !== undefined) updateObj.cuota_inicial_pactada = n.cuota === '' || n.cuota == null ? null : Math.round(Number(n.cuota))

    const { error } = await supabase.from('negociaciones').update(updateObj).eq('id', id)
    if (error) throw new ApiError(400, error.message)
    return { ok: true }
  },

  async eliminarNegociacion(id: string, force = false) {
    if (!force) {
      const { data: abonosVigentes } = await supabase
        .from('abonos')
        .select('id')
        .eq('negociacion_id', id)
        .eq('estado', 'vigente')

      if (abonosVigentes && abonosVigentes.length > 0) {
        throw new ApiError(400, `No se puede eliminar: tiene ${abonosVigentes.length} abono(s) vigente(s).`)
      }
    }

    const { error } = await supabase.from('negociaciones').delete().eq('id', id)
    if (error) throw new ApiError(400, error.message)
    return { ok: true, deleted: id }
  },

  async saldos(ids: string[]): Promise<Record<string, Saldos>> {
    if (!ids.length) return {}

    const { data: negs, error: errNegs } = await supabase
      .from('negociaciones')
      .select('id, precio_acordado')
      .in('id', ids)

    if (errNegs) throw new ApiError(500, errNegs.message)

    const { data: abonos, error: errAbonos } = await supabase
      .from('abonos')
      .select('negociacion_id, valor, fecha_pago')
      .in('negociacion_id', ids)
      .eq('estado', 'vigente')

    if (errAbonos) throw new ApiError(500, errAbonos.message)

    const mapAbonos = new Map<string, { total: number; maxFecha: string | null }>()
    for (const a of abonos || []) {
      const cur = mapAbonos.get(a.negociacion_id) || { total: 0, maxFecha: null }
      cur.total += Number(a.valor)
      if (a.fecha_pago && (!cur.maxFecha || a.fecha_pago > cur.maxFecha)) {
        cur.maxFecha = a.fecha_pago
      }
      mapAbonos.set(a.negociacion_id, cur)
    }

    const hoyStr = new Date().toISOString().split('T')[0]
    const res: Record<string, Saldos> = {}

    for (const n of negs || []) {
      const info = mapAbonos.get(n.id) || { total: 0, maxFecha: null }
      const precio = Number(n.precio_acordado)
      const saldo = precio - info.total
      let dias: number | null = null
      if (info.maxFecha) {
        const diff = new Date(hoyStr).getTime() - new Date(info.maxFecha).getTime()
        dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
      }

      res[n.id] = {
        negociacion_id: n.id,
        total_recaudado: info.total,
        saldo_pendiente: saldo,
        porcentaje_pagado: precio > 0 ? Math.round((info.total / precio) * 10000) / 100 : 0,
        fecha_ultimo_abono: info.maxFecha,
        dias_desde_ultimo_abono: dias,
      }
    }

    return res
  },

  async registrarAbono(a: RegistroAbono) {
    const user = JSON.parse(localStorage.getItem(KEY_USER) || '{}')
    const { data, error } = await supabase.rpc('registrar_abono', {
      p_negociacion_id: a.negociacion_id,
      p_fecha: a.fecha,
      p_valor: Number(a.valor),
      p_medio: a.medio,
      p_banco: a.banco || null,
      p_referencia: a.referencia || null,
      p_observaciones: a.observaciones || null,
      p_comprobante_path: a.comprobante_path || null,
      p_idempotency_key: a.idempotency_key,
      p_autoriza_excedente: Boolean(a.autoriza_excedente),
      p_motivo_excedente: a.motivo_excedente || null,
      p_confirma_duplicado: Boolean(a.confirma_duplicado),
      p_usuario_id: user?.id || null,
    })

    if (error) {
      throw new ApiError(400, error.message)
    }

    return data as { abono_id: string; recibo_id: string; numero: number; repetido: boolean }
  },

  async recibo(id: string): Promise<ReciboFila> {
    const { data, error } = await supabase
      .from('recibos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new ApiError(404, error.message)

    return {
      id: data.id,
      numero: Number(data.numero),
      fecha_emision: data.fecha_emision,
      total_anterior: Number(data.total_anterior),
      valor_abono: Number(data.valor_abono),
      total_acumulado: Number(data.total_acumulado),
      saldo_nuevo: Number(data.saldo_nuevo),
    }
  },

  async guardarPdfRecibo(id: string, path: string, _pdf: Blob) {
    await supabase.from('recibos').update({ pdf_path: path }).eq('id', id)
    return { ok: true }
  },

  async abonos(negId: string): Promise<AbonoFila[]> {
    const { data, error } = await supabase
      .from('abonos')
      .select(`
        id, fecha_pago, valor, medio, referencia, estado, pendiente_completar, motivo_anulacion,
        recibos ( numero, pdf_path )
      `)
      .eq('negociacion_id', negId)
      .order('fecha_pago', { ascending: false, nullsFirst: false })

    if (error) throw new ApiError(500, error.message)

    return (data || []).map((a: any) => {
      const rec = Array.isArray(a.recibos) ? a.recibos[0] : a.recibos
      return {
        id: a.id,
        fecha_pago: a.fecha_pago,
        valor: Number(a.valor),
        medio: a.medio,
        referencia: a.referencia,
        estado: a.estado,
        pendiente_completar: Boolean(a.pendiente_completar),
        motivo_anulacion: a.motivo_anulacion,
        recibos: rec ? {
          numero: Number(rec.numero),
          pdf_path: rec.pdf_path,
        } : null,
      }
    })
  },

  async anularAbono(id: string, motivo: string) {
    const user = JSON.parse(localStorage.getItem(KEY_USER) || '{}')
    const { error } = await supabase.rpc('anular_abono', {
      p_abono_id: id,
      p_motivo: motivo,
      p_usuario_id: user?.id || null,
    })

    if (error) throw new ApiError(400, error.message)
    return { ok: true }
  },

  async estadoCuenta(negId: string, corte: string): Promise<MovimientoCuenta[]> {
    const { data, error } = await supabase.rpc('estado_cuenta', {
      p_negociacion_id: negId,
      p_corte: corte,
    })

    if (error) throw new ApiError(500, error.message)

    return (data || []).map((m: any) => ({
      abono_id: m.abono_id,
      fecha: m.fecha,
      recibo_numero: m.recibo_numero !== null ? Number(m.recibo_numero) : null,
      medio: m.medio,
      referencia: m.referencia,
      valor: Number(m.valor),
      saldo_posterior: Number(m.saldo_posterior),
      pendiente_completar: Boolean(m.pendiente_completar),
    }))
  },

  async comision(_negId: string): Promise<ComisionFila | null> {
    return null
  },

  async documentos(negId: string) {
    const { data } = await supabase
      .from('documentos')
      .select('id, nombre, categoria, version, storage_path')
      .eq('negociacion_id', negId)
      .order('created_at', { ascending: false })

    return data || []
  },

  async kpis(): Promise<Kpis> {
    const d = await this.dashboard()
    return d.kpis
  },

  async dashboard(): Promise<DashboardData> {
    // 1. Proyectos (filtrar activos para el panel principal)
    const { data: proys } = await supabase.from('proyectos').select('*').order('codigo')
    const proyList = proys || []
    const proysActivos = proyList.filter((p) => Boolean(p.activo))
    const proyActivosIds = new Set(proysActivos.map((p) => p.id))

    // 2. Lotes (pertenecientes a proyectos activos)
    const { data: lotes } = await supabase.from('lotes').select('id, proyecto_id, activo')
    const lotesList = (lotes || []).filter((l) => proyActivosIds.has(l.proyecto_id) && Boolean(l.activo))
    const lotesActivosIds = new Set(lotesList.map((l) => l.id))

    // 3. Negociaciones de lotes activos
    const { data: negs } = await supabase
      .from('negociaciones')
      .select('id, lote_id, estado, precio_acordado')
      .neq('estado', 'cancelado')
    const negsList = (negs || []).filter((n) => lotesActivosIds.has(n.lote_id))

    // 4. Abonos vigentes
    const { data: abonos } = await supabase
      .from('abonos')
      .select(`
        id, fecha_pago, valor, medio, estado, negociacion_id,
        recibos ( numero, pdf_path ),
        negociaciones ( codigo_venta, lote_id, lotes ( codigo, proyecto_id, proyectos ( nombre ) ), negociacion_clientes ( es_principal, clientes ( nombres ) ) )
      `)
      .eq('estado', 'vigente')
      .order('fecha_pago', { ascending: false, nullsFirst: false })

    const abonosList = abonos || []

    // Métricas globales sobre proyectos activos
    const totalNegociado = negsList.reduce((acc, n) => acc + Number(n.precio_acordado), 0)
    const totalRecaudo = abonosList.reduce((acc, a) => acc + Number(a.valor), 0)
    const cartera = totalNegociado - totalRecaudo

    const vendidos = negsList.filter((n) => n.estado === 'vendido').length
    const enProceso = negsList.filter((n) => ['en_negociacion', 'separado'].includes(n.estado)).length
    const disponibles = Math.max(0, lotesList.length - (vendidos + enProceso))

    // Desglose ÚNICAMENTE de proyectos activos
    const negsPorLote = new Map(negsList.map((n) => [n.lote_id, n]))
    const abonosPorNeg = new Map<string, number>()
    for (const a of abonosList) {
      abonosPorNeg.set(a.negociacion_id, (abonosPorNeg.get(a.negociacion_id) || 0) + Number(a.valor))
    }

    const por_proyecto = proysActivos.map((p) => {
      const lotesDelProy = lotesList.filter((l) => l.proyecto_id === p.id)
      const negsDelProy = lotesDelProy.map((l) => negsPorLote.get(l.id)).filter(Boolean) as typeof negsList
      const negVal = negsDelProy.reduce((acc, n) => acc + Number(n.precio_acordado), 0)
      const recVal = negsDelProy.reduce((acc, n) => acc + (abonosPorNeg.get(n.id) || 0), 0)
      return {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        total_lotes: lotesDelProy.length,
        negociaciones_activas: negsDelProy.length,
        negociado: negVal,
        recaudo: recVal,
        cartera: negVal - recVal,
      }
    })

    // Recaudo mensual (últimos 6 meses)
    const mapMensual = new Map<string, { total: number; cantidad: number }>()
    for (const a of abonosList) {
      if (a.fecha_pago) {
        const mes = a.fecha_pago.slice(0, 7) // YYYY-MM
        const cur = mapMensual.get(mes) || { total: 0, cantidad: 0 }
        cur.total += Number(a.valor)
        cur.cantidad += 1
        mapMensual.set(mes, cur)
      }
    }
    const mensual = Array.from(mapMensual.entries())
      .map(([mes, v]) => ({ mes, total: v.total, cantidad: v.cantidad }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-6)

    // Últimos abonos formateados
    const ultimos_abonos = abonosList.slice(0, 10).map((a: any) => {
      const rec = Array.isArray(a.recibos) ? a.recibos[0] : a.recibos
      const neg = a.negociaciones
      const principal = neg?.negociacion_clientes?.find((c: any) => c.es_principal) || neg?.negociacion_clientes?.[0]
      const cliData = Array.isArray(principal?.clientes) ? principal?.clientes[0] : principal?.clientes
      return {
        id: a.id,
        fecha_pago: a.fecha_pago,
        valor: Number(a.valor),
        medio: a.medio,
        estado: a.estado,
        recibo_numero: rec ? Number(rec.numero) : null,
        recibo_pdf: rec ? rec.pdf_path : null,
        negociacion_id: a.negociacion_id,
        codigo_venta: neg?.codigo_venta || '—',
        lote_codigo: neg?.lotes?.codigo || '—',
        proyecto_nombre: neg?.lotes?.proyectos?.nombre || '—',
        cliente_nombre: cliData?.nombres || null,
      }
    })

    return {
      kpis: {
        proyectos: proysActivos.length,
        activas: negsList.length,
        negociado: totalNegociado,
        recaudo: totalRecaudo,
        cartera,
        total_lotes: lotesList.length,
        disponibles,
        en_proceso: enProceso,
        vendidos,
      },
      mensual,
      por_proyecto,
      ultimos_abonos,
    }
  },

  async subirArchivo(_bucket: string, _path: string, _file: Blob) {
    return { ok: true }
  },

  async abrirArchivo(_bucket: string, _path: string) {
    alert('Función de almacenamiento disponible en la nube.')
  },

  async descargarArchivo(_bucket: string, _path: string, _nombreSugerido?: string) {
    alert('Función de almacenamiento disponible en la nube.')
  },
}

export const listarNegociaciones = () => api.negociaciones()
export const obtenerSaldos = (ids: string[]) => (ids.length ? api.saldos(ids) : Promise.resolve({} as Record<string, Saldos>))

export const principal = (n: NegociacionFila) =>
  (n.negociacion_clientes?.find((c) => c.es_principal) ?? n.negociacion_clientes?.[0])?.clientes

export const textoBusqueda = (n: NegociacionFila) =>
  [
    n.codigo_venta,
    n.lotes?.codigo,
    n.lotes?.proyectos?.nombre,
    ...(n.negociacion_clientes || []).flatMap((c) => [c.clientes?.nombres, c.clientes?.numero_documento]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
