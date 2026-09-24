-- Prueba de cron_forzar_cierre_noches (cierre automático de noches).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla con
-- psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y, por
-- tanto, se deshace por completo: no deja usuarios, salas ni noches de prueba.
-- El JSON del error trae `ok` (true si todas las comprobaciones pasan) y el
-- detalle de cada escenario.
--
--  * Con la función corregida (20260924130000): `ok: true`.
--  * Con la función anterior: `ok: false`; el escenario B falla con
--    `relation "tmp_cartas_activas" already exists` y las noches siguen en
--    «cerrando», que es lo que ocurría en producción cada 10 minutos.
--
-- AISLAMIENTO DE LAS NOCHES REALES. El cron y finalizar_noche recorren TODAS las
-- noches, así que ejecutarlos sobre `public.noches` tocaría (y bloquearía) las
-- noches reales vencidas. Para evitarlo la prueba crea una tabla TEMPORAL
-- `noches` vacía: como pg_temp se busca siempre primero, las funciones (aunque
-- fijen `search_path = public`) leen y escriben esa copia y nunca `public.noches`.
-- Las noches sintéticas se insertan en las dos (la real solo para que las
-- claves foráneas de noche_jugadores/registros/logros_usuario se cumplan).
-- Antes de llamar al cron se comprueba con una función auxiliar que el
-- aislamiento funciona; si no, la prueba aborta sin haberlo llamado. Al final se
-- comprueba que ninguna fila real de `public.noches` cambió (xmin/xmax) ni fue
-- bloqueada. Solo se leen las noches reales (sin bloqueo) para esa comprobación.
-- Efectos sobre otras tablas: solo filas de los usuarios y la sala sintéticos.
--
-- Escenarios (cada uno en su subtransacción, que se deshace):
--   A) una sola noche vencida: sigue funcionando (regresión).
--   B) varias noches vencidas a la vez (una con dos jugadores y bebidas), una
--      activa pasada de plazo y una pendiente vieja: se cierran todas las
--      vencidas en una pasada; una segunda pasada no cambia nada (ni duplica
--      XP, logros, liga ni notificaciones). Una tabla temporal ajena `tmp_ajena`
--      sobrevive: solo se eliminan las cinco tablas concretas de finalizar_noche.
--   C) un error distinto al de las tablas temporales sigue siendo visible: con una
--      noche defectuosa entre las vencidas (finalizar_noche la rechaza porque su
--      inicio es de hace 1 h: sin admin, sin 24 h y sin confirmaciones), el cron
--      FALLA con ese motivo (no con el de tmp_*) y no queda cambio parcial. Es la
--      limitación conocida: una noche defectuosa bloquea el cierre de las demás,
--      pero de forma visible (`cron.job_run_details` en 'failed').
do $verif$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  v_sala uuid;
  n1 uuid; n2 uuid; n3 uuid; n_act uuid; n_pend uuid; n_bad uuid;
  v_tipo int;
  v_out jsonb := '{}'::jsonb;
  v_ok boolean := true;
  v_e text;
  v_real_antes text;
  v_real_despues text;
  s0 jsonb; s1 jsonb; s2 jsonb;
