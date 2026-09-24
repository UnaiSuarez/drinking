-- Prueba de sitios_icono_y_borrado (migración 20260924233500).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios, salas ni sitios de
-- prueba.
--
-- Comprueba:
--  - crear_sitio guarda el icono elegido, y si no se manda ninguno cae al
--    📍 por defecto.
--  - mis_sitios_mapa devuelve icono, creado_por y descubridor_nombre.
--  - Descubridor puede borrar su sitio con eliminar_sitio.
--  - Otra persona (Amigo) NO puede borrar un sitio que no descubrió ella.
--  - Al borrar un sitio, el registro que lo tenía marcado se queda con
--    sitio_id a null (no se borra el registro).
do $verif$
declare
  uYo uuid := gen_random_uuid();
  uAmigo uuid := gen_random_uuid();
  v_sala uuid;
  v_cerveza int := 1;
  v_sitio_con_icono sitios;
  v_sitio_defecto sitios;
  v_reg uuid;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (uYo, 'zz-sitio-icono-yo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uAmigo, 'zz-sitio-icono-amigo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  insert into salas (nombre, codigo, config) values ('ZZ verif sitio icono', 'ZZ' || substr(md5(random()::text), 1, 8), '{"tipo":"permanente"}'::jsonb) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id) values (v_sala, uYo), (v_sala, uAmigo);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  v_sitio_con_icono := crear_sitio('ZZ Bar con icono', 40.4168, -3.7038, '🍺');
  v_sitio_defecto := crear_sitio('ZZ Bar sin icono', 40.42, -3.71, '');
  v_out := v_out || jsonb_build_object('icono_elegido', v_sitio_con_icono.icono, 'icono_defecto', v_sitio_defecto.icono);
  v_ok := v_ok and v_sitio_con_icono.icono = '🍺';
  v_ok := v_ok and v_sitio_defecto.icono = '📍';

  insert into registros (sala_id, usuario_id, bebida_tipo_id) values (v_sala, uYo, v_cerveza) returning id into v_reg;
  perform marcar_sitio_de_registro(v_reg, v_sitio_con_icono.id);

  v_out := v_out || jsonb_build_object('mapa', (select jsonb_agg(jsonb_build_object('nombre', nombre, 'icono', icono, 'descubridor', descubridor_nombre)) from mis_sitios_mapa() where sitio_id = v_sitio_con_icono.id));
  v_ok := v_ok and (select icono from mis_sitios_mapa() where sitio_id = v_sitio_con_icono.id) = '🍺';
  v_ok := v_ok and (select descubridor_nombre from mis_sitios_mapa() where sitio_id = v_sitio_con_icono.id) is not null;
  v_ok := v_ok and (select creado_por from mis_sitios_mapa() where sitio_id = v_sitio_con_icono.id) = uYo;

  -- Amigo no puede borrar un sitio que no descubrió.
  perform set_config('request.jwt.claims', json_build_object('sub', uAmigo::text)::text, true);
  begin
    perform eliminar_sitio(v_sitio_con_icono.id);
    v_ok := false; v_out := v_out || jsonb_build_object('amigo_no_fallo', true);
  exception when others then
    v_out := v_out || jsonb_build_object('amigo_error', sqlerrm);
  end;
  v_ok := v_ok and exists (select 1 from sitios where id = v_sitio_con_icono.id);

  -- Yo (el descubridor) sí puede borrarlo; el registro se queda sin sitio.
  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  perform eliminar_sitio(v_sitio_con_icono.id);
  v_out := v_out || jsonb_build_object(
    'sitio_borrado', not exists (select 1 from sitios where id = v_sitio_con_icono.id),
    'registro_sigue_existiendo', exists (select 1 from registros where id = v_reg),
    'registro_sitio_id', (select sitio_id from registros where id = v_reg)
  );
  v_ok := v_ok and not exists (select 1 from sitios where id = v_sitio_con_icono.id);
  v_ok := v_ok and exists (select 1 from registros where id = v_reg and sitio_id is null);

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
