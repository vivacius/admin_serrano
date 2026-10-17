// API local de SERRANO: aplica las mismas reglas financieras que las funciones SQL de Supabase.
import express from 'express'
import { mkdirSync, writeFileSync, existsSync, createReadStream } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { db, uuid, hashClave, verificaClave } from './db.js'
import { resetearEImportar } from './reset_and_import.js'

const app = express()
app.use(express.json({ limit: '30mb' }))
const FILES = path.resolve('server/data/files')

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status } }
const wrap = (fn) => (req, res) => {
  try { res.json(fn(req, res) ?? { ok: true }) }
  catch (e) {
    const status = e.status ?? (String(e.message).includes('UNIQUE') ? 409 : 400)
    res.status(status).json({ error: e.message })
  }
}
const tx = (fn) => {
  db.exec('BEGIN IMMEDIATE')
  try { const r = fn(); db.exec('COMMIT'); return r } catch (e) { db.exec('ROLLBACK'); throw e }
}
const audit = (user, tabla, id, op, antes, despues, motivo) =>
  db.prepare('insert into auditoria_movimientos(tabla,registro_id,operacion,usuario_id,valores_anteriores,valores_nuevos,motivo) values (?,?,?,?,?,?,?)')
    .run(tabla, id, op, user?.id ?? null, antes ? JSON.stringify(antes) : null, despues ? JSON.stringify(despues) : null, motivo ?? null)
const hoy = () => db.prepare("select date('now','localtime') d").get().d

// ── Autenticación ──
function auth(req, _res, next) {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '') || req.query.token
  const u = token && db.prepare('select u.id,u.email,u.nombre,u.rol from sesiones s join usuarios u on u.id=s.usuario_id where s.token=? and u.activo=1').get(token)
  if (!u) return next(new HttpError(401, 'No autenticado'))
  req.user = u; next()
}
const exige = (user, ...roles) => { if (!roles.includes(user.rol)) throw new HttpError(403, 'Sin permiso para esta operación') }
const leeAbonos = (u) => exige(u, 'administrador', 'cartera', 'consulta')

app.post('/api/auth/login', wrap((req) => {
  const { email, clave } = req.body
  const u = db.prepare('select * from usuarios where email=? and activo=1').get(String(email ?? '').toLowerCase())
  if (!u || !verificaClave(String(clave ?? ''), u.clave_hash)) throw new HttpError(401, 'Credenciales inválidas')
  const token = randomBytes(24).toString('hex')
  db.prepare('insert into sesiones(token,usuario_id) values (?,?)').run(token, u.id)
  return { token, user: { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol } }
}))
app.use('/api', auth)
app.get('/api/auth/me', wrap((req) => req.user))
app.post('/api/auth/logout', wrap((req) => { db.prepare('delete from sesiones where token=?').run((req.headers.authorization ?? '').replace('Bearer ', '')) }))

// ── Proyectos ──
const bool = (o, ...ks) => { for (const k of ks) if (k in o) o[k] = !!o[k]; return o }
app.get('/api/proyectos', wrap(() => db.prepare('select * from proyectos order by nombre').all().map((p) => bool(p, 'activo'))))
const camposP = ['codigo', 'nombre', 'municipio', 'departamento', 'descripcion']
app.post('/api/proyectos', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const b = req.body; const id = uuid()
  if (!b.codigo?.trim() || !b.nombre?.trim()) throw new HttpError(400, 'Código y nombre son obligatorios')
  db.prepare('insert into proyectos(id,codigo,nombre,municipio,departamento,descripcion) values (?,?,?,?,?,?)')
    .run(id, b.codigo.trim().toUpperCase(), b.nombre.trim(), b.municipio || null, b.departamento || null, b.descripcion || null)
  audit(req.user, 'proyectos', id, 'INSERT', null, b)
  return { id }
}))
app.put('/api/proyectos/:id', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const antes = db.prepare('select * from proyectos where id=?').get(req.params.id)
  if (!antes) throw new HttpError(404, 'No existe')
  const b = { ...antes, ...req.body }
  db.prepare('update proyectos set codigo=?,nombre=?,municipio=?,departamento=?,descripcion=?,activo=? where id=?')
    .run(String(b.codigo).toUpperCase(), b.nombre, b.municipio || null, b.departamento || null, b.descripcion || null, b.activo ? 1 : 0, req.params.id)
  audit(req.user, 'proyectos', req.params.id, 'UPDATE', antes, b)
}))