begin
  -- Huella de las noches reales antes de empezar (lectura sin bloqueo)
  select md5(coalesce(string_agg(id::text || ':' || xmin::text || ':' || xmax::text, ',' order by id), '')) into v_real_antes from public.noches;

  -- Aislamiento: copia temporal vacía de noches + comprobación previa
  create temp table noches (like public.noches including all) on commit drop;
  create function pg_temp.zz_ve_noches() returns bigint language sql security definer set search_path to 'public' as 'select count(*) from noches';
  if pg_temp.zz_ve_noches() <> 0 then
    raise exception 'ABORTADO: el aislamiento de noches no funciona; no se ha llamado al cron';
  end if;
  v_out := v_out || jsonb_build_object('aislamiento_las_funciones_ven_solo_la_copia_temporal', true);

  -- Tabla temporal ajena a finalizar_noche: debe sobrevivir a la limpieza
  create temp table tmp_ajena (x int) on commit drop;

  select bebida_tipo_id into v_tipo from registros limit 1;
  insert into auth.users (id, email, instance_id, aud, role) values
    (u1, 'zz-verif-' || u1 || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (u2, 'zz-verif-' || u2 || '@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into salas (nombre, codigo) values ('ZZ verif cron', 'ZZ' || substr(md5(random()::text), 1, 8)) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id) values (v_sala, u1), (v_sala, u2);

  -- Tres noches vencidas (24 h en «cerrando»); n2 con dos jugadores y bebidas
  insert into public.noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
    values (v_sala, u1, now() - interval '4 days', now() - interval '3 days', 'cerrando', now() - interval '25 hours') returning id into n1;
  insert into public.noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
    values (v_sala, u1, now() - interval '4 days', now() - interval '3 days', 'cerrando', now() - interval '25 hours') returning id into n2;
  insert into public.noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
    values (v_sala, u1, now() - interval '4 days', now() - interval '3 days', 'cerrando', now() - interval '25 hours') returning id into n3;
  insert into pg_temp.noches select * from public.noches where id in (n1, n2, n3);
  insert into noche_jugadores (noche_id, usuario_id) values (n2, u1), (n2, u2);
  insert into registros (noche_id, usuario_id, bebida_tipo_id, ts) values
    (n2, u1, v_tipo, now() - interval '84 hours'),
    (n2, u1, v_tipo, now() - interval '83 hours'),
    (n2, u1, v_tipo, now() - interval '82 hours'),
    (n2, u2, v_tipo, now() - interval '84 hours');

  -- A) Una sola noche vencida (regresión)
  begin
    update pg_temp.noches set fin_gracia = now() where id in (n2, n3);
    v_e := null;
    begin
      perform cron_forzar_cierre_noches();
    exception when others then
      v_e := left(sqlerrm, 100);
    end;
    v_out := v_out || jsonb_build_object(
      'A_error', v_e,
      'A_estados', (select jsonb_object_agg(case id when n1 then 'n1' when n2 then 'n2' when n3 then 'n3' end, estado) from pg_temp.noches where id in (n1, n2, n3)));
    v_ok := v_ok and v_e is null
      and (select estado from pg_temp.noches where id = n1) = 'cerrada'
      and (select estado from pg_temp.noches where id = n2) = 'cerrando'
      and (select estado from pg_temp.noches where id = n3) = 'cerrando';
    raise exception 'fin_A';
  exception when others then
    if sqlerrm <> 'fin_A' then v_ok := false; v_out := v_out || jsonb_build_object('A_inesperado', sqlerrm); end if;
  end;

  -- B) Varias vencidas a la vez + activa pasada + pendiente vieja; dos pasadas
  begin
    insert into public.noches (sala_id, creada_por, inicio, fin_programado, estado)
      values (v_sala, u1, now() - interval '3 days', now() - interval '2 days', 'activa') returning id into n_act;
    insert into public.noches (sala_id, creada_por, estado, created_at)
      values (v_sala, u1, 'pendiente', now() - interval '2 days') returning id into n_pend;
    insert into pg_temp.noches select * from public.noches where id in (n_act, n_pend);

    s0 := jsonb_build_object(
      'perfiles', (select jsonb_agg(to_jsonb(p) order by p.id) from perfiles p where p.id in (u1, u2)),
      'jugadores', (select jsonb_agg(to_jsonb(nj) order by nj.noche_id, nj.usuario_id) from noche_jugadores nj where nj.noche_id in (n1, n2, n3, n_act)),
      'logros', (select count(*) from logros_usuario where usuario_id in (u1, u2)),
      'liga', (select jsonb_agg(to_jsonb(l) order by l.usuario_id) from liga l where l.temporada_id in (select id from temporadas where sala_id = v_sala)),
      'temporadas', (select count(*) from temporadas where sala_id = v_sala),
      'notificaciones', (select count(*) from notificaciones_pendientes where usuario_id in (u1, u2)),
      'noches', (select jsonb_agg(to_jsonb(n) order by n.id) from pg_temp.noches n where n.id in (n1, n2, n3, n_act)));

    v_e := null;
    begin
      perform cron_forzar_cierre_noches();
    exception when others then
      v_e := left(sqlerrm, 100);
    end;
    s1 := jsonb_build_object(
      'perfiles', (select jsonb_agg(to_jsonb(p) order by p.id) from perfiles p where p.id in (u1, u2)),
      'jugadores', (select jsonb_agg(to_jsonb(nj) order by nj.noche_id, nj.usuario_id) from noche_jugadores nj where nj.noche_id in (n1, n2, n3, n_act)),
      'logros', (select count(*) from logros_usuario where usuario_id in (u1, u2)),
      'liga', (select jsonb_agg(to_jsonb(l) order by l.usuario_id) from liga l where l.temporada_id in (select id from temporadas where sala_id = v_sala)),
      'temporadas', (select count(*) from temporadas where sala_id = v_sala),
      'notificaciones', (select count(*) from notificaciones_pendientes where usuario_id in (u1, u2)),
      'noches', (select jsonb_agg(to_jsonb(n) order by n.id) from pg_temp.noches n where n.id in (n1, n2, n3, n_act)));
    v_out := v_out || jsonb_build_object(
      'B_error_pasada_1', v_e,
      'B_estados_pasada_1', (select jsonb_object_agg(case id when n1 then 'n1' when n2 then 'n2' when n3 then 'n3' when n_act then 'activa_pasada' end, estado) from pg_temp.noches where id in (n1, n2, n3, n_act)),
      'B_pendiente_vieja_borrada', not exists (select 1 from pg_temp.noches where id = n_pend),
      'B_tabla_temporal_ajena_sobrevive', to_regclass('pg_temp.tmp_ajena') is not null,
      'B_jugadores_con_posicion_final', (select count(*) from noche_jugadores where noche_id = n2 and posicion_final is not null),
      'B_filas_de_liga', (select count(*) from liga where temporada_id in (select id from temporadas where sala_id = v_sala)),
      'B_xp_u1_antes_despues', jsonb_build_array(s0->'perfiles'->0->'xp', s1->'perfiles'->0->'xp'),
      'B_logros_antes_despues', jsonb_build_array(s0->'logros', s1->'logros'));
    v_ok := v_ok and v_e is null
      and (select count(*) from pg_temp.noches where id in (n1, n2, n3) and estado = 'cerrada') = 3
      and (select estado = 'cerrando' and fin_gracia is not null and votacion_categoria is not null from pg_temp.noches where id = n_act)
      and not exists (select 1 from pg_temp.noches where id = n_pend)
      and to_regclass('pg_temp.tmp_ajena') is not null
      and (select count(*) from noche_jugadores where noche_id = n2 and posicion_final is not null) = 2
      and (select count(*) from liga where temporada_id in (select id from temporadas where sala_id = v_sala)) = 2
      and s0 <> s1;   -- la pasada 1 sí produjo efectos (si no, la comparación con la pasada 2 no probaría nada)

    -- Segunda pasada: no debe cambiar nada
    v_e := null;
    begin
      perform cron_forzar_cierre_noches();
    exception when others then
      v_e := left(sqlerrm, 100);
    end;
    s2 := jsonb_build_object(
      'perfiles', (select jsonb_agg(to_jsonb(p) order by p.id) from perfiles p where p.id in (u1, u2)),
      'jugadores', (select jsonb_agg(to_jsonb(nj) order by nj.noche_id, nj.usuario_id) from noche_jugadores nj where nj.noche_id in (n1, n2, n3, n_act)),
      'logros', (select count(*) from logros_usuario where usuario_id in (u1, u2)),
      'liga', (select jsonb_agg(to_jsonb(l) order by l.usuario_id) from liga l where l.temporada_id in (select id from temporadas where sala_id = v_sala)),
      'temporadas', (select count(*) from temporadas where sala_id = v_sala),
      'notificaciones', (select count(*) from notificaciones_pendientes where usuario_id in (u1, u2)),
      'noches', (select jsonb_agg(to_jsonb(n) order by n.id) from pg_temp.noches n where n.id in (n1, n2, n3, n_act)));
    v_out := v_out || jsonb_build_object(
      'B_error_pasada_2', v_e,
      'B_pasada_2_no_cambia_nada', s1 = s2,
      'B_estados_pasada_2', (select jsonb_object_agg(case id when n1 then 'n1' when n2 then 'n2' when n3 then 'n3' when n_act then 'activa_pasada' end, estado) from pg_temp.noches where id in (n1, n2, n3, n_act)));
    v_ok := v_ok and v_e is null and s1 = s2;
    raise exception 'fin_B';
  exception when others then
    if sqlerrm <> 'fin_B' then v_ok := false; v_out := v_out || jsonb_build_object('B_inesperado', sqlerrm); end if;
  end;

  -- C) Un error distinto sigue siendo visible (el trabajo falla) y no deja cambios parciales
  begin
    insert into public.noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, u1, now() - interval '1 hour', now() - interval '30 minutes', 'cerrando', now() - interval '30 hours') returning id into n_bad;
    insert into pg_temp.noches select * from public.noches where id = n_bad;
    v_e := null;
    begin
      perform finalizar_noche(n_bad);
    exception when others then
      v_e := left(sqlerrm, 100);
    end;
    v_out := v_out || jsonb_build_object('C_finalizar_noche_directo_rechaza_la_defectuosa', v_e);
    v_ok := v_ok and v_e is not null;   -- si no falla sola, el escenario no demuestra nada
    v_e := null;
    begin
      perform cron_forzar_cierre_noches();
    exception when others then
      v_e := left(sqlerrm, 100);
    end;
    v_out := v_out || jsonb_build_object(
      'C_error_del_cron', v_e,
      'C_estados_tras_el_fallo', (select jsonb_object_agg(case id when n1 then 'n1' when n2 then 'n2' when n3 then 'n3' when n_bad then 'defectuosa' end, estado) from pg_temp.noches where id in (n1, n2, n3, n_bad)));
    v_ok := v_ok
      and v_e is not null                       -- el cron falla (visible en job_run_details)
      and v_e not like '%tmp_%'                  -- y no por las tablas temporales
      and v_e like 'Todavía falta%'              -- sino por el motivo real de la noche defectuosa
      and (select count(*) from pg_temp.noches where id in (n1, n2, n3, n_bad) and estado = 'cerrando') = 4;  -- sin cambio parcial
    raise exception 'fin_C';
  exception when others then
    if sqlerrm <> 'fin_C' then v_ok := false; v_out := v_out || jsonb_build_object('C_inesperado', sqlerrm); end if;
  end;

  -- Ninguna fila real de noches ha cambiado ni ha sido bloqueada
  select md5(coalesce(string_agg(id::text || ':' || xmin::text || ':' || xmax::text, ',' order by id), '')) into v_real_despues
  from public.noches where sala_id <> v_sala;
  v_out := v_out || jsonb_build_object('noches_reales_sin_tocar', v_real_antes = v_real_despues);
  v_ok := v_ok and v_real_antes = v_real_despues;

  raise exception 'RESULTADO_VERIFICACION %', jsonb_pretty(jsonb_build_object('ok', coalesce(v_ok, false)) || v_out);
end
$verif$;
