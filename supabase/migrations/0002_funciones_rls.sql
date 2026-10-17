-- Funciones transaccionales, auditoría, inmutabilidad y RLS

-- ───────── Helpers de rol ─────────
create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from usuarios_perfiles where id = auth.uid() and activo
$$;

create or replace function tiene_rol(variadic roles rol_usuario[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mi_rol() = any(roles), false)
$$;

-- ───────── Auditoría genérica ─────────
create or replace function fn_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria_movimientos(tabla, registro_id, operacion, usuario_id, valores_anteriores, valores_nuevos)
  values (tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          tg_op, auth.uid(),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['proyectos','clientes','negociaciones','negociacion_clientes','abonos',
                            'comisiones','pagos_comisiones','documentos','compromisos_pago'] loop
    execute format('create trigger aud_%1$s after insert or update or delete on %1$s
                    for each row execute function fn_auditar()', t);
  end loop;
end $$;

-- ───────── Inmutabilidad ─────────
create or replace function fn_recibos_inmutables() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Los recibos no pueden eliminarse'; end if;
  -- Único campo modificable: ruta del PDF (una sola vez)
  if (to_jsonb(new) - 'pdf_path') <> (to_jsonb(old) - 'pdf_path') or old.pdf_path is not null then
    raise exception 'Los recibos emitidos son inmutables';
  end if;
  return new;
end $$;
create trigger recibos_inmutables before update or delete on recibos
  for each row execute function fn_recibos_inmutables();

create or replace function fn_abonos_protegidos() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Los abonos no se eliminan; use anulación auditada'; end if;
  if old.estado = 'anulado' then raise exception 'Abono ya anulado'; end if;
  -- Solo se permite anular o completar datos de importación pendientes
  if new.valor <> old.valor or new.negociacion_id <> old.negociacion_id then
    raise exception 'El valor y la negociación de un abono no son modificables';
  end if;
  if old.pendiente_completar = false and new.estado = 'vigente'
     and (new.fecha_pago is distinct from old.fecha_pago or new.medio is distinct from old.medio) then
    raise exception 'Abono confirmado: corrija mediante anulación';
  end if;
  return new;
end $$;
create trigger abonos_protegidos before update or delete on abonos
  for each row execute function fn_abonos_protegidos();

-- ───────── Registrar abono (transaccional e idempotente) ─────────
create or replace function registrar_abono(
  p_negociacion_id uuid, p_fecha date, p_valor numeric, p_medio medio_pago,
  p_banco text, p_referencia text, p_observaciones text, p_comprobante_path text,
  p_idempotency_key text, p_autoriza_excedente boolean default false, p_motivo_excedente text default null,
  p_confirma_duplicado boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_neg negociaciones%rowtype;
  v_prev numeric(15,2);
  v_abono abonos%rowtype;
  v_recibo recibos%rowtype;
  v_dup boolean;
begin
  if not tiene_rol('administrador','cartera') then raise exception 'Sin permiso para registrar abonos'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'El valor debe ser mayor a cero'; end if;
  if p_fecha is null then raise exception 'La fecha es obligatoria'; end if;
  if p_fecha > current_date then raise exception 'La fecha del pago no puede ser futura'; end if;
  if p_medio is null then raise exception 'El medio de pago es obligatorio'; end if;

  -- Idempotencia: si ya existe, devolver el resultado previo
  select * into v_abono from abonos where idempotency_key = p_idempotency_key;
  if found then
    select * into v_recibo from recibos where abono_id = v_abono.id;
    return jsonb_build_object('abono_id', v_abono.id, 'recibo_id', v_recibo.id,
                              'numero', v_recibo.numero, 'repetido', true);
  end if;

  -- Bloqueo de la negociación para serializar abonos concurrentes
  select * into v_neg from negociaciones where id = p_negociacion_id for update;
  if not found then raise exception 'Negociación no existe'; end if;
  if v_neg.estado in ('cancelado','finalizado') then
    raise exception 'La negociación está % y no admite abonos', v_neg.estado;
  end if;

  select coalesce(sum(valor),0) into v_prev from abonos
   where negociacion_id = p_negociacion_id and estado = 'vigente';

  if v_prev + p_valor > v_neg.precio_acordado then
    if not (p_autoriza_excedente and tiene_rol('administrador') and coalesce(trim(p_motivo_excedente),'') <> '') then
      raise exception 'El abono supera el saldo pendiente (%). Requiere autorización de un administrador con motivo.',
        v_neg.precio_acordado - v_prev;
    end if;
  end if;

  -- Posible duplicado dentro de la MISMA negociación: advertencia que el usuario debe confirmar.
  -- (Abonos idénticos en negociaciones distintas del mismo cliente son normales y no se comparan.)
  select exists(select 1 from abonos where negociacion_id = p_negociacion_id and estado = 'vigente'
    and fecha_pago = p_fecha and valor = p_valor and medio = p_medio
    and referencia is not distinct from nullif(trim(p_referencia),'')) into v_dup;
  if v_dup and not p_confirma_duplicado then
    raise exception 'POSIBLE_DUPLICADO: ya existe un abono idéntico en esta negociación. Confirme para registrarlo.';
  end if;

  insert into abonos(negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones,
                     comprobante_path, idempotency_key, created_by,
                     excedente_autorizado_por, excedente_motivo)
  values (p_negociacion_id, p_fecha, p_valor, p_medio, nullif(trim(p_banco),''), nullif(trim(p_referencia),''),
          p_observaciones, p_comprobante_path, p_idempotency_key, auth.uid(),
          case when v_prev + p_valor > v_neg.precio_acordado then auth.uid() end,
          case when v_prev + p_valor > v_neg.precio_acordado then p_motivo_excedente end)
  returning * into v_abono;

  insert into recibos(abono_id, total_anterior, valor_abono, total_acumulado, saldo_nuevo, created_by)
  values (v_abono.id, v_prev, p_valor, v_prev + p_valor, v_neg.precio_acordado - (v_prev + p_valor), auth.uid())
  returning * into v_recibo;

  return jsonb_build_object('abono_id', v_abono.id, 'recibo_id', v_recibo.id, 'numero', v_recibo.numero,
                            'saldo_nuevo', v_recibo.saldo_nuevo, 'repetido', false);
end $$;

-- ───────── Anular abono (auditado) ─────────
create or replace function anular_abono(p_abono_id uuid, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_neg uuid;
begin
  if not tiene_rol('administrador') then raise exception 'Solo un administrador puede anular abonos'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'El motivo es obligatorio'; end if;
  select negociacion_id into v_neg from abonos where id = p_abono_id;
  perform 1 from negociaciones where id = v_neg for update;
  update abonos set estado = 'anulado', anulado_por = auth.uid(), anulado_at = now(),
                    motivo_anulacion = p_motivo
   where id = p_abono_id and estado = 'vigente';
  if not found then raise exception 'Abono inexistente o ya anulado'; end if;
  insert into auditoria_movimientos(tabla, registro_id, operacion, usuario_id, motivo)
  values ('abonos', p_abono_id::text, 'ANULACION', auth.uid(), p_motivo);
end $$;

-- ───────── Estado de cuenta con fecha de corte ─────────
create or replace function estado_cuenta(p_negociacion_id uuid, p_corte date default current_date)
returns table(abono_id uuid, fecha date, recibo_numero bigint, medio medio_pago, referencia text,
              valor numeric, saldo_posterior numeric, pendiente_completar boolean)
language sql stable security invoker set search_path = public as $$
  select a.id, a.fecha_pago, r.numero, a.medio, a.referencia, a.valor,
         n.precio_acordado - sum(a.valor) over (order by a.fecha_pago nulls last, a.created_at, a.id),
         a.pendiente_completar
  from abonos a
  join negociaciones n on n.id = a.negociacion_id
  left join recibos r on r.abono_id = a.id
  where a.negociacion_id = p_negociacion_id and a.estado = 'vigente'
    and (a.fecha_pago is null or a.fecha_pago <= p_corte)
  order by a.fecha_pago nulls last, a.created_at, a.id
$$;

-- ───────── RLS ─────────
do $$ declare t text; begin
  foreach t in array array['usuarios_perfiles','proyectos','clientes','lotes','comisionistas','negociaciones',
    'negociacion_clientes','abonos','recibos','comisiones','pagos_comisiones','documentos',
    'compromisos_pago','auditoria_movimientos'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Lectura: cualquier usuario activo con perfil
do $$ declare t text; begin
  foreach t in array array['proyectos','clientes','lotes','comisionistas','negociaciones','negociacion_clientes',
    'abonos','recibos','comisiones','pagos_comisiones','documentos','compromisos_pago'] loop
    execute format('create policy lectura_%1$s on %1$s for select using (mi_rol() is not null)', t);
  end loop;
end $$;

-- Escritura administrativa: administrador y cartera (abonos/recibos solo por funciones SECURITY DEFINER)
do $$ declare t text; begin
  foreach t in array array['proyectos','clientes','lotes','negociaciones','negociacion_clientes',
    'documentos','compromisos_pago'] loop
    execute format('create policy escritura_%1$s on %1$s for all
      using (tiene_rol(''administrador'',''cartera'')) with check (tiene_rol(''administrador'',''cartera''))', t);
  end loop;
end $$;
create policy escritura_comisionistas on comisionistas for all
  using (tiene_rol('administrador')) with check (tiene_rol('administrador'));
create policy escritura_comisiones on comisiones for all
  using (tiene_rol('administrador','cartera')) with check (tiene_rol('administrador','cartera'));
create policy escritura_pagos_comisiones on pagos_comisiones for insert
  with check (tiene_rol('administrador','cartera'));

create policy perfil_propio on usuarios_perfiles for select using (id = auth.uid() or tiene_rol('administrador'));
create policy perfil_admin on usuarios_perfiles for all
  using (tiene_rol('administrador')) with check (tiene_rol('administrador'));
create policy auditoria_admin on auditoria_movimientos for select using (tiene_rol('administrador'));

-- Rol comercial: sin acceso a abonos ni recibos (sólo clientes y negociaciones)
drop policy lectura_abonos on abonos;
create policy lectura_abonos on abonos for select using (tiene_rol('administrador','cartera','consulta'));
drop policy lectura_recibos on recibos;
create policy lectura_recibos on recibos for select using (tiene_rol('administrador','cartera','consulta'));

revoke all on function registrar_abono from public;
grant execute on function registrar_abono, anular_abono to authenticated;

-- Perfil automático para nuevos usuarios (rol mínimo; un admin lo eleva)
create or replace function fn_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into usuarios_perfiles(id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'consulta');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function fn_nuevo_usuario();
