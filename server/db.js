// Base SQLite local de SERRANO (node:sqlite). Espejo del modelo PostgreSQL de supabase/migrations.
// Diferencias: montos como INTEGER (pesos COP exactos), UUID generados en JS, reglas en server/index.js.
import { DatabaseSync } from 'node:sqlite'
import { randomUUID, scryptSync, randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const dir = path.resolve('server/data')
mkdirSync(dir, { recursive: true })
export const db = new DatabaseSync(process.env.SERRANO_DB ?? path.join(dir, 'serrano.db'))
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

export const uuid = () => randomUUID()
export function hashClave(clave, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(clave, salt, 32).toString('hex')}`
}
export function verificaClave(clave, guardado) {
  const [salt] = guardado.split(':')
  return hashClave(clave, salt) === guardado
}

db.exec(`
create table if not exists usuarios (
  id text primary key, email text not null unique, clave_hash text not null, nombre text not null,
  rol text not null check (rol in ('administrador','cartera','comercial','consulta')),
  activo integer not null default 1);
create table if not exists sesiones (token text primary key, usuario_id text not null references usuarios(id), created_at text not null default (datetime('now')));

create table if not exists proyectos (
  id text primary key, codigo text not null unique, nombre text not null, municipio text, departamento text,
  descripcion text, activo integer not null default 1, id_origen text, created_at text not null default (datetime('now')));

create table if not exists clientes (
  id text primary key, tipo_documento text not null default 'CC', numero_documento text not null, nombres text not null,
  telefono_principal text, telefono_secundario text, email text, direccion text, municipio text, observaciones text,
  created_at text not null default (datetime('now')), unique (tipo_documento, numero_documento));

create table if not exists lotes (
  id text primary key, proyecto_id text not null references proyectos(id), codigo text not null,
  area_m2 real check (area_m2 is null or area_m2 > 0), id_externo text, activo integer not null default 1,
  created_at text not null default (datetime('now')), unique (proyecto_id, codigo));

create table if not exists comisionistas (
  id text primary key, nombre text not null, documento text unique, telefono text, porcentaje_defecto real, activo integer not null default 1);

create table if not exists negociaciones (
  id text primary key, codigo_venta text not null unique, lote_id text not null references lotes(id),
  fecha_negociacion text not null, precio_acordado integer not null check (precio_acordado > 0),
  cuota_inicial_pactada integer check (cuota_inicial_pactada is null or cuota_inicial_pactada >= 0),
  vendedor text, comisionista_id text references comisionistas(id), porcentaje_comision real, observaciones text,
  estado text not null default 'en_negociacion' check (estado in ('en_negociacion','separado','vendido','cancelado','finalizado')),
  id_origen text, created_by text, created_at text not null default (datetime('now')));
create unique index if not exists negociacion_activa_por_lote on negociaciones(lote_id) where estado <> 'cancelado';

create table if not exists negociacion_clientes (
  negociacion_id text not null references negociaciones(id), cliente_id text not null references clientes(id),
  es_principal integer not null default 0, primary key (negociacion_id, cliente_id));
create unique index if not exists un_principal_por_negociacion on negociacion_clientes(negociacion_id) where es_principal = 1;

create table if not exists abonos (
  id text primary key, negociacion_id text not null references negociaciones(id), fecha_pago text,
  valor integer not null check (valor > 0), medio text check (medio in ('efectivo','transferencia','consignacion','otro')),
  banco text, referencia text, observaciones text, comprobante_path text,
  estado text not null default 'vigente' check (estado in ('vigente','anulado')),
  pendiente_completar integer not null default 0, excedente_autorizado_por text, excedente_motivo text,
  idempotency_key text unique, anulado_por text, anulado_at text, motivo_anulacion text, id_origen text,
  created_by text, created_at text not null default (datetime('now')),
  check (estado = 'vigente' or (motivo_anulacion is not null and anulado_por is not null)),
  check (pendiente_completar = 1 or (fecha_pago is not null and medio is not null)));
create index if not exists abonos_neg_idx on abonos(negociacion_id, fecha_pago);

create table if not exists recibos (
  id text primary key, numero integer not null unique, abono_id text not null unique references abonos(id),
  fecha_emision text not null default (datetime('now')), total_anterior integer not null, valor_abono integer not null,
  total_acumulado integer not null, saldo_nuevo integer not null, pdf_path text, created_by text);

create table if not exists contadores (nombre text primary key, valor integer not null);
insert or ignore into contadores values ('recibos', 0);
insert or ignore into contadores values ('admin_delete', 0);

create table if not exists comisiones (
  id text primary key, negociacion_id text not null unique references negociaciones(id),
  comisionista_id text not null references comisionistas(id), porcentaje real,
  valor_comision integer not null check (valor_comision >= 0), aplica integer not null default 1, id_origen text);
create table if not exists pagos_comisiones (
  id text primary key, comision_id text not null references comisiones(id), fecha text not null,
  valor integer not null check (valor > 0), medio text, referencia text, observaciones text,
  estado text not null default 'vigente', motivo_anulacion text, created_by text, created_at text not null default (datetime('now')));

create table if not exists documentos (
  id text primary key, categoria text not null, nombre text not null, storage_path text not null,
  version integer not null default 1, cliente_id text, negociacion_id text, lote_id text, created_by text,
  created_at text not null default (datetime('now')));

create table if not exists compromisos_pago (
  id text primary key, negociacion_id text not null references negociaciones(id), fecha_compromiso text not null,
  valor integer, nota text, cumplido integer not null default 0, created_by text, created_at text not null default (datetime('now')));

create table if not exists auditoria_movimientos (
  id integer primary key autoincrement, tabla text not null, registro_id text, operacion text not null,
  usuario_id text, fecha text not null default (datetime('now')), valores_anteriores text, valores_nuevos text, motivo text);

-- Inmutabilidad con bypass administrativo seguro
create trigger if not exists recibos_no_update before update on recibos
  when old.pdf_path is not null or new.numero <> old.numero or new.abono_id <> old.abono_id
    or new.valor_abono <> old.valor_abono or new.total_acumulado <> old.total_acumulado or new.saldo_nuevo <> old.saldo_nuevo
begin select raise(abort, 'Los recibos emitidos son inmutables'); end;

drop trigger if exists recibos_no_delete;
create trigger recibos_no_delete before delete on recibos
  when (select coalesce(valor, 0) from contadores where nombre = 'admin_delete') <> 1
begin select raise(abort, 'Los recibos no pueden eliminarse'); end;

drop trigger if exists abonos_no_delete;
create trigger abonos_no_delete before delete on abonos
  when (select coalesce(valor, 0) from contadores where nombre = 'admin_delete') <> 1
begin select raise(abort, 'Los abonos no se eliminan; use anulacion auditada'); end;

create trigger if not exists abonos_protegidos before update on abonos
  when new.valor <> old.valor or new.negociacion_id <> old.negociacion_id or old.estado = 'anulado'
    or (old.pendiente_completar = 0 and new.estado = 'vigente' and (new.fecha_pago is not old.fecha_pago or new.medio is not old.medio))
begin select raise(abort, 'Abono protegido: corrija mediante anulacion'); end;
`)

// ── Usuarios del sistema ──
if (db.prepare('select count(*) n from usuarios').get().n === 0) {
  const ins = (sql, ...a) => db.prepare(sql).run(...a)
  ins('insert into usuarios(id,email,clave_hash,nombre,rol) values (?,?,?,?,?)', uuid(), 'admin@serrano.local', hashClave('admin123'), 'Administrador Demo', 'administrador')
  ins('insert into usuarios(id,email,clave_hash,nombre,rol) values (?,?,?,?,?)', uuid(), 'cartera@serrano.local', hashClave('cartera123'), 'Cartera Demo', 'cartera')
  ins('insert into usuarios(id,email,clave_hash,nombre,rol) values (?,?,?,?,?)', uuid(), 'consulta@serrano.local', hashClave('consulta123'), 'Consulta Demo', 'consulta')

  // Datos de prueba solo si se especifican para test
  if (process.env.SERRANO_DEMO === '1') {
    const [p, c, l, n] = [uuid(), uuid(), uuid(), uuid()]
    ins("insert into proyectos(id,codigo,nombre,municipio,departamento) values (?,?,?,?,?)", p, 'AMA', 'Amaranta', 'El Cerrito', 'Valle del Cauca')
    ins("insert into clientes(id,tipo_documento,numero_documento,nombres,telefono_principal) values (?,?,?,?,?)", c, 'CC', '1000000001', 'COMPRADOR DEMO', '3000000000')
    ins('insert into lotes(id,proyecto_id,codigo,area_m2) values (?,?,?,?)', l, p, 'L-008', 350)
    ins("insert into negociaciones(id,codigo_venta,lote_id,fecha_negociacion,precio_acordado,estado) values (?,?,?,date('now','-60 day'),90000000,'vendido')", n, 'V008', l)
    ins('insert into negociacion_clientes values (?,?,1)', n, c)
    ins("insert into abonos(id,negociacion_id,fecha_pago,valor,medio,observaciones,id_origen) values (?,?,date('now','-50 day'),45000000,'transferencia','DEMO','DEMO-A0003')", uuid(), n)
  }
}
