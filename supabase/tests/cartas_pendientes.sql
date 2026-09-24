-- Prueba de las cuatro cartas legendarias/épicas que PR #21 bloqueó
-- provisionalmente en el cliente (trono-del-campeon, dado-maldito,
-- brindis-prohibido, caliz-final-boss) por no tener, según ese PR,
-- "resolución en el cliente ni en las migraciones versionadas".
--
-- Resultado de esta prueba: SÍ tienen resolución completa, en
-- finalizar_noche, desde antes de que existieran migraciones versionadas
-- (por eso no aparecía en el repo — ver «Lo que todavía no está en el
-- repositorio» en supabase/README.md). El bloqueo de PR #21 se puede retirar
-- sin más trabajo de backend: las cuatro cartas ya funcionan en producción,
-- resueltas por el mecanismo genérico (usarCartaEnNoche escribe una entrada
-- en avatar_config.inventario.cartasActivas; finalizar_noche la lee y aplica
-- el efecto al cerrar la noche), igual que el resto de cartas "de cierre".
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios, salas ni noches de
-- prueba. El JSON del error trae `ok` (true si todas las comprobaciones
-- pasan) y el detalle de cada escenario.
--
-- METODOLOGÍA: control vs prueba. Para cada carta se simula una noche de
-- control (sin la carta) y una noche de prueba (con la carta, mismos
-- registros), y se compara el pl_ganados resultante. Esto aísla el efecto
-- exacto de la carta sin tener que calcular a mano el resto de la fórmula
-- (bonus de volumen, posición, votos, logros...), que es idéntica en ambas
-- noches siempre que ni la posición final ni los logros dependan de
-- pl_ganados (no dependen: se fijan antes de sumar las cartas).
--
-- IMPORTANTE: cada escenario usa un par/trío de usuarios NUEVO y exclusivo,
-- nunca reutilizado entre control y prueba ni entre escenarios. Varios
-- logros de "racha" y "veterano" comprueban across TODAS las noches del
-- usuario (no están acotados a una noche concreta), así que reutilizar
-- usuarios entre llamadas sucesivas a finalizar_noche contamina la
-- comparación control-vs-prueba en cuanto se cruza el umbral (3 noches
-- seguidas asistidas). Con usuarios exclusivos, cada uno solo "asiste" a una
-- noche en toda la prueba y ningún umbral se alcanza nunca.
--
-- También hay que fijar fin_gracia en el FUTURO al crear cada noche: si ya
-- ha pasado, el trigger set_registro_retroactivo marca cualquier registro
-- insertado como retroactivo (cuenta como máximo 1 punto), lo que rompería
-- el cálculo del "último trago" de Caliz Final Boss.
--
-- Y hay que limpiar a mano las tablas temporales `on commit drop` de
-- finalizar_noche entre llamada y llamada (pg_temp.tmp_cartas_activas y las
-- otras cuatro): llamarla varias veces en la misma transacción, como aquí,
-- fallaría igual que el bug que corrigió la migración 20260924130000 (ver
-- «Cierre automático de noches» en supabase/README.md) si no se limpian.
--
-- Escenarios:
--   A) Trono del Campeón + Caliz Final Boss: control (uA gana, sin cartas)
--      vs prueba (uC gana con las mismas bebidas, con ambas cartas activas).
--      Se espera +1 cofre épico y +12 PL (el último trago, un cubata de 3
--      puntos, cuenta x5: los 4x extra son 3*4=12).
--   B) Brindis Prohibido: control (uE/uF) vs prueba (uG/uH, mismos
--      registros). El caster anota 6 puntos y el objetivo 1; combinado=7,
--      /2=3 (división entera): el caster debería bajar en 3 y el objetivo
--      subir en 2, quedando ambos en 3.
--   C) Dado Maldito: control (uI/uJ/uK) + los tres resultados posibles
--      (trío exclusivo cada uno), eligiendo a mano un activa_id cuyo
--      abs(hashtext(id)) % 3 dé 0, 1 y 2 respectivamente: +3 a toda la sala,
--      -2 a toda la sala, o +10 a exactamente un jugador al azar.
do $verif$
declare
  v_sala uuid;
  v_cerveza int := 1;
  v_cubata int := 4;
  uA uuid := gen_random_uuid(); uB uuid := gen_random_uuid();
  uC uuid := gen_random_uuid(); uD uuid := gen_random_uuid();
  uE uuid := gen_random_uuid(); uF uuid := gen_random_uuid();
  uG uuid := gen_random_uuid(); uH uuid := gen_random_uuid();
  uI uuid := gen_random_uuid(); uJ uuid := gen_random_uuid(); uK uuid := gen_random_uuid();
  uL uuid := gen_random_uuid(); uM uuid := gen_random_uuid(); uN uuid := gen_random_uuid();
  uO uuid := gen_random_uuid(); uP uuid := gen_random_uuid(); uQ uuid := gen_random_uuid();
  uR uuid := gen_random_uuid(); uS uuid := gen_random_uuid(); uT uuid := gen_random_uuid();
  n_solo_ctrl uuid; n_solo_test uuid;
  n_brindis_ctrl uuid; n_brindis_test uuid;
  n_dado_ctrl uuid; n_dado_0 uuid; n_dado_1 uuid; n_dado_2 uuid;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
  v_epico_ctrl int; v_epico_test int;
  v_pl_solo_ctrl int; v_pl_solo_test int;
  v_pl_u1_ctrl int; v_pl_u2_ctrl int; v_pl_u1_test int; v_pl_u2_test int;
  v_pl_d_ctrl_u1 int; v_pl_d_ctrl_u2 int; v_pl_d_ctrl_u3 int;
  v_delta0_u1 int; v_delta0_u2 int; v_delta0_u3 int;
  v_delta1_u1 int; v_delta1_u2 int; v_delta1_u3 int;
  v_delta2_u1 int; v_delta2_u2 int; v_delta2_u3 int;
  v_ganadores_10 int;
