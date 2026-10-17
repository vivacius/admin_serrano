-- Buckets privados y creación atómica de negociaciones

insert into storage.buckets (id, name, public) values
  ('comprobantes','comprobantes', false), ('recibos','recibos', false), ('documentos','documentos', false)
on conflict do nothing;

create policy storage_lectura on storage.objects for select to authenticated
  using (bucket_id in ('comprobantes','recibos','documentos') and mi_rol() in ('administrador','cartera','consulta'));
create policy storage_escritura on storage.objects for insert to authenticated
  with check (bucket_id in ('comprobantes','recibos','documentos') and tiene_rol('administrador','cartera'));

-- Crea (o reutiliza) lote y cliente, y registra la negociación en una sola transacción.
create or replace function crear_negociacion(
  p_proyecto_id uuid, p_codigo_lote text, p_codigo_venta text, p_fecha date,
  p_precio numeric, p_cuota_inicial numeric, p_vendedor text, p_observaciones text, p_estado estado_negociacion,
  p_tipo_doc tipo_documento_id, p_documento text, p_nombres text, p_telefono text, p_email text
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_lote uuid; v_cli uuid; v_neg uuid;
begin
  if not tiene_rol('administrador','cartera') then raise exception 'Sin permiso para crear negociaciones'; end if;
  select id into v_lote from lotes where proyecto_id = p_proyecto_id and codigo = trim(p_codigo_lote);
  if v_lote is null then
    insert into lotes(proyecto_id, codigo) values (p_proyecto_id, trim(p_codigo_lote)) returning id into v_lote;
  end if;

  select id into v_cli from clientes where tipo_documento = p_tipo_doc and numero_documento = trim(p_documento);
  if v_cli is null then
    insert into clientes(tipo_documento, numero_documento, nombres, telefono_principal, email)
    values (p_tipo_doc, trim(p_documento), upper(trim(p_nombres)), nullif(trim(p_telefono),''), nullif(trim(p_email),''))
    returning id into v_cli;
  end if;

  insert into negociaciones(codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada,
                            vendedor, observaciones, estado, created_by)
  values (trim(p_codigo_venta), v_lote, p_fecha, p_precio, p_cuota_inicial, nullif(trim(p_vendedor),''),
          p_observaciones, p_estado, auth.uid())
  returning id into v_neg;

  insert into negociacion_clientes(negociacion_id, cliente_id, es_principal) values (v_neg, v_cli, true);
  return v_neg;
end $$;
grant execute on function crear_negociacion to authenticated;
