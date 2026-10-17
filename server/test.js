// Pruebas de reglas financieras sobre una BD temporal. Uso: npm run test:api
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import assert from 'node:assert/strict'

const DB = 'server/data/test.db', PORT = 3999, API = `http://localhost:${PORT}/api`
for (const s of ['', '-wal', '-shm']) { try { rmSync(DB + s, { force: true }) } catch {} }
const srv = spawn('node', ['--disable-warning=ExperimentalWarning', 'server/index.js'], { env: { ...process.env, SERRANO_DB: DB, PORT, SERRANO_DEMO: '1' }, stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
const prueba = async (nombre, fn) => { try { await fn(); ok++; console.log('  ✔', nombre) } catch (e) { console.log('  ✘', nombre, '\n    ', e.message); process.exitCode = 1 } }

async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) })
  return { status: r.status, data: await r.json().catch(() => null) }
}
const login = async (email, clave) => (await call('POST', '/auth/login', null, { email, clave })).data.token

try {
  for (let i = 0; i < 30; i++) { try { await fetch(API + '/auth/me'); break } catch { await sleep(200) } }
  const admin = await login('admin@serrano.local', 'admin123')
  const cartera = await login('cartera@serrano.local', 'cartera123')
  const consulta = await login('consulta@serrano.local', 'consulta123')
  const neg = (await call('GET', '/negociaciones', admin)).data.find((n) => n.codigo_venta === 'V008')
  const abono = (token, o) => call('POST', '/abonos', token, { negociacion_id: neg.id, fecha: '2026-01-10', medio: 'transferencia', ...o })
  const saldo = async () => (await call('GET', `/saldos?ids=${neg.id}`, admin)).data[neg.id]
  console.log('Pruebas de reglas financieras')

  await prueba('Datos demo: V008 con $45.000.000 abonados', async () => {
    const s = await saldo(); assert.equal(s.total_recaudado, 45_000_000); assert.equal(s.saldo_pendiente, 45_000_000)
  })
  await prueba('Abono demo $5.000.000 → recaudado 50M, saldo 40M, recibo #1', async () => {
    const r = await abono(cartera, { valor: 5_000_000, idempotency_key: 'k1' })
    assert.equal(r.status, 200); assert.equal(r.data.numero, 1); assert.equal(r.data.saldo_nuevo, 40_000_000)
    const s = await saldo(); assert.equal(s.total_recaudado, 50_000_000); assert.equal(s.porcentaje_pagado, 55.56)
  })
  await prueba('Idempotencia: reintento con la misma clave no duplica', async () => {
    const r = await abono(cartera, { valor: 5_000_000, idempotency_key: 'k1' })
    assert.equal(r.data.repetido, true); assert.equal((await saldo()).total_recaudado, 50_000_000)
  })
  await prueba('Posible duplicado exige confirmación explícita', async () => {
    const a = await abono(cartera, { valor: 5_000_000, idempotency_key: 'k2' })
    assert.equal(a.status, 409); assert.match(a.data.error, /POSIBLE_DUPLICADO/)
    const b = await abono(cartera, { valor: 5_000_000, idempotency_key: 'k2', confirma_duplicado: true })
    assert.equal(b.status, 200); assert.equal((await saldo()).total_recaudado, 55_000_000)
  })
  await prueba('Excedente bloqueado para cartera', async () => {
    const r = await abono(cartera, { valor: 40_000_000, idempotency_key: 'k3', autoriza_excedente: true, motivo_excedente: 'x' })
    assert.equal(r.status, 409); assert.equal((await saldo()).total_recaudado, 55_000_000)
  })
  await prueba('Concurrencia: 8 abonos simultáneos de $10M sobre saldo $35M → solo 3 entran', async () => {
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => abono(cartera, { valor: 10_000_000, fecha: `2026-02-0${i + 1}`, idempotency_key: 'c' + i })))
    assert.equal(rs.filter((r) => r.status === 200).length, 3)
    const s = await saldo(); assert.equal(s.total_recaudado, 85_000_000); assert.ok(s.saldo_pendiente >= 0)
  })
  await prueba('Consulta no puede registrar abonos', async () => {
    assert.equal((await abono(consulta, { valor: 1000, idempotency_key: 'z' })).status, 403)
  })
  await prueba('Solo administrador anula; anulación recalcula el saldo y exige motivo', async () => {
    const lista = (await call('GET', `/negociaciones/${neg.id}/abonos`, admin)).data
    const ultimo = lista.find((a) => a.valor === 10_000_000)
    assert.equal((await call('POST', `/abonos/${ultimo.id}/anular`, cartera, { motivo: 'x' })).status, 403)
    assert.equal((await call('POST', `/abonos/${ultimo.id}/anular`, admin, { motivo: '' })).status, 400)
    assert.equal((await call('POST', `/abonos/${ultimo.id}/anular`, admin, { motivo: 'Error de digitación' })).status, 200)
    assert.equal((await saldo()).total_recaudado, 75_000_000)
    assert.equal((await call('POST', `/abonos/${ultimo.id}/anular`, admin, { motivo: 'otra vez' })).status, 409)
  })
  await prueba('Estado de cuenta: saldos históricos y fecha de corte', async () => {
    const todo = (await call('GET', `/negociaciones/${neg.id}/estado-cuenta`, admin)).data
    assert.equal(todo.at(-1).saldo_posterior, 15_000_000)
    const corte = (await call('GET', `/negociaciones/${neg.id}/estado-cuenta?corte=2026-01-31`, admin)).data
    assert.equal(corte.length, 2); assert.equal(corte.at(-1).saldo_posterior, 80_000_000)
  })
  await prueba('Excedente autorizado por administrador con motivo', async () => {
    const r = await abono(admin, { valor: 20_000_000, idempotency_key: 'k9', autoriza_excedente: true, motivo_excedente: 'Pago anticipado de mejoras' })
    assert.equal(r.status, 200); assert.equal((await saldo()).saldo_pendiente, -5_000_000)
  })
  await prueba('Negociaciones no admiten dos activas en el mismo lote', async () => {
    const p = (await call('GET', '/proyectos', admin)).data[0]
    const r = await call('POST', '/negociaciones', admin, { proyecto_id: p.id, codigo_lote: 'L-008', codigo_venta: 'V099', fecha: '2026-03-01', precio: 1000, documento: '1', nombres: 'X' })
    assert.equal(r.status, 409)
  })
  await prueba('Recibos inmutables a nivel de base de datos', async () => {
    const { DatabaseSync } = await import('node:sqlite')
    const d = new DatabaseSync(DB)
    assert.throws(() => d.exec('update recibos set valor_abono = 1'), /inmutables/)
    assert.throws(() => d.exec('delete from recibos'), /eliminarse/)
    assert.throws(() => d.exec('delete from abonos'), /no se eliminan/)
    d.close()
  })
  console.log(`\n${ok} pruebas correctas`)
} finally { srv.kill(); await sleep(500); for (const s of ['', '-wal', '-shm']) { try { rmSync(DB + s, { force: true }) } catch {} } }
