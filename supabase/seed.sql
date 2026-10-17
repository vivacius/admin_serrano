-- Datos DEMOSTRATIVOS (no reales). Proyecto Amaranta, V008 / L-008 / $90.000.000.
insert into proyectos(id, codigo, nombre, municipio, departamento)
values ('00000000-0000-0000-0000-0000000000a1','AMA','Amaranta','El Cerrito','Valle del Cauca')
on conflict do nothing;

insert into clientes(id, tipo_documento, numero_documento, nombres, telefono_principal)
values ('00000000-0000-0000-0000-0000000000c1','CC','1000000001','COMPRADOR DEMO','3000000000')
on conflict do nothing;

insert into lotes(id, proyecto_id, codigo)
values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','L-008')
on conflict do nothing;

insert into negociaciones(id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, estado)
values ('00000000-0000-0000-0000-0000000000d1','V008','00000000-0000-0000-0000-0000000000b1',
        current_date - 60, 90000000, 'vendido')
on conflict do nothing;

insert into negociacion_clientes(negociacion_id, cliente_id, es_principal)
values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000c1', true)
on conflict do nothing;

-- Abonos previos por 45.000.000 (insert directo: contexto de siembra, sin recibo)
insert into abonos(negociacion_id, fecha_pago, valor, medio, observaciones, id_origen)
values ('00000000-0000-0000-0000-0000000000d1', current_date - 50, 45000000, 'transferencia', 'DEMO', 'DEMO-A0003');
-- El nuevo abono de 5.000.000 se registra desde la app (registrar_abono) → recaudo 50M, saldo 40M.
