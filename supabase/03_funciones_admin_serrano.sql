-- ==============================================================================
-- SERRANO GESTIÓN INMOBILIARIA — FUNCIONES TRANSACCIONALES PARA SUPABASE
-- Schema: admin_serrano
-- ==============================================================================

set search_path to admin_serrano, public;

-- 1. Función de Autenticación de Usuarios
create or replace function admin_serrano.login(p_email text, p_clave text)
returns jsonb
language plpgsql
security definer
set search_path = admin_serrano, public
as $$
declare
  v_user admin_serrano.usuarios%rowtype;
  v_salt text;
  v_hash text;
  v_input_hash text;
begin
  select * into v_user
  from admin_serrano.usuarios
  where lower(trim(email)) = lower(trim(p_email)) and activo = true;

  if not found then
    raise exception 'Credenciales inválidas o usuario inactivo';
  end if;

  -- Para las claves demo estándar
  if (lower(trim(p_email)) = 'admin@serrano.local' and p_clave = 'admin123')
     or (lower(trim(p_email)) = 'cartera@serrano.local' and p_clave = 'cartera123')
     or (lower(trim(p_email)) = 'consulta@serrano.local' and p_clave = 'consulta123') then
    return jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'nombre', v_user.nombre,
      'rol', v_user.rol
    );
  end if;

  -- Verificación scrypt / sha256 si viene en formato salt:hash
  v_salt := split_part(v_user.clave_hash, ':', 1);
  v_hash := split_part(v_user.clave_hash, ':', 2);
  
  if v_salt is not null and v_salt <> '' and v_hash is not null and v_hash <> '' then
    v_input_hash := encode(digest(v_salt || p_clave, 'sha256'), 'hex');
    if v_input_hash = v_hash then
      return jsonb_build_object(
        'id', v_user.id,
        'email', v_user.email,
        'nombre', v_user.nombre,
        'rol', v_user.rol
      );
    end if;
  end if;

  -- Si no coincidió con demo ni hash
  raise exception 'Credenciales inválidas';
end;
$$;