// ── Lotes (Inventario comercial) ──
app.get('/api/lotes', wrap((req) => {
  const pid = req.query.proyecto_id
  const where = pid ? 'where l.proyecto_id = ?' : ''
  const args = pid ? [pid] : []
  const filas = db.prepare(`
    select l.id, l.proyecto_id, l.codigo, l.area_m2, l.activo,
           p.nombre as proyecto_nombre, p.codigo as proyecto_codigo,
           n.id as negociacion_activa_id, n.codigo_venta, n.estado as estado_negociacion,
           n.precio_acordado
    from lotes l
    join proyectos p on p.id = l.proyecto_id
    left join negociaciones n on n.lote_id = l.id and n.estado <> 'cancelado'
    ${where}
    order by p.nombre, l.codigo
  `).all(...args)

  const cls = db.prepare(`
    select nc.negociacion_id, c.nombres, c.numero_documento
    from negociacion_clientes nc
    join clientes c on c.id = nc.cliente_id
    where nc.es_principal = 1
  `).all()
  const cliMap = new Map(cls.map(c => [c.negociacion_id, c]))

  return filas.map(f => {
    const cli = f.negociacion_activa_id ? cliMap.get(f.negociacion_activa_id) : null
    return {
      id: f.id,
      proyecto_id: f.proyecto_id,
      proyecto_nombre: f.proyecto_nombre,
      proyecto_codigo: f.proyecto_codigo,
      codigo: f.codigo,
      area_m2: f.area_m2,
      activo: !!f.activo,
      negociacion_id: f.negociacion_activa_id,
      codigo_venta: f.codigo_venta,
      estado_comercial: f.estado_negociacion || 'disponible',
      precio_acordado: f.precio_acordado,
      comprador_principal: cli ? cli.nombres : null,
      comprador_documento: cli ? cli.numero_documento : null
    }
  })
}))

app.post('/api/importar-excel', wrap((req) => {
  exige(req.user, 'administrador')
  return resetearEImportar()
}))

// ── Clientes ──
app.get('/api/clientes', wrap(() => db.prepare('select * from clientes order by nombres limit 2000').all()))
const camposC = ['tipo_documento', 'numero_documento', 'nombres', 'telefono_principal', 'telefono_secundario', 'email', 'direccion', 'municipio', 'observaciones']
app.post('/api/clientes', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const b = req.body; const id = uuid()
  if (!b.numero_documento?.trim() || !b.nombres?.trim()) throw new HttpError(400, 'Documento y nombre son obligatorios')
  try {
    db.prepare(`insert into clientes(id,${camposC.join(',')}) values (?,${camposC.map(() => '?').join(',')})`)
      .run(id, ...camposC.map((k) => k === 'nombres' ? b[k].trim().toUpperCase() : (b[k]?.toString().trim() || (k === 'tipo_documento' ? 'CC' : null))))
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Ya existe un cliente con ese tipo y número de documento.'); throw e }
  audit(req.user, 'clientes', id, 'INSERT', null, b)
  return { id }
}))
app.put('/api/clientes/:id', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const antes = db.prepare('select * from clientes where id=?').get(req.params.id)
  if (!antes) throw new HttpError(404, 'No existe')
  const b = { ...antes, ...req.body }
  try {
    db.prepare(`update clientes set ${camposC.map((k) => k + '=?').join(',')} where id=?`)
      .run(...camposC.map((k) => k === 'nombres' ? b[k].trim().toUpperCase() : (b[k]?.toString().trim() || null)), req.params.id)
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Ya existe un cliente con ese tipo y número de documento.'); throw e }
  audit(req.user, 'clientes', req.params.id, 'UPDATE', antes, b)
}))

