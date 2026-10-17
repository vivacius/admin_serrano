-- ==============================================================================
-- SERRANO GESTIÓN INMOBILIARIA — CARGA DE DATOS REALES EN SUPABASE
-- Schema: admin_serrano
-- ==============================================================================

BEGIN;
set search_path to admin_serrano, public;

-- 1. Usuarios (3)
insert into admin_serrano.usuarios (id, email, clave_hash, nombre, rol, activo)
values ('d89814a3-3e51-4537-bf9d-cb1771883bef', 'admin@serrano.local', 'cfd14b5ce7034a59da37562fa931bee9:3f535d6f638188c154479b2808b4026cb640c608bdb6a59d66eed92afc4e5e2b', 'Administrador Demo', 'administrador', true)
on conflict (id) do nothing;
insert into admin_serrano.usuarios (id, email, clave_hash, nombre, rol, activo)
values ('57089e0a-cbcb-4b3b-89da-5e60281a8ce6', 'cartera@serrano.local', 'a08efa2a5050e5d68c3dc4f910555f61:fe5f79dabc350976d8b5844dbb703b26d7e4148a726b29455daff4b6de6c253a', 'Cartera Demo', 'cartera', true)
on conflict (id) do nothing;
insert into admin_serrano.usuarios (id, email, clave_hash, nombre, rol, activo)
values ('2f8cfab1-52e5-473b-9e61-43f9029e7338', 'consulta@serrano.local', '40df4d2894b16796fa900933c1393aba:1269dc5afabe5efa426ab195c0c5abbdd98778172feeb61027f8a68740c70f7e', 'Consulta Demo', 'consulta', true)
on conflict (id) do nothing;