-- 2. Función para registrar abonos de forma atómica con consecutivo único e inmutable
create or replace function admin_serrano.registrar_abono(
  p_negociacion_id uuid,
  p_fecha date,
  p_valor numeric,
  p_medio text,
  p_banco text default null,
  p_referencia text default null,
  p_observaciones text default null,
  p_comprobante_path text default null,
  p_idempotency_key text default null,
  p_autoriza_excedente boolean default false,
  p_motivo_excedente text default null,
  p_confirma_duplicado boolean default false,
  p_usuario_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = admin_serrano, public
as $$
declare
  v_neg admin_serrano.negociaciones%rowtype;
  v_prev numeric(15,2);
  v_abono admin_serrano.abonos%rowtype;
  v_recibo admin_serrano.recibos%rowtype;
  v_dup boolean;
  v_num_recibo bigint;
begin
  if p_valor is null or p_valor <= 0 then
    raise exception 'El valor recibido debe ser mayor a cero';
  end if;
  if p_fecha is null then
    raise exception 'La fecha del abono es obligatoria';
  end if;
  if p_fecha > current_date then
    raise exception 'La fecha del pago no puede ser futura';
  end if;

  -- 1. Idempotencia: si ya existe con la misma clave, devuelve el abono previo sin duplicar
  if p_idempotency_key is not null and p_idempotency_key <> '' then
    select * into v_abono from admin_serrano.abonos where idempotency_key = p_idempotency_key;
    if found then
      select * into v_recibo from admin_serrano.recibos where abono_id = v_abono.id;
      return jsonb_build_object(
        'abono_id', v_abono.id,
        'recibo_id', v_recibo.id,
        'numero', v_recibo.numero,
        'repetido', true
      );
    end if;
  end if;

  -- 2. Bloqueo de fila de negociación para evitar carreras en abonos concurrentes
  select * into v_neg from admin_serrano.negociaciones where id = p_negociacion_id for update;
  if not found then
    raise exception 'La negociación especificada no existe';
  end if;
  if v_neg.estado in ('cancelado', 'finalizado') then
    raise exception 'La negociación se encuentra en estado % y no admite abonos', v_neg.estado;
  end if;

  -- 3. Calcular saldo previo
  select coalesce(sum(valor), 0) into v_prev
  from admin_serrano.abonos
  where negociacion_id = p_negociacion_id and estado = 'vigente';

  -- 4. Validación de excedente sobre el precio acordado
  if (v_prev + p_valor) > v_neg.precio_acordado then
    if not (p_autoriza_excedente and coalesce(trim(p_motivo_excedente), '') <> '') then
      raise exception 'El abono supera el saldo pendiente de esta negociación ($ %). Requiere autorización de un administrador con motivo justificado.',
        to_char(v_neg.precio_acordado - v_prev, 'FM999,999,999,999');
    end if;
  end if;

  -- 5. Control de posible duplicado en la misma negociación
  select exists(
    select 1 from admin_serrano.abonos
    where negociacion_id = p_negociacion_id
      and estado = 'vigente'
      and fecha_pago = p_fecha
      and valor = p_valor
      and medio = p_medio
      and referencia is not distinct from nullif(trim(p_referencia), '')
  ) into v_dup;

  if v_dup and not p_confirma_duplicado then
    raise exception 'POSIBLE_DUPLICADO: Ya existe un abono idéntico en esta negociación. Si es un pago legítimo diferente, confirme la operación.';
  end if;

  -- 6. Obtener consecutivo atómico de recibo
  update admin_serrano.contadores
     set valor = valor + 1
   where nombre = 'recibos'
  returning valor into v_num_recibo;

  if v_num_recibo is null then
    -- Inicializar si no existía el registro
    insert into admin_serrano.contadores (nombre, valor) values ('recibos', 19)
    returning valor into v_num_recibo;
  end if;

  -- 7. Insertar Abono
  insert into admin_serrano.abonos (
    negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones,
    comprobante_path, idempotency_key, created_by,
    excedente_autorizado_por, excedente_motivo
  )
  values (
    p_negociacion_id, p_fecha, p_valor, p_medio, nullif(trim(p_banco), ''), nullif(trim(p_referencia), ''),
    p_observaciones, p_comprobante_path, p_idempotency_key, p_usuario_id,
    case when (v_prev + p_valor) > v_neg.precio_acordado then p_usuario_id end,
    case when (v_prev + p_valor) > v_neg.precio_acordado then p_motivo_excedente end
  )
  returning * into v_abono;

  -- 8. Insertar Recibo oficial
  insert into admin_serrano.recibos (
    numero, abono_id, total_anterior, valor_abono, total_acumulado, saldo_nuevo, created_by
  )
  values (
    v_num_recibo,
    v_abono.id,
    v_prev,
    p_valor,
    v_prev + p_valor,
    v_neg.precio_acordado - (v_prev + p_valor),
    p_usuario_id
  )
  returning * into v_recibo;

  -- 9. Registrar auditoría
  insert into admin_serrano.auditoria_movimientos (tabla, registro_id, operacion, usuario_id, valores_nuevos, motivo)
  values ('abonos', v_abono.id::text, 'INSERT', p_usuario_id, to_jsonb(v_abono), 'Registro de abono oficial #' || v_num_recibo);

  return jsonb_build_object(
    'abono_id', v_abono.id,
    'recibo_id', v_recibo.id,
    'numero', v_recibo.numero,
    'total_anterior', v_recibo.total_anterior,
    'valor_abono', v_recibo.valor_abono,
    'total_acumulado', v_recibo.total_acumulado,
    'saldo_nuevo', v_recibo.saldo_nuevo,
    'repetido', false
  );
end;
$$;

-- 3. Función para anular abonos de forma auditada
create or replace function admin_serrano.anular_abono(
  p_abono_id uuid,
  p_motivo text,
  p_usuario_id text default null
)
returns void
language plpgsql
security definer
set search_path = admin_serrano, public
as $$
declare
  v_neg_id uuid;
begin
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'El motivo de anulación es obligatorio';
  end if;

  select negociacion_id into v_neg_id
  from admin_serrano.abonos
  where id = p_abono_id;

  if not found then
    raise exception 'El abono especificado no existe';
  end if;

  perform 1 from admin_serrano.negociaciones where id = v_neg_id for update;

  update admin_serrano.abonos
     set estado = 'anulado',
         anulado_por = p_usuario_id,
         anulado_at = now(),
         motivo_anulacion = p_motivo
   where id = p_abono_id and estado = 'vigente';

  if not found then
    raise exception 'El abono ya se encontraba anulado';
  end if;

  insert into admin_serrano.auditoria_movimientos (tabla, registro_id, operacion, usuario_id, motivo)
  values ('abonos', p_abono_id::text, 'ANULACION', p_usuario_id, p_motivo);
end;
$$;

-- 4. Función de Estado de Cuenta con fecha de corte
create or replace function admin_serrano.estado_cuenta(
  p_negociacion_id uuid,
  p_corte date default current_date
)
returns table(
  abono_id uuid,
  fecha date,
  recibo_numero bigint,
  medio text,
  referencia text,
  valor numeric,
  saldo_posterior numeric,
  pendiente_completar boolean
)
language plpgsql
stable
security definer
set search_path = admin_serrano, public
as $$
declare
  v_precio numeric(15,2);
  v_acum numeric(15,2) := 0;
  r record;
begin
  select precio_acordado into v_precio
  from admin_serrano.negociaciones
  where id = p_negociacion_id;

  for r in (
    select a.id, a.fecha_pago, a.medio, a.referencia, a.valor, a.pendiente_completar,
           rc.numero as recibo_num
    from admin_serrano.abonos a
    left join admin_serrano.recibos rc on rc.abono_id = a.id
    where a.negociacion_id = p_negociacion_id
      and a.estado = 'vigente'
      and (a.fecha_pago is null or a.fecha_pago <= p_corte)
    order by coalesce(a.fecha_pago, '1900-01-01') asc, rc.numero asc, a.created_at asc
  ) loop
    v_acum := v_acum + r.valor;
    abono_id := r.id;
    fecha := r.fecha_pago;
    recibo_numero := r.recibo_num;
    medio := r.medio;
    referencia := r.referencia;
    valor := r.valor;
    saldo_posterior := v_precio - v_acum;
    pendiente_completar := r.pendiente_completar;
    return next;
  end loop;
end;
$$;

-- Permisos de ejecución para anon y authenticated
grant execute on function admin_serrano.login(text, text) to anon, authenticated, service_role;
grant execute on function admin_serrano.registrar_abono(uuid, date, numeric, text, text, text, text, text, text, boolean, text, boolean, text) to anon, authenticated, service_role;
grant execute on function admin_serrano.anular_abono(uuid, text, text) to anon, authenticated, service_role;
grant execute on function admin_serrano.estado_cuenta(uuid, date) to anon, authenticated, service_role;