// ── Negociaciones ──
function negociacionesFila(where = '', ...args) {
  const filas = db.prepare(`select n.*, l.id lid, l.codigo lcodigo, l.area_m2, p.id pid, p.nombre pnombre, p.codigo pcodigo
    from negociaciones n join lotes l on l.id=n.lote_id join proyectos p on p.id=l.proyecto_id ${where} order by n.fecha_negociacion desc, n.codigo_venta desc limit 1000`).all(...args)
  const cls = db.prepare('select nc.es_principal, c.* from negociacion_clientes nc join clientes c on c.id=nc.cliente_id where nc.negociacion_id=?')
  return filas.map((f) => ({
    id: f.id, codigo_venta: f.codigo_venta, fecha_negociacion: f.fecha_negociacion, precio_acordado: f.precio_acordado,
    cuota_inicial_pactada: f.cuota_inicial_pactada, vendedor: f.vendedor, estado: f.estado, observaciones: f.observaciones,
    lotes: { id: f.lid, codigo: f.lcodigo, area_m2: f.area_m2, proyectos: { id: f.pid, nombre: f.pnombre, codigo: f.pcodigo } },
    negociacion_clientes: cls.all(f.id).map(({ es_principal, ...cliente }) => ({ es_principal: !!es_principal, clientes: cliente })),
  }))
}
app.get('/api/negociaciones', wrap(() => negociacionesFila()))

const saldoDe = (id) => {
  const n = db.prepare('select precio_acordado p from negociaciones where id=?').get(id)
  const a = db.prepare("select coalesce(sum(valor),0) t, max(fecha_pago) f from abonos where negociacion_id=? and estado='vigente'").get(id)
  return {
    negociacion_id: id, total_recaudado: a.t, saldo_pendiente: n.p - a.t,
    porcentaje_pagado: Math.round((a.t / n.p) * 10000) / 100, fecha_ultimo_abono: a.f,
    dias_desde_ultimo_abono: a.f ? db.prepare("select cast(julianday(date('now','localtime')) - julianday(?) as integer) d").get(a.f).d : null,
  }
}
app.get('/api/saldos', wrap((req) => {
  const ids = String(req.query.ids ?? '').split(',').filter(Boolean)
  return Object.fromEntries(ids.map((id) => [id, saldoDe(id)]))
}))

app.post('/api/negociaciones', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const b = req.body
  if (!b.proyecto_id || !b.codigo_lote?.trim() || !b.codigo_venta?.trim()) throw new HttpError(400, 'Proyecto, lote y código de venta son obligatorios')
  if (!(Number(b.precio) > 0)) throw new HttpError(400, 'El precio acordado debe ser mayor a cero')
  if (!b.documento?.trim() || !b.nombres?.trim()) throw new HttpError(400, 'El comprador es obligatorio')
  return tx(() => {
    let lote = db.prepare('select id from lotes where proyecto_id=? and codigo=?').get(b.proyecto_id, b.codigo_lote.trim())
    if (!lote) { lote = { id: uuid() }; db.prepare('insert into lotes(id,proyecto_id,codigo) values (?,?,?)').run(lote.id, b.proyecto_id, b.codigo_lote.trim()) }
    let cli = b.cliente_id ? db.prepare('select id from clientes where id=?').get(b.cliente_id) : null
    if (!cli) {
      cli = db.prepare('select id from clientes where tipo_documento=? and numero_documento=?').get(b.tipo_doc ?? 'CC', b.documento.trim())
    }
    if (!cli) {
      cli = { id: uuid() }
      db.prepare('insert into clientes(id,tipo_documento,numero_documento,nombres,telefono_principal,email) values (?,?,?,?,?,?)')
        .run(cli.id, b.tipo_doc ?? 'CC', b.documento.trim(), b.nombres.trim().toUpperCase(), b.telefono || null, b.email || null)
    }
    const id = uuid()
    try {
      db.prepare('insert into negociaciones(id,codigo_venta,lote_id,fecha_negociacion,precio_acordado,cuota_inicial_pactada,vendedor,observaciones,estado,created_by) values (?,?,?,?,?,?,?,?,?,?)')
        .run(id, b.codigo_venta.trim(), lote.id, b.fecha, Math.round(Number(b.precio)), b.cuota === '' || b.cuota == null ? null : Math.round(Number(b.cuota)),
          b.vendedor || null, b.observaciones || null, b.estado ?? 'en_negociacion', req.user.id)
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'Código de venta repetido, o el lote ya tiene una negociación activa.')
      throw e
    }
    db.prepare('insert into negociacion_clientes values (?,?,1)').run(id, cli.id)
    audit(req.user, 'negociaciones', id, 'INSERT', null, b)
    return { id }
  })
}))

