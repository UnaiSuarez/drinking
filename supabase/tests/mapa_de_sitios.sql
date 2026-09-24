-- Prueba del mapa de sitios (migración 20260924224400).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios, salas, sitios ni
-- registros de prueba.
--
-- Con tres usuarios sintéticos (Yo, Amigo, Desconocido) en una sala
-- permanente, y Yo/Amigo amigos entre sí, comprueba:
--  - crear_sitio da de alta un sitio, y sitios_cercanos lo encuentra dentro
--    del radio (y no fuera de él).
--  - marcar_sitio_de_registro funciona en un registro suelto (sala_id no
--    nulo) de sala permanente.
--  - marcar_sitio_de_registro RECHAZA explícitamente un registro de una
--    noche (noche_id, sin sala_id) — es la restricción central de esta
--    migración: el mapa de sitios nunca aplica dentro de una noche.
--  - mis_sitios_mapa ve el sitio como 'ambos' cuando lo marcaron Yo y mi
--    Amigo.
--  - detalle_sitio devuelve el desglose de Yo y mi Amigo, pero nunca el del
--    Desconocido (no es amigo), aunque haya marcado el mismo sitio.
do $verif$
declare
  uYo uuid := gen_random_uuid();
  uAmigo uuid := gen_random_uuid();
  uDesconocido uuid := gen_random_uuid();
  v_sala uuid;
  v_noche uuid;
  v_cerveza int := 1;
  v_cubata int := 4;
  v_sitio sitios;
  v_reg_suelto uuid;
  v_reg_noche uuid;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (uYo, 'zz-mapa-yo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uAmigo, 'zz-mapa-amigo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uDesconocido, 'zz-mapa-descon@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  insert into salas (nombre, codigo, config) values ('ZZ verif mapa', 'ZZ' || substr(md5(random()::text), 1, 8), '{"tipo":"permanente"}'::jsonb) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id) values (v_sala, uYo), (v_sala, uAmigo), (v_sala, uDesconocido);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  perform enviar_solicitud_amistad(uAmigo);
  perform set_config('request.jwt.claims', json_build_object('sub', uAmigo::text)::text, true);
  perform responder_solicitud_amistad(uYo, true);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  v_sitio := crear_sitio('ZZ Bar de prueba', 40.4168, -3.7038);
  v_out := v_out || jsonb_build_object('sitio_creado', v_sitio.nombre);

  v_out := v_out || jsonb_build_object('cercanos', (select jsonb_agg(nombre) from sitios_cercanos(40.4168, -3.7038, 50)));
  v_ok := v_ok and (select count(*) from sitios_cercanos(40.4168, -3.7038, 50) where id = v_sitio.id) = 1;
  v_ok := v_ok and (select count(*) from sitios_cercanos(40.42, -3.9, 50)) = 0;

  insert into registros (sala_id, usuario_id, bebida_tipo_id) values (v_sala, uYo, v_cubata) returning id into v_reg_suelto;
  perform marcar_sitio_de_registro(v_reg_suelto, v_sitio.id);

  insert into noches (sala_id, creada_por, inicio, fin_programado, estado) values (v_sala, uYo, now(), now() + interval '1 day', 'activa') returning id into v_noche;
  insert into registros (noche_id, usuario_id, bebida_tipo_id) values (v_noche, uYo, v_cerveza) returning id into v_reg_noche;
  begin
    perform marcar_sitio_de_registro(v_reg_noche, v_sitio.id);
    v_ok := false; v_out := v_out || jsonb_build_object('noche_no_fallo', true);
  exception when others then
    v_out := v_out || jsonb_build_object('noche_error', sqlerrm);
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', uAmigo::text)::text, true);
  insert into registros (sala_id, usuario_id, bebida_tipo_id) values (v_sala, uAmigo, v_cerveza) returning id into v_reg_suelto;
  perform marcar_sitio_de_registro(v_reg_suelto, v_sitio.id);

  perform set_config('request.jwt.claims', json_build_object('sub', uDesconocido::text)::text, true);
  insert into registros (sala_id, usuario_id, bebida_tipo_id) values (v_sala, uDesconocido, v_cerveza) returning id into v_reg_suelto;
  perform marcar_sitio_de_registro(v_reg_suelto, v_sitio.id);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  v_out := v_out || jsonb_build_object('mapa_tipo', (select tipo from mis_sitios_mapa() where sitio_id = v_sitio.id));
  v_ok := v_ok and (select tipo from mis_sitios_mapa() where sitio_id = v_sitio.id) = 'ambos';

  v_out := v_out || jsonb_build_object('detalle', (select jsonb_agg(jsonb_build_object('nombre', nombre, 'bebida', bebida_nombre, 'cantidad', cantidad)) from detalle_sitio(v_sitio.id)));
  v_ok := v_ok and (select count(*) from detalle_sitio(v_sitio.id)) = 2;
  v_ok := v_ok and not exists (select 1 from detalle_sitio(v_sitio.id) where usuario_id = uDesconocido);

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
