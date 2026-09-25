-- Prueba de ranking_bebidas_sala (migración 20260924235000).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios, salas ni registros
-- de prueba.
--
-- Con dos usuarios (Yo con 3 registros, Otro con 1) en una sala permanente,
-- y un tercer usuario (Ajeno) sin acceso a la sala, comprueba:
--  - El ranking suma bien por usuario y ordena de mayor a menor.
--  - Un registro de una noche en la misma sala NO cuenta (sala_id nulo ahí).
--  - Ajeno, que no es miembro, no ve nada (lista vacía) al llamarla.
do $verif$
declare
  uYo uuid := gen_random_uuid();
  uOtro uuid := gen_random_uuid();
  uAjeno uuid := gen_random_uuid();
  v_sala uuid;
  v_noche uuid;
  v_cerveza int := 1;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (uYo, 'zz-ranking-yo@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uOtro, 'zz-ranking-otro@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uAjeno, 'zz-ranking-ajeno@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  insert into salas (nombre, codigo, config) values ('ZZ verif ranking', 'ZZ' || substr(md5(random()::text), 1, 8), '{"tipo":"permanente"}'::jsonb) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id) values (v_sala, uYo), (v_sala, uOtro);

  insert into registros (sala_id, usuario_id, bebida_tipo_id) values
    (v_sala, uYo, v_cerveza), (v_sala, uYo, v_cerveza), (v_sala, uYo, v_cerveza),
    (v_sala, uOtro, v_cerveza);

  insert into noches (sala_id, creada_por, inicio, fin_programado, estado) values (v_sala, uYo, now(), now() + interval '1 day', 'activa') returning id into v_noche;
  insert into registros (noche_id, usuario_id, bebida_tipo_id) values (v_noche, uYo, v_cerveza);

  perform set_config('request.jwt.claims', json_build_object('sub', uYo::text)::text, true);
  v_out := v_out || jsonb_build_object('ranking', (select jsonb_agg(jsonb_build_object('usuario_id', usuario_id, 'total', total)) from ranking_bebidas_sala(v_sala)));
  v_ok := v_ok and (select total from ranking_bebidas_sala(v_sala) where usuario_id = uYo) = 3;
  v_ok := v_ok and (select total from ranking_bebidas_sala(v_sala) where usuario_id = uOtro) = 1;
  v_ok := v_ok and (select count(*) from ranking_bebidas_sala(v_sala)) = 2;
  v_ok := v_ok and (select usuario_id from ranking_bebidas_sala(v_sala) order by total desc limit 1) = uYo;

  perform set_config('request.jwt.claims', json_build_object('sub', uAjeno::text)::text, true);
  v_out := v_out || jsonb_build_object('ajeno_ve', (select count(*) from ranking_bebidas_sala(v_sala)));
  v_ok := v_ok and (select count(*) from ranking_bebidas_sala(v_sala)) = 0;

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
