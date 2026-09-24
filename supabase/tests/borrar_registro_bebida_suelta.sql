-- Prueba de borrar_registro_bebida_suelta (migración 20260924232000).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios, salas ni registros
-- de prueba.
--
-- Con tres usuarios sintéticos (Yo, Admin, Miembro) en una sala permanente
-- (Yo como fundador), comprueba:
--  - Yo puedo borrar mi propio registro (más allá de los 30s que permite
--    anular_bebida_suelta) y se me descuenta el XP ganado.
--  - Miembro NO puede borrar un registro ajeno (el de Yo).
--  - Admin SÍ puede borrar un registro ajeno (el de Miembro).
--  - Un registro de una noche (noche_id, sin sala_id) se rechaza siempre,
--    aunque lo intente su propio autor.
do $verif$
declare
  uYo uuid := gen_random_uuid();
  uAdmin uuid := gen_random_uuid();
  uMiembro uuid := gen_random_uuid();
  v_sala uuid;
  v_noche uuid;
  v_cerveza int := 1;
  v_reg_yo uuid;
  v_reg_miembro uuid;
  v_reg_noche uuid;
  v_xp_antes int;
  v_xp_despues int;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (uYo, 'zz-borrar-yo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uAdmin, 'zz-borrar-admin@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uMiembro, 'zz-borrar-miembro@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  insert into salas (nombre, codigo, config) values ('ZZ verif borrar', 'ZZ' || substr(md5(random()::text), 1, 8), '{"tipo":"permanente"}'::jsonb) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id, rol) values
    (v_sala, uYo, 'fundador'),
    (v_sala, uAdmin, 'admin'),
    (v_sala, uMiembro, 'miembro');

  -- Yo se borra su propio registro (aunque hayan pasado más de 30s).
  -- Se le da XP de sobra antes, para no toparse con el greatest(0, …) del
  -- descuento y poder comprobar la resta real.
  update perfiles set xp = 100 where id = uYo;
  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  insert into registros (sala_id, usuario_id, bebida_tipo_id, ts) values (v_sala, uYo, v_cerveza, now() - interval '2 hours') returning id into v_reg_yo;
  select xp into v_xp_antes from perfiles where id = uYo;
  perform borrar_registro_bebida_suelta(v_reg_yo);
  select xp into v_xp_despues from perfiles where id = uYo;
  v_out := v_out || jsonb_build_object('propio_borrado', not exists (select 1 from registros where id = v_reg_yo), 'xp_antes', v_xp_antes, 'xp_despues', v_xp_despues);
  v_ok := v_ok and not exists (select 1 from registros where id = v_reg_yo);
  v_ok := v_ok and v_xp_despues = v_xp_antes - 5;

  -- Miembro no puede borrar el registro de otro.
  insert into registros (sala_id, usuario_id, bebida_tipo_id, ts) values (v_sala, uAdmin, v_cerveza, now() - interval '2 hours') returning id into v_reg_miembro;
  perform set_config('request.jwt.claims', json_build_object('sub', uMiembro::text)::text, true);
  begin
    perform borrar_registro_bebida_suelta(v_reg_miembro);
    v_ok := false; v_out := v_out || jsonb_build_object('miembro_no_fallo', true);
  exception when others then
    v_out := v_out || jsonb_build_object('miembro_error', sqlerrm);
  end;
  v_ok := v_ok and exists (select 1 from registros where id = v_reg_miembro);

  -- Admin sí puede borrar el registro de otro (el de Admin, probado arriba).
  perform set_config('request.jwt.claims', json_build_object('sub', uAdmin::text)::text, true);
  perform borrar_registro_bebida_suelta(v_reg_miembro);
  v_out := v_out || jsonb_build_object('admin_borro_ajeno', not exists (select 1 from registros where id = v_reg_miembro));
  v_ok := v_ok and not exists (select 1 from registros where id = v_reg_miembro);

  -- Un registro de una noche nunca se puede borrar con esta función.
  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  insert into noches (sala_id, creada_por, inicio, fin_programado, estado) values (v_sala, uYo, now(), now() + interval '1 day', 'activa') returning id into v_noche;
  insert into registros (noche_id, usuario_id, bebida_tipo_id) values (v_noche, uYo, v_cerveza) returning id into v_reg_noche;
  begin
    perform borrar_registro_bebida_suelta(v_reg_noche);
    v_ok := false; v_out := v_out || jsonb_build_object('noche_no_fallo', true);
  exception when others then
    v_out := v_out || jsonb_build_object('noche_error', sqlerrm);
  end;
  v_ok := v_ok and exists (select 1 from registros where id = v_reg_noche);

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
