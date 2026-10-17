import { db } from './db.js'
import fs from 'node:fs'
import path from 'node:path'

// 1. Script DDL para crear el schema dedicado admin_serrano y todas sus tablas
const ddl = `-- ==============================================================================
-- SERRANO GESTIÓN INMOBILIARIA — ESQUEMA DEDICADO POSTGRESQL PARA SUPABASE
-- Schema: admin_serrano
-- ==============================================================================

-- 0. Extensiones y creación del Schema dedicado
create extension if not exists "pgcrypto";
create schema if not exists admin_serrano;

-- Configurar search_path temporal para este script
set search_path to admin_serrano, public;

-- 1. Usuarios del sistema
create table if not exists admin_serrano.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  clave_hash text not null,
  nombre text not null,
  rol text not null check (rol in ('administrador','cartera','comercial','consulta')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Proyectos (Parcelaciones)
create table if not exists admin_serrano.proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  municipio text,
  departamento text,
  descripcion text,
  activo boolean not null default true,
  id_origen text,
  created_at timestamptz not null default now()
);

-- 3. Clientes (Compradores)
create table if not exists admin_serrano.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo_documento text not null default 'CC',
  numero_documento text not null,
  nombres text not null,
  telefono_principal text,
  telefono_secundario text,
  email text,
  direccion text,
  municipio text,
  observaciones text,
  created_at timestamptz not null default now(),
  unique (tipo_documento, numero_documento)
);
create index if not exists idx_clientes_doc on admin_serrano.clientes(numero_documento);

-- 4. Lotes
create table if not exists admin_serrano.lotes (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references admin_serrano.proyectos(id) on delete cascade,
  codigo text not null,
  area_m2 numeric(12,2) check (area_m2 is null or area_m2 > 0),
  id_externo text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (proyecto_id, codigo)
);
create index if not exists idx_lotes_proy on admin_serrano.lotes(proyecto_id);

-- 5. Comisionistas
create table if not exists admin_serrano.comisionistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  documento text unique,
  telefono text,
  porcentaje_defecto numeric(5,2),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Negociaciones
create table if not exists admin_serrano.negociaciones (
  id uuid primary key default gen_random_uuid(),
  codigo_venta text not null unique,
  lote_id uuid not null references admin_serrano.lotes(id),
  fecha_negociacion date not null,
  precio_acordado numeric(15,2) not null check (precio_acordado > 0),
  cuota_inicial_pactada numeric(15,2) check (cuota_inicial_pactada is null or cuota_inicial_pactada >= 0),
  vendedor text,
  comisionista_id uuid references admin_serrano.comisionistas(id),
  porcentaje_comision numeric(5,2),
  observaciones text,
  estado text not null default 'en_negociacion' check (estado in ('en_negociacion','separado','vendido','cancelado','finalizado')),
  id_origen text,
  created_by text,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_negociacion_activa_lote on admin_serrano.negociaciones(lote_id) where estado <> 'cancelado';

-- 7. Clientes por Negociación
create table if not exists admin_serrano.negociacion_clientes (
  negociacion_id uuid not null references admin_serrano.negociaciones(id) on delete cascade,
  cliente_id uuid not null references admin_serrano.clientes(id) on delete restrict,
  es_principal boolean not null default false,
  primary key (negociacion_id, cliente_id)
);
create unique index if not exists idx_un_principal_neg on admin_serrano.negociacion_clientes(negociacion_id) where es_principal = true;

-- 8. Abonos (Recaudos)
create table if not exists admin_serrano.abonos (
  id uuid primary key default gen_random_uuid(),
  negociacion_id uuid not null references admin_serrano.negociaciones(id) on delete cascade,
  fecha_pago date,
  valor numeric(15,2) not null check (valor > 0),
  medio text check (medio in ('efectivo','transferencia','consignacion','otro')),
  banco text,
  referencia text,
  observaciones text,
  comprobante_path text,
  estado text not null default 'vigente' check (estado in ('vigente','anulado')),
  pendiente_completar boolean not null default false,
  excedente_autorizado_por text,
  excedente_motivo text,
  idempotency_key text unique,
  anulado_por text,
  anulado_at timestamptz,
  motivo_anulacion text,
  id_origen text,
  created_by text,
  created_at timestamptz not null default now(),
  check (estado = 'vigente' or (motivo_anulacion is not null and anulado_por is not null)),
  check (pendiente_completar = true or (fecha_pago is not null and medio is not null))
);
create index if not exists idx_abonos_neg_fecha on admin_serrano.abonos(negociacion_id, fecha_pago);

-- 9. Recibos oficiales de abono
create table if not exists admin_serrano.recibos (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique,
  abono_id uuid not null unique references admin_serrano.abonos(id) on delete cascade,
  fecha_emision timestamptz not null default now(),
  total_anterior numeric(15,2) not null,
  valor_abono numeric(15,2) not null,
  total_acumulado numeric(15,2) not null,
  saldo_nuevo numeric(15,2) not null,
  pdf_path text,
  created_by text
);

-- 10. Contadores correlativos
create table if not exists admin_serrano.contadores (
  nombre text primary key,
  valor bigint not null
);

-- 11. Comisiones y pagos
create table if not exists admin_serrano.comisiones (
  id uuid primary key default gen_random_uuid(),
  negociacion_id uuid not null unique references admin_serrano.negociaciones(id),
  comisionista_id uuid not null references admin_serrano.comisionistas(id),
  porcentaje numeric(5,2),
  valor_comision numeric(15,2) not null check (valor_comision >= 0),
  aplica boolean not null default true,
  id_origen text,
  created_at timestamptz not null default now()
);

create table if not exists admin_serrano.pagos_comisiones (
  id uuid primary key default gen_random_uuid(),
  comision_id uuid not null references admin_serrano.comisiones(id),
  fecha date not null,
  valor numeric(15,2) not null check (valor > 0),
  medio text,
  referencia text,
  observaciones text,
  estado text not null default 'vigente',
  motivo_anulacion text,
  created_by text,
  created_at timestamptz not null default now()
);

-- 12. Documentos y adjuntos
create table if not exists admin_serrano.documentos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  nombre text not null,
  storage_path text not null,
  version integer not null default 1,
  cliente_id uuid references admin_serrano.clientes(id),
  negociacion_id uuid references admin_serrano.negociaciones(id),
  lote_id uuid references admin_serrano.lotes(id),
  created_by text,
  created_at timestamptz not null default now()
);

-- 13. Compromisos de pago
create table if not exists admin_serrano.compromisos_pago (
  id uuid primary key default gen_random_uuid(),
  negociacion_id uuid not null references admin_serrano.negociaciones(id),
  fecha_compromiso date not null,
  valor numeric(15,2),
  nota text,
  cumplido boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

-- 14. Auditoría de movimientos
create table if not exists admin_serrano.auditoria_movimientos (
  id bigserial primary key,
  tabla text not null,
  registro_id text,
  operacion text not null,
  usuario_id text,
  fecha timestamptz not null default now(),
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  motivo text
);

-- Permisos sobre el schema admin_serrano
grant usage on schema admin_serrano to anon, authenticated, service_role;
grant all on all tables in schema admin_serrano to anon, authenticated, service_role;
grant all on all sequences in schema admin_serrano to anon, authenticated, service_role;
alter default privileges in schema admin_serrano grant all on tables to anon, authenticated, service_role;
alter default privileges in schema admin_serrano grant all on sequences to anon, authenticated, service_role;

-- Habilitar RLS en cada tabla de admin_serrano
alter table admin_serrano.usuarios enable row level security;
alter table admin_serrano.proyectos enable row level security;
alter table admin_serrano.clientes enable row level security;
alter table admin_serrano.lotes enable row level security;
alter table admin_serrano.comisionistas enable row level security;
alter table admin_serrano.negociaciones enable row level security;
alter table admin_serrano.negociacion_clientes enable row level security;
alter table admin_serrano.abonos enable row level security;
alter table admin_serrano.recibos enable row level security;
alter table admin_serrano.contadores enable row level security;
alter table admin_serrano.comisiones enable row level security;
alter table admin_serrano.pagos_comisiones enable row level security;
alter table admin_serrano.documentos enable row level security;
alter table admin_serrano.compromisos_pago enable row level security;
alter table admin_serrano.auditoria_movimientos enable row level security;

-- Políticas de acceso permisivas para la app
create policy "acceso_usuarios" on admin_serrano.usuarios for all using (true) with check (true);
create policy "acceso_proyectos" on admin_serrano.proyectos for all using (true) with check (true);
create policy "acceso_clientes" on admin_serrano.clientes for all using (true) with check (true);
create policy "acceso_lotes" on admin_serrano.lotes for all using (true) with check (true);
create policy "acceso_comisionistas" on admin_serrano.comisionistas for all using (true) with check (true);
create policy "acceso_negociaciones" on admin_serrano.negociaciones for all using (true) with check (true);
create policy "acceso_negociacion_clientes" on admin_serrano.negociacion_clientes for all using (true) with check (true);
create policy "acceso_abonos" on admin_serrano.abonos for all using (true) with check (true);
create policy "acceso_recibos" on admin_serrano.recibos for all using (true) with check (true);
create policy "acceso_contadores" on admin_serrano.contadores for all using (true) with check (true);
create policy "acceso_comisiones" on admin_serrano.comisiones for all using (true) with check (true);
create policy "acceso_pagos_comisiones" on admin_serrano.pagos_comisiones for all using (true) with check (true);
create policy "acceso_documentos" on admin_serrano.documentos for all using (true) with check (true);
create policy "acceso_compromisos_pago" on admin_serrano.compromisos_pago for all using (true) with check (true);
create policy "acceso_auditoria_movimientos" on admin_serrano.auditoria_movimientos for all using (true) with check (true);
`

