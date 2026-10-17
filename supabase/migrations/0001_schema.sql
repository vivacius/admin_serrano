-- SERRANO Gestión Inmobiliaria — Esquema base
-- Montos: numeric(15,2) COP. Claves primarias UUID. Sin cuotas, sin inventario geográfico.

create extension if not exists pgcrypto;

-- ───────── Enumeraciones ─────────
create type rol_usuario as enum ('administrador','cartera','comercial','consulta');
create type estado_negociacion as enum ('en_negociacion','separado','vendido','cancelado','finalizado');
create type medio_pago as enum ('efectivo','transferencia','consignacion','otro');
create type estado_abono as enum ('vigente','anulado');
create type tipo_documento_id as enum ('CC','CE','NIT','PAS','TI','OTRO');
create type categoria_documento as enum ('cedula','promesa','comprobante','recibo','estado_cuenta','otro');

-- ───────── Perfiles ─────────
create table usuarios_perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'consulta',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────── Proyectos ─────────
create table proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  municipio text,
  departamento text,
  descripcion text,
  activo boolean not null default true,
  id_origen text,                       -- identificador original en Excel
  created_at timestamptz not null default now()
);

-- ───────── Clientes ─────────
create table clientes (
  id uuid primary key default gen_random_uuid(),
  tipo_documento tipo_documento_id not null default 'CC',
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
create index clientes_nombres_idx on clientes using gin (to_tsvector('spanish', nombres));

-- ───────── Lotes: inventario comercial (la gestión geográfica sigue en el geovisor) ─────────
create table lotes (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id),
  codigo text not null,
  area_m2 numeric(12,2) check (area_m2 > 0),
  id_externo text,                      -- referencia al lote en el geovisor, para integración futura
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (proyecto_id, codigo)
);

-- ───────── Comisionistas ─────────
create table comisionistas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  documento text unique,
  telefono text,
  porcentaje_defecto numeric(5,2) check (porcentaje_defecto between 0 and 100),
  activo boolean not null default true
);