begin
  create or replace function pg_temp.zz_limpia_tmp_finalizar() returns void
    language sql as $f$
      drop table if exists pg_temp.tmp_cartas_activas, pg_temp.tmp_personaje_equipado,
        pg_temp.tmp_registro_puntos, pg_temp.tmp_bono_cartas_flat, pg_temp.tmp_liga_antes;
    $f$;

  insert into auth.users (id, email, instance_id, aud, role)
  select x.id, 'zz-verif-cartas-' || x.id || '@example.invalid',
         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
  from unnest(array[uA,uB,uC,uD,uE,uF,uG,uH,uI,uJ,uK,uL,uM,uN,uO,uP,uQ,uR,uS,uT]) as x(id);

  insert into salas (nombre, codigo) values ('ZZ verif cartas', 'ZZ' || substr(md5(random()::text), 1, 8)) returning id into v_sala;
  insert into sala_miembros (sala_id, usuario_id)
  select v_sala, x from unnest(array[uA,uB,uC,uD,uE,uF,uG,uH,uI,uJ,uK,uL,uM,uN,uO,uP,uQ,uR,uS,uT]) as x;

  -- ===== A) Trono del Campeón + Caliz Final Boss: control (uA/uB) vs prueba (uC/uD) =====
  begin
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uA, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_solo_ctrl;
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uC, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_solo_test;
    insert into noche_jugadores (noche_id, usuario_id) values
      (n_solo_ctrl, uA), (n_solo_ctrl, uB), (n_solo_test, uC), (n_solo_test, uD);
    insert into registros (noche_id, usuario_id, bebida_tipo_id, ts) values
      (n_solo_ctrl, uA, v_cerveza, now() - interval '29 hours'),
      (n_solo_ctrl, uA, v_cubata, now() - interval '28 hours'),
      (n_solo_test, uC, v_cerveza, now() - interval '29 hours'),
      (n_solo_test, uC, v_cubata, now() - interval '28 hours');

    update perfiles set avatar_config = jsonb_set(
      coalesce(avatar_config, '{}'::jsonb) || jsonb_build_object('inventario', coalesce(avatar_config->'inventario', '{}'::jsonb)),
      '{inventario,cartasActivas}',
      jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'cartaId', 'trono-del-campeon', 'nocheId', n_solo_test::text,
          'usuarioId', uC::text, 'usuarioNombre', 'zz-uC', 'usadaEn', (now() - interval '29 hours')::text),
        jsonb_build_object('id', gen_random_uuid()::text, 'cartaId', 'caliz-final-boss', 'nocheId', n_solo_test::text,
          'usuarioId', uC::text, 'usuarioNombre', 'zz-uC', 'usadaEn', (now() - interval '29 hours')::text)
      )
    ) where id = uC;

    select coalesce((avatar_config->'inventario'->'cofres'->>'epico')::int, 0) into v_epico_ctrl from perfiles where id = uA;
    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_solo_ctrl);
    select coalesce(pl_ganados, 0) into v_pl_solo_ctrl from noche_jugadores where noche_id = n_solo_ctrl and usuario_id = uA;

    select coalesce((avatar_config->'inventario'->'cofres'->>'epico')::int, 0) into v_epico_test from perfiles where id = uC;
    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_solo_test);
    select coalesce((avatar_config->'inventario'->'cofres'->>'epico')::int, 0) - v_epico_test into v_epico_test from perfiles where id = uC;
    select coalesce(pl_ganados, 0) into v_pl_solo_test from noche_jugadores where noche_id = n_solo_test and usuario_id = uC;

    v_out := v_out || jsonb_build_object(
      'trono_epico_delta', v_epico_test,
      'trono_posicion_uC', (select posicion_final from noche_jugadores where noche_id = n_solo_test and usuario_id = uC),
      'caliz_pl_ctrl', v_pl_solo_ctrl, 'caliz_pl_test', v_pl_solo_test,
      'caliz_pl_delta', v_pl_solo_test - v_pl_solo_ctrl
    );
    v_ok := v_ok
      and v_epico_test = 1
      and (select posicion_final from noche_jugadores where noche_id = n_solo_test and usuario_id = uC) = 1
      and (v_pl_solo_test - v_pl_solo_ctrl) = 12; -- ultimo registro (cubata, 3 pts) * 4 extra = x5 total
  end;

  -- ===== B) Brindis Prohibido: control (uE/uF) vs prueba (uG/uH) =====
  begin
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uE, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_brindis_ctrl;
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uG, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_brindis_test;
    insert into noche_jugadores (noche_id, usuario_id) values
      (n_brindis_ctrl, uE), (n_brindis_ctrl, uF), (n_brindis_test, uG), (n_brindis_test, uH);
    insert into registros (noche_id, usuario_id, bebida_tipo_id, ts) values
      (n_brindis_ctrl, uE, v_cubata, now() - interval '29 hours'),
      (n_brindis_ctrl, uE, v_cubata, now() - interval '29 hours' + interval '5 minutes'),
      (n_brindis_ctrl, uF, v_cerveza, now() - interval '29 hours' + interval '10 minutes'),
      (n_brindis_test, uG, v_cubata, now() - interval '29 hours'),
      (n_brindis_test, uG, v_cubata, now() - interval '29 hours' + interval '5 minutes'),
      (n_brindis_test, uH, v_cerveza, now() - interval '29 hours' + interval '10 minutes');

    update perfiles set avatar_config = jsonb_set(
      coalesce(avatar_config, '{}'::jsonb) || jsonb_build_object('inventario', coalesce(avatar_config->'inventario', '{}'::jsonb)),
      '{inventario,cartasActivas}',
      jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'cartaId', 'brindis-prohibido', 'nocheId', n_brindis_test::text,
          'usuarioId', uG::text, 'usuarioNombre', 'zz-uG', 'objetivoId', uH::text, 'objetivoNombre', 'zz-uH',
          'usadaEn', (now() - interval '30 hours')::text)
      )
    ) where id = uG;

    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_brindis_ctrl);
    select coalesce(pl_ganados, 0) into v_pl_u1_ctrl from noche_jugadores where noche_id = n_brindis_ctrl and usuario_id = uE;
    select coalesce(pl_ganados, 0) into v_pl_u2_ctrl from noche_jugadores where noche_id = n_brindis_ctrl and usuario_id = uF;

    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_brindis_test);
    select coalesce(pl_ganados, 0) into v_pl_u1_test from noche_jugadores where noche_id = n_brindis_test and usuario_id = uG;
    select coalesce(pl_ganados, 0) into v_pl_u2_test from noche_jugadores where noche_id = n_brindis_test and usuario_id = uH;

    v_out := v_out || jsonb_build_object(
      'brindis_pl_u1_ctrl', v_pl_u1_ctrl, 'brindis_pl_u2_ctrl', v_pl_u2_ctrl,
      'brindis_pl_u1_test', v_pl_u1_test, 'brindis_pl_u2_test', v_pl_u2_test,
      'brindis_delta_u1', v_pl_u1_test - v_pl_u1_ctrl,
      'brindis_delta_u2', v_pl_u2_test - v_pl_u2_ctrl
    );
    v_ok := v_ok
      and (v_pl_u1_test - v_pl_u1_ctrl) = -3
      and (v_pl_u2_test - v_pl_u2_ctrl) = 2;
  end;

  -- ===== C) Dado Maldito: control (uI/uJ/uK) + 3 resultados (tríos exclusivos) =====
  -- activa_id elegidos para que abs(hashtext(id)) % 3 dé 0, 1 y 2 respectivamente.
  begin
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uI, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_dado_ctrl;
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uL, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_dado_0;
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uO, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_dado_1;
    insert into noches (sala_id, creada_por, inicio, fin_programado, estado, fin_gracia)
      values (v_sala, uR, now() - interval '30 hours', now() - interval '6 hours', 'cerrando', now() + interval '10 minutes')
      returning id into n_dado_2;
    insert into noche_jugadores (noche_id, usuario_id) values
      (n_dado_ctrl, uI), (n_dado_ctrl, uJ), (n_dado_ctrl, uK),
      (n_dado_0, uL), (n_dado_0, uM), (n_dado_0, uN),
      (n_dado_1, uO), (n_dado_1, uP), (n_dado_1, uQ),
      (n_dado_2, uR), (n_dado_2, uS), (n_dado_2, uT);

    -- residuo 0 -> +3 a toda la sala
    update perfiles set avatar_config = jsonb_set(
      coalesce(avatar_config, '{}'::jsonb) || jsonb_build_object('inventario', coalesce(avatar_config->'inventario', '{}'::jsonb)),
      '{inventario,cartasActivas}',
      jsonb_build_array(jsonb_build_object('id', '000f0e1e-8c2f-40b7-97c4-48c531a3fee3', 'cartaId', 'dado-maldito',
        'nocheId', n_dado_0::text, 'usuarioId', uL::text, 'usuarioNombre', 'zz-uL', 'usadaEn', (now() - interval '30 hours')::text))
    ) where id = uL;
    -- residuo 1 -> -2 a toda la sala
    update perfiles set avatar_config = jsonb_set(
      coalesce(avatar_config, '{}'::jsonb) || jsonb_build_object('inventario', coalesce(avatar_config->'inventario', '{}'::jsonb)),
      '{inventario,cartasActivas}',
      jsonb_build_array(jsonb_build_object('id', '0026e15a-1faa-42d6-b1e1-2f2ec0963f6d', 'cartaId', 'dado-maldito',
        'nocheId', n_dado_1::text, 'usuarioId', uO::text, 'usuarioNombre', 'zz-uO', 'usadaEn', (now() - interval '30 hours')::text))
    ) where id = uO;
    -- residuo 2 -> +10 a exactamente un jugador al azar, 0 al resto
    update perfiles set avatar_config = jsonb_set(
      coalesce(avatar_config, '{}'::jsonb) || jsonb_build_object('inventario', coalesce(avatar_config->'inventario', '{}'::jsonb)),
      '{inventario,cartasActivas}',
      jsonb_build_array(jsonb_build_object('id', '003783b7-8ff6-451b-8c07-8080bc0dd7af', 'cartaId', 'dado-maldito',
        'nocheId', n_dado_2::text, 'usuarioId', uR::text, 'usuarioNombre', 'zz-uR', 'usadaEn', (now() - interval '30 hours')::text))
    ) where id = uR;

    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_dado_ctrl);
    select coalesce(pl_ganados, 0) into v_pl_d_ctrl_u1 from noche_jugadores where noche_id = n_dado_ctrl and usuario_id = uI;
    select coalesce(pl_ganados, 0) into v_pl_d_ctrl_u2 from noche_jugadores where noche_id = n_dado_ctrl and usuario_id = uJ;
    select coalesce(pl_ganados, 0) into v_pl_d_ctrl_u3 from noche_jugadores where noche_id = n_dado_ctrl and usuario_id = uK;

    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_dado_0);
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u1 into v_delta0_u1 from noche_jugadores where noche_id = n_dado_0 and usuario_id = uL;
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u2 into v_delta0_u2 from noche_jugadores where noche_id = n_dado_0 and usuario_id = uM;
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u3 into v_delta0_u3 from noche_jugadores where noche_id = n_dado_0 and usuario_id = uN;

    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_dado_1);
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u1 into v_delta1_u1 from noche_jugadores where noche_id = n_dado_1 and usuario_id = uO;
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u2 into v_delta1_u2 from noche_jugadores where noche_id = n_dado_1 and usuario_id = uP;
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u3 into v_delta1_u3 from noche_jugadores where noche_id = n_dado_1 and usuario_id = uQ;

    perform pg_temp.zz_limpia_tmp_finalizar();
    perform finalizar_noche(n_dado_2);
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u1 into v_delta2_u1 from noche_jugadores where noche_id = n_dado_2 and usuario_id = uR;
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u2 into v_delta2_u2 from noche_jugadores where noche_id = n_dado_2 and usuario_id = uS;
    select coalesce(pl_ganados, 0) - v_pl_d_ctrl_u3 into v_delta2_u3 from noche_jugadores where noche_id = n_dado_2 and usuario_id = uT;
    select count(*) filter (where d = 10) into v_ganadores_10
      from (values (v_delta2_u1), (v_delta2_u2), (v_delta2_u3)) as t(d);

    v_out := v_out || jsonb_build_object(
      'dado_residuo0', jsonb_build_object('u1', v_delta0_u1, 'u2', v_delta0_u2, 'u3', v_delta0_u3),
      'dado_residuo1', jsonb_build_object('u1', v_delta1_u1, 'u2', v_delta1_u2, 'u3', v_delta1_u3),
      'dado_residuo2', jsonb_build_object('u1', v_delta2_u1, 'u2', v_delta2_u2, 'u3', v_delta2_u3)
    );
    v_ok := v_ok
      and v_delta0_u1 = 3 and v_delta0_u2 = 3 and v_delta0_u3 = 3
      and v_delta1_u1 = -2 and v_delta1_u2 = -2 and v_delta1_u3 = -2
      and v_ganadores_10 = 1
      and (v_delta2_u1 = 10 or v_delta2_u1 = 0)
      and (v_delta2_u2 = 10 or v_delta2_u2 = 0)
      and (v_delta2_u3 = 10 or v_delta2_u3 = 0);
  end;

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