-- 2. Proyectos (3)
insert into admin_serrano.proyectos (id, codigo, nombre, municipio, departamento, descripcion, activo, id_origen)
values ('b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'AMA', 'Amaranta', 'El Cerrito', 'Valle del Cauca', NULL, true, NULL)
on conflict (id) do nothing;
insert into admin_serrano.proyectos (id, codigo, nombre, municipio, departamento, descripcion, activo, id_origen)
values ('767d3ed3-3c32-4a88-ba43-1eee9a072e72', 'PR02', 'Los Almendros', 'Palmira', 'Valle del Cauca', NULL, false, NULL)
on conflict (id) do nothing;
insert into admin_serrano.proyectos (id, codigo, nombre, municipio, departamento, descripcion, activo, id_origen)
values ('a654a1af-bf86-41f2-89c4-bc106784205d', 'PR03', 'Altos del Valle', 'Ginebra', 'Valle del Cauca', NULL, false, NULL)
on conflict (id) do nothing;

-- 3. Clientes (10)
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('13b138d0-2e85-48e4-bc94-7c8099c4d702', 'CC', '16862434', 'JAVIER GARCIA', '3174211264', NULL, 'yavierhjg@hotmail.com', 'Calle 5 #3-73 Santa Elena', NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('9c4dae03-0c46-45d9-861b-4aafa3fc87e4', 'CC', '1007888222', 'SANTIAGO CORREA CAMPAÑA', '3013555173', NULL, 'sacorreaca@unal.edu.co', 'Calle 8 #12-26 Pradera', NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('9d2147ce-a955-4d40-b2f6-5ee604d33275', 'CC', '1114835068', 'JUAN JOSE RAMIREZ SALAZAR', NULL, NULL, NULL, NULL, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('f1bc7c77-576b-481d-82e7-fac4aa6cc324', 'CC', '1007837072', 'DANIELA GUTIERREZ', '3116774637', NULL, 'linethdanielagv@hotmail.com', 'Calle 6 #2-06 Amaime', NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('83a5c5f8-ac0a-44b8-91c8-5990fd772407', 'CC', '1114829022', 'MANUEL BURBANO', NULL, NULL, NULL, NULL, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('8073d3bb-ca94-44ff-a46d-071a18170caa', 'CC', 'SIN-DOC-V042', 'PABLO PEREZ ROSERO', NULL, NULL, NULL, NULL, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('52cd0bd7-2d17-4119-be7d-a499ca820b9d', 'CC', 'SIN-DOC-V046', 'PABLO PEREZ ROSERO', NULL, NULL, NULL, NULL, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('7abcbc10-3635-4715-8120-24926eef05c4', 'CC', '1113626660', 'CLAUDIA FERNANDA INSUASTY ARCOS', '3108303822', NULL, 'Claudiaarcos369@gmail.com', 'CL 30 #30-77', NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('6c5b38f0-e0e5-4a1a-a955-e03e8ea82a1f', 'CC', '1130679252', 'MAYRINSABEL PAEZ HERNANDEZ', '3105355638', NULL, 'isabel.pez@gmail.com', 'Kr 1 #66-42 Cali', NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.clientes (id, tipo_documento, numero_documento, nombres, telefono_principal, telefono_secundario, email, direccion, municipio, observaciones)
values ('e1c23dde-624b-442a-90d0-b6f7dd6f78ee', 'CC', '31388763', 'MARIANITA DE JESUS SANCHEZ NAVIA', '3235829361', NULL, 'Crisanz812@gmail.com', 'Cra 108 #60 A 26 Cali', NULL, NULL)
on conflict (id) do nothing;

-- 4. Lotes (99)
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('6368a01c-8c8c-432a-80e3-cb5e793905ec', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-001', 350, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('b2d29b5f-6642-48bd-92c2-ceff9e066576', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-002', 656, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('5e80cbf3-864b-44f5-8480-1864b6bfd73a', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-003', 281, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('83dce3e7-9f27-4431-9199-419cdf1d1a6b', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-004', 251, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('075fe515-0b05-4db5-85c9-df43bc6a4ce5', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-005', 251, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('1933ba69-2eee-4693-ae17-6c1db8de66ff', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-006', 251, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('c405f4ca-1d14-4628-bd75-388313874d64', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-007', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('7bd312b0-b65b-4d42-afaa-e38478689645', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-008', 251, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('0ed29053-34ab-4cf4-971a-e94d879886e2', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-009', 252, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('2b1f8e1d-2192-473e-8c54-f0d23394ada4', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-010', 253, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('5f68da57-4855-4be9-8d04-65421cc8f19d', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-011', 255, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('b1cbe910-8d36-4e4c-b509-e0fe016e770a', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-012', 256, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a4228313-f4d8-4148-a871-15ab20c7539c', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-013', 260, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('ea08bab0-d1f8-4107-a83f-ed8c684fc729', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-014', 260, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('108e0c30-469f-40b7-8c0f-1f0214d42521', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-015', 260, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('63518b72-f56b-479d-b746-8cf1a2fa9e72', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-016', 260, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('81c70c3a-597b-46a2-90f3-86e486100e87', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-017', 258, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('4c19e8af-0f5f-444b-9b2c-35e2f0c130fd', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-018', 256, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('bbb25eeb-359c-4a26-921e-2a586c8db485', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-019', 254, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('f3c093c3-ee09-47b2-a315-ded31d683dc0', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-020', 510, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('96cfafc3-bb4a-48b7-ba43-90929897935b', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-021', 475, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('19967b55-9c18-4987-bc0f-603ff30b95c5', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-022', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('96ff041d-f107-4ad7-8cec-4bfdbbcd58ff', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-023', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('4a3e1d44-af4c-4c99-ae2e-c6676ac04482', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-024', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('d23f9326-1f58-4155-95d1-bf115d2a944d', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-025', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('3499495c-df9d-49ac-9e49-c6e074f74217', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-026', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('299f72f0-13fe-43d5-b497-a269b82a373d', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-027', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('d85866ec-4a9d-499c-9f90-5a1be9d9a151', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-028', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a15a63c5-c686-4896-aeb5-389e6bd85370', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-029', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('c13aad8e-3663-4e89-a1cb-a5af189618a5', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-030', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a52df43f-6168-4f6f-8576-d2ca1ff98ca0', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-031', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('e1e5b7cd-fff5-4cb3-886c-70e76f808a09', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-032', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('f790aa80-b60a-4e4b-8cbd-b5a4880b6e42', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-033', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a62dcfe9-8587-48c7-a1a7-0dbae8cee213', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-034', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('76ee1c3a-6454-4138-a1e9-71233bbcbd92', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-035', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('cee94d43-3096-4fbc-ae77-502c65657a4a', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-036', 323, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a6a5ca3b-c4ec-4039-a0ac-ff1a228ab463', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-037', 312, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('3bf202fc-6c19-48dc-9fb4-6c1ea7a2faa5', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-038', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('af2103a4-10b0-44c0-8040-39d3d1d63047', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-039', 485, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('6cb07d75-719e-4984-ba3b-de83fa631422', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-040', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('c77832fe-6ebe-47c2-841d-a99d75e9e266', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-041', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('ee951858-306c-45d5-90bd-064d2dfc1dbd', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-042', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a94b3a21-e6ba-4f6d-9130-de9681bfa2b4', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-043', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('616bad5c-fa07-4707-b9c2-21c3a78e6ed5', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-044', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('48b4759b-8382-4e3e-95a0-404df7cb1e06', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-045', 486, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('671feeba-0e55-489d-9f2f-0ddbcf1ac62e', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-046', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('61e496aa-a1a3-48a0-abcd-17a3d24bbba6', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-047', 505, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('92309511-83c8-4475-8fa5-46e228a46439', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-048', 505, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('23d67173-757d-4af1-b38c-58211aba4f30', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-049', 695, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('2cc32c8b-7404-49f1-9b41-5e642277571b', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-050', 408, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('21dcacc2-d65b-4d2e-bb66-6abd2bebc142', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-051', 523, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('45c92b96-e2c9-46e7-9b94-923a76fd5e3a', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-052', 560, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('0aefe7a2-bc21-4129-98ea-79f4211d188a', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-053', 504, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('5dd63a72-290e-4908-b319-be100c4bb9bf', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-054', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('d7fab62c-b7f9-4f67-b55d-4240cba7348e', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-055', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('cbcf7f7b-912d-46ed-955b-692a33496c52', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-056', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('f8c22f55-2c0d-4cb8-8c6a-ea87c0c1be06', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-057', 504, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('c3b8b87b-9508-4f6f-b790-7ddc4af4f5b6', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-058', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('8ff22a5b-808d-4c09-b22b-aa57152b9312', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-059', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('2cfbb601-6634-4371-9164-19566f6d23b7', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-060', 503, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('cc47aee4-fc51-4951-8820-40b49d39d1ec', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-061', 900, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('2730cabb-7e36-4abc-827e-85b61d6358e2', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-062', 600, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('db962344-45c9-45b7-8c74-91e372dbd612', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-063', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('7180e80c-5556-4fc5-8a3b-a36c35144aa6', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-064', 515, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('1bc56ced-2c28-4d0b-94b7-70591b23a01e', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-065', 590, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('11c45c90-f6cd-4aac-8aec-82195c321a95', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-066', 580, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('b7e8b6b1-0a6d-4965-af11-e95d66212202', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-067', 698, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('7df6ee80-df3d-49f3-bd8a-cb287cdb121d', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-068', 660, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a8db2505-ec08-4695-b9a3-2e4e15a4235e', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-069', 1000, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('0502b4b3-9821-4076-8f54-34dfbcff08e1', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-070', 1000, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('57406cb7-cf47-46b4-9a44-2ea4cf7fa588', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-071', 837, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('23e5da45-1139-49eb-b8b6-031e22d20343', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-072', 500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('180e0515-2825-44a8-af2a-0827b138cb29', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-073', 545, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('158b143d-3f0e-44b8-9363-8109eba4f829', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-074', 601, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('3dc2c8bf-92e3-4347-b204-887ff6e68658', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-075', 539, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('e966f5f3-79a0-4993-acf2-574a99b0e9c6', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-076', 578, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('a7166fc2-fbc2-4676-9639-82913f703528', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-077', 685, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('f8f6d0a3-fc31-4bff-9496-a9b23847c684', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-078', 2500, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('c2758ce9-2f16-4ed0-b035-3f2426960ea2', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-079', 300, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('417d6e73-79d9-430d-ba20-a4b5b0d58ec1', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-080', 300, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('fd893e12-c135-4a14-8be2-aef65cf39e30', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-081', 303, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('b58f634d-ad38-4c27-97e6-2f0d5037eef6', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-082', 300, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('465820a7-d5d3-4bf6-b324-434309bc37c1', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-083', 250, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('0edab39e-b38d-4533-9687-8928b141205d', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-084', 225, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('369cd563-16b7-414a-a65e-fecbf2814cc0', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-085', 335, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('de8918c1-dab4-4842-a1b8-d33027c7a6b9', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-086', 303, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('8f0287ad-beee-43bc-b8c6-fe3a41559f42', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-087', 311, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('34916437-aa05-4936-9bfa-318a3620ff42', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-088', 311, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('86b29e55-492c-41b2-b996-ade27ac069db', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-089', 309, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('9f95277c-5b47-4ce0-82db-756bd3becea2', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-090', 300, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('32c2bb84-3c45-46ee-bd9d-963f041ad09c', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-091', 366, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('323d7bc8-0299-4ef0-b219-e6022aed6f56', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-092', 275, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('7101e90d-1888-4e08-932d-9931404adf5d', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-093', 300, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('ffbeb514-f22d-4b24-9c5c-e3d3429eb480', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-094', 315, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('decaeb31-9e29-4718-ae3c-2e5e49ea0d07', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-095', 300, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('274b9642-516f-4731-a198-4201bb5699e1', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-096', 306, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('9f34251e-96b3-4fe4-ba88-e38ca34044c2', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-097', 323, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('4df02bf0-bf43-410a-a159-11a0c2a2d58e', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-098', 311, NULL, true)
on conflict (id) do nothing;
insert into admin_serrano.lotes (id, proyecto_id, codigo, area_m2, id_externo, activo)
values ('532e43b8-202d-434c-977c-fc7f92946126', 'b6c62cd4-e6d0-4350-9b2f-d351175c6d45', 'L-099', 262, NULL, true)
on conflict (id) do nothing;

-- 6. Negociaciones (19)
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('ebc689f2-df02-441a-85cb-15d3a9802236', 'V003', '5e80cbf3-864b-44f5-8480-1864b6bfd73a', '2026-08-19', 48891941, 24446016, NULL, NULL, NULL, NULL, 'vendido', 'V003', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('ac11cc70-ede1-4b5e-ab51-d7429ee02b87', 'V004', '83dce3e7-9f27-4431-9199-419cdf1d1a6b', '2026-08-19', 43672161, 21836080, NULL, NULL, NULL, NULL, 'vendido', 'V004', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('de5a95df-c1a2-438f-9766-be2902d9898f', 'V006', '1933ba69-2eee-4693-ae17-6c1db8de66ff', '2026-08-01', 65129741, 32564870, NULL, NULL, NULL, 'No tiene promesa', 'vendido', 'V006', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('b3dc8d8f-54c0-41f0-9aff-382e3909538e', 'V007', 'c405f4ca-1d14-4628-bd75-388313874d64', '2026-08-01', 64870259, 32435129, NULL, NULL, NULL, 'No tiene promesa', 'vendido', 'V007', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('670e7f5f-548b-43f9-b0fc-26b43d1a2f5c', 'V008', '7bd312b0-b65b-4d42-afaa-e38478689645', '2026-09-15', 90000000, 45000000, NULL, NULL, NULL, NULL, 'vendido', 'V008', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('5aea9f11-d7b8-4046-99fe-0c42137a0f38', 'V012', 'b1cbe910-8d36-4e4c-b509-e0fe016e770a', '2026-08-01', 59534884, 29767442, NULL, NULL, NULL, 'No tiene promesa', 'vendido', 'V012', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('cbe2aa25-275d-4196-a2eb-b0e38bb0f605', 'V013', 'a4228313-f4d8-4148-a871-15ab20c7539c', '2026-08-01', 60465116, 30232558, NULL, NULL, NULL, 'No tiene promesa', 'vendido', 'V013', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('8312cfbb-92db-47d0-82d1-97ab91a04a99', 'V039', 'af2103a4-10b0-44c0-8040-39d3d1d63047', '2026-08-21', 95000000, 47500000, NULL, NULL, NULL, NULL, 'vendido', 'V039', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('d8f59aed-dce2-44c9-b531-4649a1b35385', 'V042', 'ee951858-306c-45d5-90bd-064d2dfc1dbd', '2026-08-01', 85000000, 42500000, NULL, NULL, NULL, NULL, 'vendido', 'V042', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('14e651b0-c343-4c56-9aab-8711340572de', 'V045', '48b4759b-8382-4e3e-95a0-404df7cb1e06', '2026-08-21', 95000000, 47500000, NULL, NULL, NULL, NULL, 'vendido', 'V045', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('7ddda84a-6fc4-4d74-ab50-fce2e897d47f', 'V046', '671feeba-0e55-489d-9f2f-0ddbcf1ac62e', '2026-08-01', 85000000, 42500000, NULL, NULL, NULL, NULL, 'vendido', 'V046', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('8f948f82-f3f2-42fc-b11c-e884947b2546', 'V047', '61e496aa-a1a3-48a0-abcd-17a3d24bbba6', '2026-08-04', 85000000, 42500000, NULL, NULL, NULL, NULL, 'vendido', 'V047', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('d182dc34-296c-40b9-8017-cf12ea43bed3', 'V052', '45c92b96-e2c9-46e7-9b94-923a76fd5e3a', '2026-08-19', 97435897, 48717948, NULL, NULL, NULL, NULL, 'vendido', 'V052', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('97cd366d-fcfc-4603-ac50-23a49d22a287', 'V054', '5dd63a72-290e-4908-b319-be100c4bb9bf', '2026-08-04', 85000000, 42500000, NULL, NULL, NULL, NULL, 'vendido', 'V054', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('38effe04-b03d-44b8-82c0-672f7d7d0f35', 'V055', 'd7fab62c-b7f9-4f67-b55d-4240cba7348e', '2026-08-04', 85000000, 42500000, NULL, NULL, NULL, NULL, 'vendido', 'V055', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('5d066711-6175-460c-b69c-5cefbe6f17a8', 'V059', '8ff22a5b-808d-4c09-b22b-aa57152b9312', '2026-08-04', 85000000, 42500000, NULL, NULL, NULL, NULL, 'vendido', 'V059', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('a750d77c-b1bf-4002-8feb-e3de67c3c990', 'V074', '158b143d-3f0e-44b8-9363-8109eba4f829', '2026-10-02', 156260000, 78130000, NULL, NULL, NULL, NULL, 'vendido', 'V074', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('3bc0f3d9-7005-40ec-a78a-f1f0564f7d0c', 'V076', 'e966f5f3-79a0-4993-acf2-574a99b0e9c6', '2026-10-08', 150280000, 60000000, NULL, NULL, NULL, NULL, 'vendido', 'V076', NULL)
on conflict (id) do nothing;
insert into admin_serrano.negociaciones (id, codigo_venta, lote_id, fecha_negociacion, precio_acordado, cuota_inicial_pactada, vendedor, comisionista_id, porcentaje_comision, observaciones, estado, id_origen, created_by)
values ('bce03005-5fad-4afb-9848-19e583c2509b', 'V077', 'a7166fc2-fbc2-4676-9639-82913f703528', '2026-10-02', 178100000, 89050000, NULL, NULL, NULL, NULL, 'vendido', 'V077', NULL)
on conflict (id) do nothing;

-- 7. Compradores por Negociación (19)
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('ebc689f2-df02-441a-85cb-15d3a9802236', '13b138d0-2e85-48e4-bc94-7c8099c4d702', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('ac11cc70-ede1-4b5e-ab51-d7429ee02b87', '13b138d0-2e85-48e4-bc94-7c8099c4d702', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('de5a95df-c1a2-438f-9766-be2902d9898f', '9c4dae03-0c46-45d9-861b-4aafa3fc87e4', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('b3dc8d8f-54c0-41f0-9aff-382e3909538e', '9c4dae03-0c46-45d9-861b-4aafa3fc87e4', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('670e7f5f-548b-43f9-b0fc-26b43d1a2f5c', '9d2147ce-a955-4d40-b2f6-5ee604d33275', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('5aea9f11-d7b8-4046-99fe-0c42137a0f38', 'f1bc7c77-576b-481d-82e7-fac4aa6cc324', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('cbe2aa25-275d-4196-a2eb-b0e38bb0f605', 'f1bc7c77-576b-481d-82e7-fac4aa6cc324', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('8312cfbb-92db-47d0-82d1-97ab91a04a99', '83a5c5f8-ac0a-44b8-91c8-5990fd772407', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('d8f59aed-dce2-44c9-b531-4649a1b35385', '8073d3bb-ca94-44ff-a46d-071a18170caa', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('14e651b0-c343-4c56-9aab-8711340572de', '83a5c5f8-ac0a-44b8-91c8-5990fd772407', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('7ddda84a-6fc4-4d74-ab50-fce2e897d47f', '52cd0bd7-2d17-4119-be7d-a499ca820b9d', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('8f948f82-f3f2-42fc-b11c-e884947b2546', '7abcbc10-3635-4715-8120-24926eef05c4', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('d182dc34-296c-40b9-8017-cf12ea43bed3', '13b138d0-2e85-48e4-bc94-7c8099c4d702', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('97cd366d-fcfc-4603-ac50-23a49d22a287', '7abcbc10-3635-4715-8120-24926eef05c4', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('38effe04-b03d-44b8-82c0-672f7d7d0f35', '7abcbc10-3635-4715-8120-24926eef05c4', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('5d066711-6175-460c-b69c-5cefbe6f17a8', '7abcbc10-3635-4715-8120-24926eef05c4', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('a750d77c-b1bf-4002-8feb-e3de67c3c990', '6c5b38f0-e0e5-4a1a-a955-e03e8ea82a1f', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('3bc0f3d9-7005-40ec-a78a-f1f0564f7d0c', 'e1c23dde-624b-442a-90d0-b6f7dd6f78ee', true)
on conflict (negociacion_id, cliente_id) do nothing;
insert into admin_serrano.negociacion_clientes (negociacion_id, cliente_id, es_principal)
values ('bce03005-5fad-4afb-9848-19e583c2509b', '6c5b38f0-e0e5-4a1a-a955-e03e8ea82a1f', true)
on conflict (negociacion_id, cliente_id) do nothing;

-- 8. Abonos (18)
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('4154d295-84a9-4703-a0a2-c27a376184d3', '3bc0f3d9-7005-40ec-a78a-f1f0564f7d0c', '2026-10-08', 30000000, 'consignacion', NULL, '442774', 'DAVIVIENDA', NULL, 'vigente', false, NULL, NULL, NULL, NULL, NULL, NULL, 'A0001', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('3bbf399a-367d-4876-8526-7d05263eec47', '3bc0f3d9-7005-40ec-a78a-f1f0564f7d0c', '2026-10-13', 30000000, 'consignacion', NULL, '23381', 'DAVIVIENDA', NULL, 'vigente', false, NULL, NULL, NULL, NULL, NULL, NULL, 'A0002', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('cc686b2e-18fe-44c3-86d0-f3eca41f181f', '670e7f5f-548b-43f9-b0fc-26b43d1a2f5c', NULL, 45000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0003', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('33747a2b-077b-41fb-8633-5cf36c87272d', 'ebc689f2-df02-441a-85cb-15d3a9802236', NULL, 30000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0004', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('b227119d-d8b5-47f2-8306-5dce8ed00f86', 'ac11cc70-ede1-4b5e-ab51-d7429ee02b87', NULL, 30000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0005', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('e482f3e5-aeee-4290-92aa-8d64ec23a269', 'd182dc34-296c-40b9-8017-cf12ea43bed3', NULL, 30000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0006', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('8324f106-68c8-4f64-8d68-ee9f648e8479', 'de5a95df-c1a2-438f-9766-be2902d9898f', '2026-09-09', 18500000, 'consignacion', NULL, '713582', 'DAVIVIENDA', NULL, 'vigente', false, NULL, NULL, NULL, NULL, NULL, NULL, 'A0007', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('d12f0191-d84d-419d-b563-fc7762c9764a', 'b3dc8d8f-54c0-41f0-9aff-382e3909538e', '2026-09-09', 18500000, 'consignacion', NULL, '713582', 'DAVIVIENDA', NULL, 'vigente', false, NULL, NULL, NULL, NULL, NULL, NULL, 'A0008', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('0767e34c-924c-4720-8946-b2373cb74e01', 'd8f59aed-dce2-44c9-b531-4649a1b35385', NULL, 50000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0009', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('122fdf8f-5488-4554-becc-08a7cfe7024e', '7ddda84a-6fc4-4d74-ab50-fce2e897d47f', NULL, 50000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0010', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('f2475f38-ffb9-49da-af39-409001403823', '8312cfbb-92db-47d0-82d1-97ab91a04a99', '2026-09-21', 50000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0011', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('414200fb-e7fe-440e-8e41-433026f05234', '14e651b0-c343-4c56-9aab-8711340572de', '2026-09-21', 50000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0012', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('262e0fdb-ac14-4116-a5a8-bbacaddb4d53', '8f948f82-f3f2-42fc-b11c-e884947b2546', NULL, 75000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0013', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('701e37db-658f-43fd-acd7-71398c356b2d', '97cd366d-fcfc-4603-ac50-23a49d22a287', NULL, 75000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0014', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('f0385f96-1426-4c75-8cac-084a686556a4', '38effe04-b03d-44b8-82c0-672f7d7d0f35', NULL, 75000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0015', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('44f1cb89-0dff-4648-8bfe-ed98592c73e9', '5d066711-6175-460c-b69c-5cefbe6f17a8', NULL, 75000000, NULL, NULL, NULL, NULL, NULL, 'vigente', true, NULL, NULL, NULL, NULL, NULL, NULL, 'A0016', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('9f48410c-ede4-489e-a056-1a31354d5020', 'a750d77c-b1bf-4002-8feb-e3de67c3c990', '2026-10-01', 62000000, 'consignacion', NULL, NULL, 'DAVIVIENDA', NULL, 'vigente', false, NULL, NULL, NULL, NULL, NULL, NULL, 'A0017', NULL)
on conflict (id) do nothing;
insert into admin_serrano.abonos (id, negociacion_id, fecha_pago, valor, medio, banco, referencia, observaciones, comprobante_path, estado, pendiente_completar, excedente_autorizado_por, excedente_motivo, idempotency_key, anulado_por, anulado_at, motivo_anulacion, id_origen, created_by)
values ('674bba17-b88d-4bbb-bf37-31fd2e933fea', 'bce03005-5fad-4afb-9848-19e583c2509b', '2026-10-01', 62000000, 'consignacion', NULL, NULL, 'DAVIVIENDA', NULL, 'vigente', false, NULL, NULL, NULL, NULL, NULL, NULL, 'A0018', NULL)
on conflict (id) do nothing;

-- 9. Recibos oficiales (18)
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('d9dd7e71-51eb-48bf-a276-c4300a04f058', 1, '4154d295-84a9-4703-a0a2-c27a376184d3', '2026-10-17 14:47:49', 0, 30000000, 30000000, 120280000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('21a8f028-89bf-4d0b-bd37-dc92d63522f7', 2, '3bbf399a-367d-4876-8526-7d05263eec47', '2026-10-17 14:47:49', 30000000, 30000000, 60000000, 90280000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('c698afa9-9322-4e57-905f-90a40785b334', 3, 'cc686b2e-18fe-44c3-86d0-f3eca41f181f', '2026-10-17 14:47:49', 0, 45000000, 45000000, 45000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('3468c1cb-0dfb-4034-9c5b-0cb7656a1927', 4, '33747a2b-077b-41fb-8633-5cf36c87272d', '2026-10-17 14:47:49', 0, 30000000, 30000000, 18891941, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('08b33613-dc9b-48c7-a929-8e1bc46274a0', 5, 'b227119d-d8b5-47f2-8306-5dce8ed00f86', '2026-10-17 14:47:49', 0, 30000000, 30000000, 13672161, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('26b765da-0fc6-4c22-bdd3-e38aaafbf8c5', 6, 'e482f3e5-aeee-4290-92aa-8d64ec23a269', '2026-10-17 14:47:49', 0, 30000000, 30000000, 67435897, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('3792bd37-4b3e-4bdb-9589-1205ab8659f6', 7, '8324f106-68c8-4f64-8d68-ee9f648e8479', '2026-10-17 14:47:49', 0, 18500000, 18500000, 46629741, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('a495cfb2-7f58-4627-a556-d878f8e78873', 8, 'd12f0191-d84d-419d-b563-fc7762c9764a', '2026-10-17 14:47:49', 0, 18500000, 18500000, 46370259, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('c50463a2-a815-4253-b24c-c70c9391ab37', 9, '0767e34c-924c-4720-8946-b2373cb74e01', '2026-10-17 14:47:49', 0, 50000000, 50000000, 35000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('d0a763dc-d8e0-40b9-9e64-e07480d6269f', 10, '122fdf8f-5488-4554-becc-08a7cfe7024e', '2026-10-17 14:47:49', 0, 50000000, 50000000, 35000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('b819249b-a85b-4691-be2b-faa588d73e04', 11, 'f2475f38-ffb9-49da-af39-409001403823', '2026-10-17 14:47:49', 0, 50000000, 50000000, 45000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('d3a94c49-bd5f-4d3d-bfce-f023115ac80a', 12, '414200fb-e7fe-440e-8e41-433026f05234', '2026-10-17 14:47:49', 0, 50000000, 50000000, 45000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('ec7b3dc6-ebb1-45c9-a315-b98bf76db918', 13, '262e0fdb-ac14-4116-a5a8-bbacaddb4d53', '2026-10-17 14:47:49', 0, 75000000, 75000000, 10000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('68bcae84-2707-45e7-92cc-3b4f12a98261', 14, '701e37db-658f-43fd-acd7-71398c356b2d', '2026-10-17 14:47:49', 0, 75000000, 75000000, 10000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('50b6b8af-52a5-4a7d-9730-39d0243265aa', 15, 'f0385f96-1426-4c75-8cac-084a686556a4', '2026-10-17 14:47:49', 0, 75000000, 75000000, 10000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('50377635-a1f9-4d23-90bf-58f5c577bc06', 16, '44f1cb89-0dff-4648-8bfe-ed98592c73e9', '2026-10-17 14:47:49', 0, 75000000, 75000000, 10000000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('e874cca8-b4a1-4ce3-9c70-6091bd71a7e2', 17, '9f48410c-ede4-489e-a056-1a31354d5020', '2026-10-17 14:47:49', 0, 62000000, 62000000, 94260000, NULL, NULL)
on conflict (id) do nothing;
insert into admin_serrano.recibos (id, numero, abono_id, fecha_emision, total_anterior, valor_abono, total_acumulado, saldo_nuevo, pdf_path, created_by)
values ('f67e4aec-822b-4fba-95fd-294d1e079ff2', 18, '674bba17-b88d-4bbb-bf37-31fd2e933fea', '2026-10-17 14:47:49', 0, 62000000, 62000000, 116100000, NULL, NULL)
on conflict (id) do nothing;

-- 10. Contadores (2)
insert into admin_serrano.contadores (nombre, valor)
values ('recibos', 18)
on conflict (nombre) do update set valor = excluded.valor;
insert into admin_serrano.contadores (nombre, valor)
values ('admin_delete', 0)
on conflict (nombre) do update set valor = excluded.valor;

COMMIT;