-- ───────── Negociaciones ─────────
create table negociaciones (
  id uuid primary key default gen_random_uuid(),
  codigo_venta text not null unique,
  lote_id uuid not null references lotes(id),
  fecha_negociacion date not null,
  precio_acordado numeric(15,2) not null check (precio_acordado > 0),
  cuota_inicial_pactada numeric(15,2) check (cuota_inicial_pactada >= 0),  -- dato comercial, NO recaudo
  vendedor text,
  comisionista_id uuid references comisionistas(id),
  porcentaje_comision numeric(5,2) check (porcentaje_comision between 0 and 100),
  observaciones text,
  estado estado_negociacion not null default 'en_negociacion',
  id_origen text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
-- Un lote solo puede tener una negociación activa a la vez; las canceladas se conservan.
create unique index negociacion_activa_por_lote
  on negociaciones (lote_id) where estado <> 'cancelado';

create table negociacion_clientes (
  negociacion_id uuid not null references negociaciones(id) on delete restrict,
  cliente_id uuid not null references clientes(id),
  es_principal boolean not null default false,
  primary key (negociacion_id, cliente_id)
);
create unique index un_principal_por_negociacion
  on negociacion_clientes (negociacion_id) where es_principal;

-- ───────── Abonos ─────────
create table abonos (
  id uuid primary key default gen_random_uuid(),
  negociacion_id uuid not null references negociaciones(id),
  fecha_pago date,                                -- nullable solo para datos importados incompletos
  valor numeric(15,2) not null check (valor > 0),
  medio medio_pago,
  banco text,
  referencia text,
  observaciones text,
  comprobante_path text,
  estado estado_abono not null default 'vigente',
  pendiente_completar boolean not null default false,  -- importados con datos faltantes
  excedente_autorizado_por uuid references auth.users(id),
  excedente_motivo text,
  idempotency_key text unique,                    -- evita duplicados por doble clic / reintentos
  anulado_por uuid references auth.users(id),
  anulado_at timestamptz,
  motivo_anulacion text,
  id_origen text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (estado = 'vigente' or (motivo_anulacion is not null and anulado_por is not null)),
  check (pendiente_completar or (fecha_pago is not null and medio is not null))
);
create index abonos_negociacion_idx on abonos (negociacion_id, fecha_pago);

-- ───────── Recibos (inmutables) ─────────
create sequence recibos_consecutivo_seq;
create table recibos (
  id uuid primary key default gen_random_uuid(),
  numero bigint not null unique default nextval('recibos_consecutivo_seq'),
  abono_id uuid not null unique references abonos(id),
  fecha_emision timestamptz not null default now(),
  total_anterior numeric(15,2) not null,
  valor_abono numeric(15,2) not null,
  total_acumulado numeric(15,2) not null,
  saldo_nuevo numeric(15,2) not null,
  pdf_path text,
  created_by uuid references auth.users(id)
);

-- ───────── Comisiones ─────────
create table comisiones (
  id uuid primary key default gen_random_uuid(),
  negociacion_id uuid not null unique references negociaciones(id),
  comisionista_id uuid not null references comisionistas(id),
  porcentaje numeric(5,2) check (porcentaje between 0 and 100),  -- informativo
  valor_comision numeric(15,2) not null check (valor_comision >= 0),  -- digitado manualmente
  aplica boolean not null default true,
  id_origen text
);
create table pagos_comisiones (
  id uuid primary key default gen_random_uuid(),
  comision_id uuid not null references comisiones(id),
  fecha date not null,
  valor numeric(15,2) not null check (valor > 0),
  medio medio_pago,
  referencia text,
  observaciones text,
  estado estado_abono not null default 'vigente',
  motivo_anulacion text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ───────── Documentos ─────────
create table documentos (
  id uuid primary key default gen_random_uuid(),
  categoria categoria_documento not null,
  nombre text not null,
  storage_path text not null,
  version int not null default 1,
  cliente_id uuid references clientes(id),
  negociacion_id uuid references negociaciones(id),
  lote_id uuid references lotes(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (cliente_id is not null or negociacion_id is not null or lote_id is not null)
);

-- ───────── Compromisos de pago (seguimiento manual, NO cuotas) ─────────
create table compromisos_pago (
  id uuid primary key default gen_random_uuid(),
  negociacion_id uuid not null references negociaciones(id),
  fecha_compromiso date not null,
  valor numeric(15,2) check (valor > 0),
  nota text,
  cumplido boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ───────── Auditoría ─────────
create table auditoria_movimientos (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text,
  operacion text not null,
  usuario_id uuid,
  fecha timestamptz not null default now(),
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  motivo text
);

-- ───────── Vistas de saldos (calculadas, nunca almacenadas) ─────────
create view v_negociacion_saldos with (security_invoker = true) as
select n.id as negociacion_id, n.codigo_venta, n.lote_id, n.precio_acordado, n.estado,
       coalesce(sum(a.valor) filter (where a.estado = 'vigente'), 0)::numeric(15,2) as total_recaudado,
       (n.precio_acordado - coalesce(sum(a.valor) filter (where a.estado = 'vigente'), 0))::numeric(15,2) as saldo_pendiente,
       round(coalesce(sum(a.valor) filter (where a.estado = 'vigente'), 0) / n.precio_acordado * 100, 2) as porcentaje_pagado,
       max(a.fecha_pago) filter (where a.estado = 'vigente') as fecha_ultimo_abono,
       (current_date - max(a.fecha_pago) filter (where a.estado = 'vigente')) as dias_desde_ultimo_abono
from negociaciones n
left join abonos a on a.negociacion_id = n.id
group by n.id;

-- Estado comercial del lote derivado de su negociación vigente (no se almacena)
create view v_lotes with (security_invoker = true) as
select l.id as lote_id, l.proyecto_id, l.codigo, l.area_m2, l.id_externo,
       n.id as negociacion_activa_id, n.codigo_venta,
       coalesce(n.estado::text, 'disponible') as estado_comercial
from lotes l
left join negociaciones n on n.lote_id = l.id and n.estado <> 'cancelado';