fs.writeFileSync(path.resolve('supabase/01_crear_tablas_admin_serrano.sql'), ddl, 'utf8')
console.log('✓ Creado: supabase/01_crear_tablas_admin_serrano.sql (schema admin_serrano)')

// 2. Script para exportar datos reales actuales en INSERT statements
function sqlVal(v, isBool = false) {
  if (v === null || v === undefined) return 'NULL'
  if (isBool) return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  return "'" + String(v).replace(/'/g, "''") + "'"
}

let insSql = `-- ==============================================================================
-- SERRANO GESTIÓN INMOBILIARIA — CARGA DE DATOS REALES EN SUPABASE
-- Schema: admin_serrano
-- ==============================================================================

BEGIN;
set search_path to admin_serrano, public;

`

// 1. Usuarios
const usuarios = db.prepare('select * from usuarios').all()
if (usuarios.length) {
  insSql += `-- 1. Usuarios (${usuarios.length})\n`
  for (const u of usuarios) {
    insSql += `insert into admin_serrano.usuarios (id, email, clave_hash, nombre, rol, activo)\n`
    insSql += `values (${sqlVal(u.id)}, ${sqlVal(u.email)}, ${sqlVal(u.clave_hash)}, ${sqlVal(u.nombre)}, ${sqlVal(u.rol)}, ${sqlVal(u.activo, true)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 2. Proyectos
const proyectos = db.prepare('select * from proyectos').all()
if (proyectos.length) {
  insSql += `-- 2. Proyectos (${proyectos.length})\n`
  for (const p of proyectos) {
    insSql += `insert into admin_serrano.proyectos (id, codigo, nombre, municipio, departamento, descripcion, activo, id_origen)\n`
    insSql += `values (${sqlVal(p.id)}, ${sqlVal(p.codigo)}, ${sqlVal(p.nombre)}, ${sqlVal(p.municipio)}, ${sqlVal(p.departamento)}, ${sqlVal(p.descripcion)}, ${sqlVal(p.activo, true)}, ${sqlVal(p.id_origen)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 3. Clientes
const clientes = db.prepare('select * from clientes').all()
if (clientes.length) {
  insSql += `-- 3. Clientes (${clientes.length})\n`
  for (const c of clientes) {
    insSql += `insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)\n`
    insSql += `values (${sqlVal(c.id)}, ${sqlVal(c.tipo_documento)}, ${sqlVal(c.numero_documento)}, ${sqlVal(c.nombres)}, ${sqlVal(c.telefono_principal)}, ${sqlVal(c.telefono_secundario)}, ${sqlVal(c.email)}, ${sqlVal(c.direccion)}, ${sqlVal(c.municipio)}, ${sqlVal(c.observaciones)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 4. Lotes
const lotes = db.prepare('select * from lotes').all()
if (lotes.length) {
  insSql += `-- 4. Lotes (${lotes.length})\n`
  for (const l of lotes) {
    insSql += `insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)\n`
    insSql += `values (${sqlVal(l.id)}, ${sqlVal(l.proyecto_id)}, ${sqlVal(l.codigo)}, ${sqlVal(l.area_m2)}, ${sqlVal(l.id_externo)}, ${sqlVal(l.activo, true)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 5. Comisionistas
const comisionistas = db.prepare('select * from comisionistas').all()
if (comisionistas.length) {
  insSql += `-- 5. Comisionistas (${comisionistas.length})\n`
  for (const c of comisionistas) {
    insSql += `insert into admin_serrano.comisionistas (id, nombre, documento, telefono, porcentaje_defecto, activo)\n`
    insSql += `values (${sqlVal(c.id)}, ${sqlVal(c.nombre)}, ${sqlVal(c.documento)}, ${sqlVal(c.telefono)}, ${sqlVal(c.porcentaje_defecto)}, ${sqlVal(c.activo, true)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 6. Negociaciones
const negociaciones = db.prepare('select * from negociaciones').all()
if (negociaciones.length) {
  insSql += `-- 6. Negociaciones (${negociaciones.length})\n`
  for (const n of negociaciones) {
    insSql += `insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)\n`
    insSql += `values (${sqlVal(n.id)}, ${sqlVal(n.codigo_venta)}, ${sqlVal(n.lote_id)}, ${sqlVal(n.fecha_negociacion)}, ${sqlVal(n.precio_acordado)}, ${sqlVal(n.cuota_inicial_pactada)}, ${sqlVal(n.vendedor)}, ${sqlVal(n.comisionista_id)}, ${sqlVal(n.porcentaje_comision)}, ${sqlVal(n.observaciones)}, ${sqlVal(n.estado)}, ${sqlVal(n.id_origen)}, ${sqlVal(n.created_by)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 7. Negociacion_clientes
const nc = db.prepare('select * from negociacion_clientes').all()
if (nc.length) {
  insSql += `-- 7. Compradores por Negociación (${nc.length})\n`
  for (const r of nc) {
    insSql += `insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)\n`
    insSql += `values (${sqlVal(r.negociacion_id)}, ${sqlVal(r.cliente_id)}, ${sqlVal(r.es_principal, true)})\n`
    insSql += `on conflict (negociacion_id, cliente_id) do nothing;\n`
  }
  insSql += '\n'
}

// 8. Abonos
const abonos = db.prepare('select * from abonos').all()
if (abonos.length) {
  insSql += `-- 8. Abonos (${abonos.length})\n`
  for (const a of abonos) {
    insSql += `insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)\n`
    insSql += `values (${sqlVal(a.id)}, ${sqlVal(a.negociacion_id)}, ${sqlVal(a.fecha_pago)}, ${sqlVal(a.valor)}, ${sqlVal(a.medio)}, ${sqlVal(a.banco)}, ${sqlVal(a.referencia)}, ${sqlVal(a.observaciones)}, ${sqlVal(a.comprobante_path)}, ${sqlVal(a.estado)}, ${sqlVal(a.pendiente_completar, true)}, ${sqlVal(a.excedente_autorizado_por)}, ${sqlVal(a.excedente_motivo)}, ${sqlVal(a.idempotency_key)}, ${sqlVal(a.anulado_por)}, ${sqlVal(a.anulado_at)}, ${sqlVal(a.motivo_anulacion)}, ${sqlVal(a.id_origen)}, ${sqlVal(a.created_by)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 9. Recibos
const recibos = db.prepare('select * from recibos').all()
if (recibos.length) {
  insSql += `-- 9. Recibos oficiales (${recibos.length})\n`
  for (const r of recibos) {
    insSql += `insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)\n`
    insSql += `values (${sqlVal(r.id)}, ${sqlVal(r.numero)}, ${sqlVal(r.abono_id)}, ${sqlVal(r.fecha_emision)}, ${sqlVal(r.total_anterior)}, ${sqlVal(r.valor_abono)}, ${sqlVal(r.total_acumulado)}, ${sqlVal(r.saldo_nuevo)}, ${sqlVal(r.pdf_path)}, ${sqlVal(r.created_by)})\n`
    insSql += `on conflict (id) do nothing;\n`
  }
  insSql += '\n'
}

// 10. Contadores
const contadores = db.prepare('select * from contadores').all()
if (contadores.length) {
  insSql += `-- 10. Contadores (${contadores.length})\n`
  for (const c of contadores) {
    insSql += `insert into admin_serrano.contadores (nombre, valor)\n`
    insSql += `values (${sqlVal(c.nombre)}, ${sqlVal(c.valor)})\n`
    insSql += `on conflict (nombre) do update set valor = excluded.valor;\n`
  }
  insSql += '\n'
}

insSql += `COMMIT;
`

fs.writeFileSync(path.resolve('supabase/02_cargar_datos_admin_serrano.sql'), insSql, 'utf8')
console.log('✓ Creado: supabase/02_cargar_datos_admin_serrano.sql (schema admin_serrano)')
