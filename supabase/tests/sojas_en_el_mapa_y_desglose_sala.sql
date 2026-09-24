-- Prueba de sojas_en_el_mapa_y_desglose_sala (migración 20260925001500).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios, salas ni registros
-- de prueba.
--
-- Con Yo y Amigo (amigos entre sí) en una sala permanente, comprueba:
--  - marcar_sitio_de_soja funciona en una SOJA sin noche (noche_id nulo).
--  - marcar_sitio_de_soja RECHAZA una SOJA de una noche (noche_id no nulo)
--    — la misma restricción central que ya tenía el mapa de sitios.
--  - mis_sitios_mapa ve el sitio como 'ambos' cuando lo marcaron Yo (con
--    una bebida suelta) y Amigo (con una SOJA).
--  - detalle_sitio devuelve ambas filas (bebida suelta con su
--    bebida_tipo_id, SOJA con bebida_tipo_id nulo y nombre/icono resuelto).
--  - desglose_bebidas_sala distingue una bebida concreta del catálogo (con
--    su nombre y rareza) de una genérica (solo el tipo, sin catálogo) y
--    suma bien las cantidades por jugador.
do $verif$
declare
  uYo uuid := gen_random_uuid();
  uAmigo uuid := gen_random_uuid();
  v_sala uuid;
  v_noche uuid;
  v_cerveza int := 1;
  v_cubata int := 4;
  v_catalogo uuid;
  v_sitio sitios;
  v_reg_bebida uuid;
  v_reg_soja uuid;
  v_reg_soja_noche uuid;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (uYo, 'zz-sojas-mapa-yo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uAmigo, 'zz-sojas-mapa-amigo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  insert into salas (nombre, codigo, config) values ('ZZ verif sojas mapa', 'ZZ' || substr(md5(random()::text), 1, 8), '{"tipo":"permanente"}'::jsonb) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id) values (v_sala, uYo), (v_sala, uAmigo);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  perform enviar_solicitud_amistad(uAmigo);
  perform set_config('request.jwt.claims', json_build_object('sub', uAmigo::text)::text, true);
  perform responder_solicitud_amistad(uYo, true);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  v_sitio := crear_sitio('ZZ Bar sojas', 40.4168, -3.7038, '🍺');

  -- Yo marca una bebida suelta concreta del catálogo.
  select id into v_catalogo from bebidas_catalogo where categoria_id = v_cerveza limit 1;
  insert into registros (sala_id, usuario_id, bebida_tipo_id, bebida_catalogo_id) values (v_sala, uYo, v_cerveza, v_catalogo) returning id into v_reg_bebida;
  perform marcar_sitio_de_registro(v_reg_bebida, v_sitio.id);
  -- Yo también registra la misma bebida en "rápido" (sin catálogo, genérica).
  insert into registros (sala_id, usuario_id, bebida_tipo_id) values (v_sala, uYo, v_cerveza);
  insert into registros (sala_id, usuario_id, bebida_tipo_id) values (v_sala, uYo, v_cubata);

  -- Amigo marca una SOJA sin noche en el mismo sitio.
  perform set_config('request.jwt.claims', json_build_object('sub', uAmigo::text)::text, true);
  perform registrar_soja(v_sala, 'agua');
  select id into v_reg_soja from sojas_registros where sala_id = v_sala and usuario_id = uAmigo and noche_id is null;
  perform marcar_sitio_de_soja(v_reg_soja, v_sitio.id);

  -- Una SOJA de una noche no se puede marcar nunca.
  -- Con 2 miembros en una sala permanente, el trigger de creación fuerza
  -- la noche a 'pendiente' (espera a un segundo jugador): se activa a
  -- mano con un update aparte, que no pasa por ese trigger de inserción.
  insert into noches (sala_id, creada_por, inicio, fin_programado, estado) values (v_sala, uYo, now(), now() + interval '1 day', 'activa') returning id into v_noche;
  update noches set estado = 'activa', fin_programado = now() + interval '1 day' where id = v_noche;
  insert into noche_jugadores (noche_id, usuario_id) values (v_noche, uAmigo);
  perform registrar_soja(v_sala, 'zumo', v_noche);
  select id into v_reg_soja_noche from sojas_registros where noche_id = v_noche;
  begin
    perform marcar_sitio_de_soja(v_reg_soja_noche, v_sitio.id);
    v_ok := false; v_out := v_out || jsonb_build_object('noche_no_fallo', true);
  exception when others then
    v_out := v_out || jsonb_build_object('noche_error', sqlerrm);
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  v_out := v_out || jsonb_build_object('mapa_tipo', (select tipo from mis_sitios_mapa() where sitio_id = v_sitio.id));
  v_ok := v_ok and (select tipo from mis_sitios_mapa() where sitio_id = v_sitio.id) = 'ambos';

  v_out := v_out || jsonb_build_object('detalle', (select jsonb_agg(jsonb_build_object('nombre', nombre, 'bebida', bebida_nombre, 'tipo_id', bebida_tipo_id, 'cantidad', cantidad)) from detalle_sitio(v_sitio.id)));
  v_ok := v_ok and (select count(*) from detalle_sitio(v_sitio.id) where usuario_id = uAmigo and bebida_tipo_id is null and bebida_nombre = 'Agua') = 1;
  v_ok := v_ok and (select count(*) from detalle_sitio(v_sitio.id) where usuario_id = uYo and bebida_tipo_id = v_cerveza) = 1;

  v_out := v_out || jsonb_build_object('desglose', (select jsonb_agg(jsonb_build_object('tipo', bebida_tipo_nombre, 'catalogo', bebida_catalogo_nombre, 'cantidad', cantidad)) from desglose_bebidas_sala(v_sala) where usuario_id = uYo));
  v_ok := v_ok and (select cantidad from desglose_bebidas_sala(v_sala) where usuario_id = uYo and bebida_catalogo_id = v_catalogo) = 1;
  v_ok := v_ok and (select cantidad from desglose_bebidas_sala(v_sala) where usuario_id = uYo and bebida_tipo_id = v_cerveza and bebida_catalogo_id is null) = 1;
  v_ok := v_ok and (select cantidad from desglose_bebidas_sala(v_sala) where usuario_id = uYo and bebida_tipo_id = v_cubata) = 1;
  v_ok := v_ok and (select count(*) from desglose_bebidas_sala(v_sala) where usuario_id = uAmigo) = 0;

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
