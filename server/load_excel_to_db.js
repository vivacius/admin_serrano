import { readFileSync, existsSync } from 'node:fs'
import { db, uuid } from './db.js'

export function importarDatosExcel(filePath = 'server/data/excel_dump.json') {
  if (!existsSync(filePath)) {
    throw new Error(`Archivo ${filePath} no encontrado. Ejecuta primero la extracción.`)
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
  const { proyectos, lotes, ventas, abonos } = raw

  db.exec('BEGIN IMMEDIATE')
  try {
    // 1. Proyectos
    const insProy = db.prepare(`
      insert into proyectos(id, codigo, nombre, municipio, departamento, activo)
      values (?, ?, ?, ?, ?, 1)
      on conflict(codigo) do update set
        nombre = excluded.nombre,
        municipio = excluded.municipio
    `)
    const proyMap = new Map() // codigo -> id

    for (const p of proyectos) {
      const cod = p.codigo === 'AMA' || p.codigo === 'AMA' ? 'AMA' : p.codigo
      const existing = db.prepare('select id from proyectos where codigo = ?').get(cod)
      const id = existing?.id || uuid()
      insProy.run(id, cod, p.nombre, p.municipio, p.departamento || 'Valle del Cauca')
      proyMap.set(p.codigo, id)
      proyMap.set(cod, id)
      if (cod === 'AMA') proyMap.set('Ama', id)
    }

    const amaId = proyMap.get('AMA') || proyMap.get('Ama')

    // 2. Lotes (los 99 lotes de Amaranta con sus áreas)
    const insLote = db.prepare(`
      insert into lotes(id, proyecto_id, codigo, area_m2, activo)
      values (?, ?, ?, ?, 1)
      on conflict(proyecto_id, codigo) do update set
        area_m2 = excluded.area_m2
    `)
    const loteMap = new Map() // 'proyectoId:codigo' -> id

    for (const l of lotes) {
      const pid = proyMap.get(l.id_proy) || amaId
      const key = `${pid}:${l.codigo}`
      const existing = db.prepare('select id from lotes where proyecto_id = ? and codigo = ?').get(pid, l.codigo)
      const id = existing?.id || uuid()
      insLote.run(id, pid, l.codigo, l.area_m2 || null)
      loteMap.set(key, id)
    }

    // 3. Clientes y Ventas
    const insCliente = db.prepare(`
      insert into clientes(id, tipo_documento, numero_documento, nombres, telefono_principal, email, direccion)
      values (?, 'CC', ?, ?, ?, ?, ?)
      on conflict(tipo_documento, numero_documento) do update set
        nombres = excluded.nombres,
        telefono_principal = coalesce(excluded.telefono_principal, clientes.telefono_principal),
        email = coalesce(excluded.email, clientes.email),
        direccion = coalesce(excluded.direccion, clientes.direccion)
    `)

    const insNeg = db.prepare(`
      insert into negociaciones(id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, observaciones, estado, id_origen)
      values (?, ?, ?, ?, ?, ?, ?, 'vendido', ?)
      on conflict(codigo_venta) do update set
        precio_acordado = excluded.precio_acordado,
        cuota_inicial_pactada = excluded.cuota_inicial_pactada,
        observaciones = excluded.observaciones
    `)

    const insNegCli = db.prepare(`
      insert or ignore into negociacion_clientes(negociacion_id, cliente_id, es_principal)
      values (?, ?, 1)
    `)

    const ventaMap = new Map() // codigo_venta -> id

    for (const v of ventas) {
      const pid = proyMap.get(v.id_proy) || amaId
      const loteId = loteMap.get(`${pid}:${v.codigo_lote}`)
      if (!loteId) continue

      // Asegurar cliente
      const existingCli = db.prepare("select id from clientes where tipo_documento = 'CC' and numero_documento = ?").get(v.cedula)
      const cliId = existingCli?.id || uuid()
      insCliente.run(cliId, v.cedula, v.comprador.toUpperCase(), v.telefono || null, v.email || null, v.direccion || null)

      // Negociacion
      const existingNeg = db.prepare('select id from negociaciones where codigo_venta = ?').get(v.codigo_venta)
      const negId = existingNeg?.id || uuid()
      insNeg.run(
        negId,
        v.codigo_venta,
        loteId,
        v.fecha,
        Math.round(v.valor),
        v.cuota_inicial ? Math.round(v.cuota_inicial) : null,
        v.observaciones || null,
        v.codigo_venta
      )
      insNegCli.run(negId, cliId)
      ventaMap.set(v.codigo_venta, negId)
    }

    // 4. Abonos
    const insAbono = db.prepare(`
      insert into abonos(id, negociacion_id, fecha_pago, valor, medio, referencia, observaciones, estado, pendiente_completar, id_origen)
      values (?, ?, ?, ?, ?, ?, ?, 'vigente', ?, ?)
      on conflict(idempotency_key) do nothing
    `)

    let abonosInsertados = 0
    for (const a of abonos) {
      const negId = ventaMap.get(a.codigo_venta)
      if (!negId) continue

      // Comprobar si ya existe por id_origen
      const existingAbono = db.prepare('select id from abonos where id_origen = ?').get(a.id_abono)
      if (existingAbono) continue

      const abonoId = uuid()
      insAbono.run(
        abonoId,
        negId,
        a.fecha || null,
        Math.round(a.valor),
        a.medio || null,
        a.referencia || null,
        a.observaciones || null,
        a.pendiente_completar ? 1 : 0,
        a.id_abono
      )

      // Recibo
      db.prepare("update contadores set valor = valor + 1 where nombre='recibos'").run()
      const numRecibo = db.prepare("select valor from contadores where nombre='recibos'").get().valor

      // Total acumulado y saldo previo
      const nRow = db.prepare('select precio_acordado from negociaciones where id = ?').get(negId)
      const prevSum = db.prepare("select coalesce(sum(valor),0) s from abonos where negociacion_id = ? and estado = 'vigente' and id <> ?").get(negId, abonoId).s
      const acum = prevSum + Math.round(a.valor)
      const saldoN = nRow.precio_acordado - acum

      db.prepare(`
        insert into recibos(id, numero, abono_id, total_anterior, valor_abono, total_acumulado, saldo_nuevo)
        values (?, ?, ?, ?, ?, ?, ?)
      `).run(uuid(), numRecibo, abonoId, prevSum, Math.round(a.valor), acum, saldoN)

      abonosInsertados++
    }

    db.exec('COMMIT')
    return {
      success: true,
      proyectosCount: proyectos.length,
      lotesCount: lotes.length,
      ventasCount: ventas.length,
      abonosCount: abonosInsertados
    }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// Si se ejecuta directamente por CLI
if (process.argv[1]?.endsWith('load_excel_to_db.js')) {
  console.log('Iniciando importación a SQLite...')
  const res = importarDatosExcel()
  console.log('Resultado:', res)
}