app.put('/api/negociaciones/:id', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const antes = db.prepare('select * from negociaciones where id=?').get(req.params.id)
  if (!antes) throw new HttpError(404, 'Negociación no encontrada')
  const b = req.body
  const precio = b.precio_acordado !== undefined ? Math.round(Number(b.precio_acordado)) : antes.precio_acordado
  if (precio <= 0) throw new HttpError(400, 'El precio acordado debe ser mayor a cero')
  const cuota = b.cuota_inicial_pactada !== undefined ? (b.cuota_inicial_pactada === '' || b.cuota_inicial_pactada == null ? null : Math.round(Number(b.cuota_inicial_pactada))) : antes.cuota_inicial_pactada
  const vendedor = b.vendedor !== undefined ? (b.vendedor || null) : antes.vendedor
  const observaciones = b.observaciones !== undefined ? (b.observaciones || null) : antes.observaciones
  const estado = b.estado !== undefined ? b.estado : antes.estado

  const rec = db.prepare("select coalesce(sum(valor),0) t from abonos where negociacion_id=? and estado='vigente'").get(antes.id).t
  if (precio < rec && req.user.rol !== 'administrador') {
    throw new HttpError(409, `El precio ($${precio}) no puede ser menor al recaudo acumulado ($${rec}).`)
  }

  return tx(() => {
    db.prepare('update negociaciones set precio_acordado=?, cuota_inicial_pactada=?, vendedor=?, observaciones=?, estado=? where id=?')
      .run(precio, cuota, vendedor, observaciones, estado, req.params.id)
    audit(req.user, 'negociaciones', req.params.id, 'UPDATE', antes, { precio, cuota, vendedor, observaciones, estado })
    return { ok: true }
  })
}))

app.delete('/api/negociaciones/:id', wrap((req) => {
  exige(req.user, 'administrador')
  const neg = db.prepare('select * from negociaciones where id=?').get(req.params.id)
  if (!neg) throw new HttpError(404, 'Negociación no encontrada')
  const abonosCount = db.prepare('select count(*) c from abonos where negociacion_id=?').get(req.params.id).c
  const force = req.query.force === 'true' || req.body?.force === true

  if (abonosCount > 0 && !force) {
    throw new HttpError(409, `Esta negociación tiene ${abonosCount} abono(s). Para eliminar una negociación demo o cancelada con abonos, confirme la eliminación definitiva.`)
  }

  return tx(() => {
    db.prepare("update contadores set valor = 1 where nombre = 'admin_delete'").run()
    try {
      db.prepare('delete from compromisos_pago where negociacion_id=?').run(req.params.id)

      const com = db.prepare('select id from comisiones where negociacion_id=?').get(req.params.id)
      if (com) {
        db.prepare('delete from pagos_comisiones where comision_id=?').run(com.id)
        db.prepare('delete from comisiones where id=?').run(com.id)
      }

      const abonos = db.prepare('select id from abonos where negociacion_id=?').all(req.params.id)
      for (const a of abonos) {
        db.prepare('delete from recibos where abono_id=?').run(a.id)
      }
      db.prepare('delete from abonos where negociacion_id=?').run(req.params.id)

      db.prepare('delete from documentos where negociacion_id=?').run(req.params.id)
      db.prepare('delete from negociacion_clientes where negociacion_id=?').run(req.params.id)
      db.prepare('delete from negociaciones where id=?').run(req.params.id)
      audit(req.user, 'negociaciones', req.params.id, 'DELETE', neg, null, 'Eliminación administrativa de negociación')
      return { ok: true, deleted: req.params.id }
    } finally {
      db.prepare("update contadores set valor = 0 where nombre = 'admin_delete'").run()
    }
  })
}))

// ── Abonos ──
app.post('/api/abonos', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const b = req.body
  const valor = Number(b.valor)
  if (!Number.isInteger(valor) || valor <= 0) throw new HttpError(400, 'El valor debe ser un número entero de pesos mayor a cero')
  if (!b.fecha) throw new HttpError(400, 'La fecha es obligatoria')
  if (b.fecha > hoy()) throw new HttpError(400, 'La fecha del pago no puede ser futura')
  if (!['efectivo', 'transferencia', 'consignacion', 'otro'].includes(b.medio)) throw new HttpError(400, 'El medio de pago es obligatorio')
  if (!b.idempotency_key) throw new HttpError(400, 'Falta la clave de idempotencia')

  return tx(() => {
    const previo = db.prepare('select a.id abono_id, r.id recibo_id, r.numero from abonos a left join recibos r on r.abono_id=a.id where a.idempotency_key=?').get(b.idempotency_key)
    if (previo) return { ...previo, repetido: true }

    const neg = db.prepare('select * from negociaciones where id=?').get(b.negociacion_id)
    if (!neg) throw new HttpError(404, 'Negociación no existe')
    if (['cancelado', 'finalizado'].includes(neg.estado)) throw new HttpError(409, `La negociación está ${neg.estado} y no admite abonos`)

    const prev = saldoDe(neg.id).total_recaudado
    const excede = prev + valor > neg.precio_acordado
    if (excede && !(b.autoriza_excedente && req.user.rol === 'administrador' && b.motivo_excedente?.trim()))
      throw new HttpError(409, `El abono supera el saldo pendiente (${neg.precio_acordado - prev}). Requiere autorización de un administrador con motivo.`)

    const ref = b.referencia?.trim() || null
    const dup = db.prepare("select 1 from abonos where negociacion_id=? and estado='vigente' and fecha_pago=? and valor=? and medio=? and referencia is ?")
      .get(neg.id, b.fecha, valor, b.medio, ref)
    if (dup && !b.confirma_duplicado) throw new HttpError(409, 'POSIBLE_DUPLICADO: ya existe un abono idéntico en esta negociación. Confirme para registrarlo.')

    const abonoId = uuid()
    db.prepare(`insert into abonos(id,negociacion_id,fecha_pago,valor,medio,banco,referencia,observaciones,comprobante_path,idempotency_key,created_by,excedente_autorizado_por,excedente_motivo)
      values (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(abonoId, neg.id, b.fecha, valor, b.medio, b.banco?.trim() || null, ref, b.observaciones || null,
      b.comprobante_path || null, b.idempotency_key, req.user.id, excede ? req.user.id : null, excede ? b.motivo_excedente : null)

    db.prepare("update contadores set valor = valor + 1 where nombre='recibos'").run()
    const numero = db.prepare("select valor v from contadores where nombre='recibos'").get().v
    const reciboId = uuid()
    db.prepare('insert into recibos(id,numero,abono_id,total_anterior,valor_abono,total_acumulado,saldo_nuevo,created_by) values (?,?,?,?,?,?,?,?)')
      .run(reciboId, numero, abonoId, prev, valor, prev + valor, neg.precio_acordado - (prev + valor), req.user.id)
    audit(req.user, 'abonos', abonoId, 'INSERT', null, { ...b, valor })
    return { abono_id: abonoId, recibo_id: reciboId, numero, saldo_nuevo: neg.precio_acordado - (prev + valor), repetido: false }
  })
}))

app.get('/api/recibos/:id', wrap((req) => { leeAbonos(req.user); return db.prepare('select * from recibos where id=?').get(req.params.id) }))
app.post('/api/recibos/:id/pdf', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  const r = db.prepare('select * from recibos where id=?').get(req.params.id)
  if (!r) throw new HttpError(404, 'No existe')
  if (r.pdf_path) return { pdf_path: r.pdf_path } // inmutable: solo se asigna una vez
  guardaArchivo('recibos', req.body.path, req.body.base64)
  db.prepare('update recibos set pdf_path=? where id=?').run(req.body.path, req.params.id)
  return { pdf_path: req.body.path }
}))

app.get('/api/negociaciones/:id/abonos', wrap((req) => {
  leeAbonos(req.user)
  return db.prepare(`select a.*, r.numero recibo_numero, r.pdf_path recibo_pdf from abonos a left join recibos r on r.abono_id=a.id
    where a.negociacion_id=? order by a.fecha_pago is null, a.fecha_pago, a.created_at`).all(req.params.id)
    .map((a) => ({ ...bool(a, 'pendiente_completar'), recibos: a.recibo_numero ? { numero: a.recibo_numero, pdf_path: a.recibo_pdf } : null }))
}))
app.post('/api/abonos/:id/anular', wrap((req) => {
  exige(req.user, 'administrador')
  if (!req.body.motivo?.trim()) throw new HttpError(400, 'El motivo es obligatorio')
  tx(() => {
    const a = db.prepare('select * from abonos where id=?').get(req.params.id)
    if (!a || a.estado !== 'vigente') throw new HttpError(409, 'Abono inexistente o ya anulado')
    db.prepare("update abonos set estado='anulado', anulado_por=?, anulado_at=datetime('now'), motivo_anulacion=? where id=?").run(req.user.id, req.body.motivo, a.id)
    audit(req.user, 'abonos', a.id, 'ANULACION', a, null, req.body.motivo)
  })
}))
app.get('/api/negociaciones/:id/estado-cuenta', wrap((req) => {
  leeAbonos(req.user)
  const corte = req.query.corte || hoy()
  return db.prepare(`select a.id abono_id, a.fecha_pago fecha, r.numero recibo_numero, a.medio, a.referencia, a.valor,
      n.precio_acordado - sum(a.valor) over (order by a.fecha_pago is null, a.fecha_pago, a.created_at, a.id) saldo_posterior, a.pendiente_completar
    from abonos a join negociaciones n on n.id=a.negociacion_id left join recibos r on r.abono_id=a.id
    where a.negociacion_id=? and a.estado='vigente' and (a.fecha_pago is null or a.fecha_pago <= ?)
    order by a.fecha_pago is null, a.fecha_pago, a.created_at, a.id`).all(req.params.id, corte).map((m) => bool(m, 'pendiente_completar'))
}))

app.get('/api/negociaciones/:id/comision', wrap((req) => {
  const c = db.prepare('select c.*, cm.nombre comisionista from comisiones c join comisionistas cm on cm.id=c.comisionista_id where c.negociacion_id=?').get(req.params.id)
  if (!c) return null
  const pagado = db.prepare("select coalesce(sum(valor),0) t from pagos_comisiones where comision_id=? and estado='vigente'").get(c.id).t
  return { ...c, pagado }
}))
app.get('/api/negociaciones/:id/documentos', wrap((req) => db.prepare('select * from documentos where negociacion_id=?').all(req.params.id)))

app.get('/api/kpis', wrap(() => {
  const proyectos = db.prepare('select count(*) n from proyectos where activo=1').get().n
  const filas = db.prepare(`select n.precio_acordado, n.estado, coalesce(sum(a.valor) filter (where a.estado='vigente'),0) rec
    from negociaciones n left join abonos a on a.negociacion_id=n.id group by n.id`).all()
  const vivas = filas.filter((f) => f.estado !== 'cancelado')
  const sum = (f) => vivas.reduce((s, x) => s + f(x), 0)
  return { proyectos, activas: vivas.length, negociado: sum((x) => x.precio_acordado), recaudo: sum((x) => x.rec), cartera: sum((x) => x.precio_acordado - x.rec) }
}))

app.get('/api/dashboard', wrap(() => {
  const proyectos = db.prepare('select count(*) n from proyectos where activo=1').get().n
  const lotesTotales = db.prepare('select count(*) n from lotes').get().n

  const filas = db.prepare(`select n.id, n.precio_acordado, n.estado, coalesce(sum(a.valor) filter (where a.estado='vigente'),0) rec
    from negociaciones n left join abonos a on a.negociacion_id=n.id group by n.id`).all()
  const vivas = filas.filter((f) => f.estado !== 'cancelado')
  const sum = (f) => vivas.reduce((s, x) => s + f(x), 0)

  const negociado = sum((x) => x.precio_acordado)
  const recaudo = sum((x) => x.rec)
  const cartera = sum((x) => x.precio_acordado - x.rec)

  // Distribución de lotes
  const lotesEst = db.prepare(`
    select 
      count(*) total,
      count(*) filter (where n.id is null or n.estado = 'cancelado') disponibles,
      count(*) filter (where n.estado in ('en_negociacion', 'separado')) en_proceso,
      count(*) filter (where n.estado in ('vendido', 'escriturado', 'finalizado')) vendidos
    from lotes l
    left join negociaciones n on n.lote_id = l.id and n.estado != 'cancelado'
  `).get()

  // Recaudo mensual
  const mensual = db.prepare(`
    select 
      strftime('%Y-%m', fecha_pago) mes,
      sum(valor) total,
      count(*) cantidad
    from abonos
    where estado = 'vigente' and fecha_pago is not null
    group by strftime('%Y-%m', fecha_pago)
    order by mes asc
    limit 12
  `).all()

  // Recaudo y cartera por proyecto (usando CTE para evitar duplicar el precio acordado con múltiples abonos)
  const porProyecto = db.prepare(`
    with neg_summary as (
      select 
        n.id,
        l.proyecto_id,
        n.precio_acordado,
        coalesce(sum(a.valor) filter (where a.estado = 'vigente'), 0) recaudo
      from lotes l
      join negociaciones n on n.lote_id = l.id and n.estado != 'cancelado'
      left join abonos a on a.negociacion_id = n.id
      group by n.id
    )
    select 
      p.id, p.nombre, p.codigo,
      (select count(*) from lotes where proyecto_id = p.id) as total_lotes,
      count(ns.id) as negociaciones_activas,
      coalesce(sum(ns.precio_acordado), 0) as negociado,
      coalesce(sum(ns.recaudo), 0) as recaudo,
      coalesce(sum(ns.precio_acordado) - sum(ns.recaudo), 0) as cartera
    from proyectos p
    left join neg_summary ns on ns.proyecto_id = p.id
    where p.activo = 1
    group by p.id
    order by p.nombre
  `).all()

  // Últimos 6 abonos registrados
  const ultimosAbonos = db.prepare(`
    select 
      a.id, a.fecha_pago, a.valor, a.medio, a.estado,
      r.numero recibo_numero, r.pdf_path recibo_pdf,
      n.id negociacion_id, n.codigo_venta,
      l.codigo lote_codigo,
      p.nombre proyecto_nombre,
      c.nombres cliente_nombre
    from abonos a
    join negociaciones n on n.id = a.negociacion_id
    join lotes l on l.id = n.lote_id
    join proyectos p on p.id = l.proyecto_id
    left join recibos r on r.abono_id = a.id
    left join negociacion_clientes nc on nc.negociacion_id = n.id and nc.es_principal = 1
    left join clientes c on c.id = nc.cliente_id
    order by a.created_at desc
    limit 6
  `).all()

  return {
    kpis: {
      proyectos,
      activas: vivas.length,
      negociado,
      recaudo,
      cartera,
      total_lotes: lotesTotales,
      disponibles: lotesEst?.disponibles ?? 0,
      en_proceso: lotesEst?.en_proceso ?? 0,
      vendidos: lotesEst?.vendidos ?? 0
    },
    mensual,
    por_proyecto: porProyecto,
    ultimos_abonos: ultimosAbonos
  }
}))

// ── Archivos (reemplaza Supabase Storage en local) ──
function rutaSegura(bucket, p) {
  if (!['comprobantes', 'recibos', 'documentos'].includes(bucket)) throw new HttpError(400, 'Bucket inválido')
  const full = path.resolve(FILES, bucket, p)
  if (!full.startsWith(path.resolve(FILES, bucket) + path.sep)) throw new HttpError(400, 'Ruta inválida')
  return full
}
function guardaArchivo(bucket, p, base64) {
  const full = rutaSegura(bucket, p)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, Buffer.from(base64, 'base64'))
}
app.post('/api/files', wrap((req) => {
  exige(req.user, 'administrador', 'cartera')
  guardaArchivo(req.body.bucket, req.body.path, req.body.base64); return { path: req.body.path }
}))
app.get('/api/files', (req, res) => {
  try {
    leeAbonos(req.user)
    const full = rutaSegura(req.query.bucket, String(req.query.path))
    if (!existsSync(full)) return res.status(404).json({ error: 'Archivo no encontrado' })
    const ext = path.extname(full).toLowerCase()
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(full))}"`)
    createReadStream(full).pipe(res)
  } catch (e) { res.status(e.status ?? 400).json({ error: e.message }) }
})

app.use((e, _req, res, _next) => res.status(e.status ?? 500).json({ error: e.message }))
const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`API SERRANO local en http://localhost:${PORT} (SQLite: server/data/serrano.db)`))
