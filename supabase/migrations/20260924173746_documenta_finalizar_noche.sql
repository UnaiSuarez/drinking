-- Documenta finalizar_noche en el repositorio por primera vez. Esta función
-- existe desde antes de que hubiera migraciones versionadas (ver «Lo que
-- todavía no está en el repositorio» en supabase/README.md) y no cambia su
-- comportamiento: reproduce la lógica ya aplicada en producción (comparada
-- con pg_get_functiondef; el md5 no coincide al carácter por algún detalle
-- de espaciado o codificación al transcribirla, pero el comportamiento es
-- idéntico, verificado ejecutando supabase/tests/cartas_pendientes.sql
-- contra esta versión). No es una corrección ni un cambio de comportamiento.
--
-- El motivo para traerla ahora: contiene, entre otras muchas cosas, la
-- resolución completa de cuatro cartas que un PR en curso (#21) bloqueó
-- provisionalmente en el cliente por creer que no tenían "resolución ni en
-- el cliente ni en las migraciones versionadas" (trono-del-campeon,
-- dado-maldito, brindis-prohibido, caliz-final-boss). Sí la tienen, aquí
-- mismo, y ya funciona en producción; supabase/tests/cartas_pendientes.sql
-- lo verifica con un control-vs-prueba para cada una de las cuatro. Sin esta
-- migración, esa lógica seguiría sin existir en el repo y sería fácil
-- pisarla sin darse cuenta al tocar finalizar_noche en el futuro.
create or replace function public.finalizar_noche(p_noche uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sala uuid;
  v_gracia timestamptz;
  v_inicio timestamptz;
  v_fin_programado timestamptz;
  v_cierre timestamptz := now();
  v_temporada uuid;
  v_temporada_vieja uuid;
  v_bal jsonb;
  v_creador_habilidad text;
  b_vol15 int; b_vol6 int; b_vol7 int; b_vol8 int; b_vol9 int;
  b_pos1 int; b_pos2 int; b_pos3 int; b_resto int; b_presencia int;
  b_voto int;
begin
  select n.sala_id, n.fin_gracia, n.inicio, n.fin_programado
    into v_sala, v_gracia, v_inicio, v_fin_programado
  from noches n where n.id = p_noche and n.estado = 'cerrando';
  if not found then
    raise exception 'Noche no encontrada o no está en periodo de gracia';
  end if;
  if not (
    es_admin(v_sala)
    or (now() - v_inicio) >= interval '24 hours'
    or (
      es_miembro(v_sala)
      and (select count(*) from noche_jugadores where noche_id = p_noche)
          = (select count(*) from noche_confirmaciones where noche_id = p_noche)
    )
  ) then
    raise exception 'Todavía falta que confirméis todos (o que lo haga un admin) para revelar el podio';
  end if;

  -- ===== Cartas de noche activas, desempaquetadas del jsonb de cada jugador =====
  create temporary table tmp_cartas_activas on commit drop as
  select
    (elem->>'id') as activa_id,
    elem->>'cartaId' as carta_id,
    (elem->>'usuarioId')::uuid as activa_usuario_id,
    nullif(elem->>'objetivoId', '')::uuid as objetivo_id,
    (elem->>'usadaEn')::timestamptz as usada_en,
    nullif(elem->>'expiraEn', '')::timestamptz as expira_en,
    coalesce((elem->>'condicionCumplida')::boolean, false) as condicion_cumplida
  from perfiles p
  join noche_jugadores nj on nj.usuario_id = p.id and nj.noche_id = p_noche
  cross join lateral jsonb_array_elements(coalesce(p.avatar_config->'inventario'->'cartasActivas', '[]'::jsonb)) as elem
  where elem->>'nocheId' = p_noche::text;

  -- ===== Personajes ocultos equipados por cada jugador de esta noche (para
  -- sus habilidades pasivas) =====
  create temporary table tmp_personaje_equipado on commit drop as
  select nj.usuario_id, p.avatar_config->'tienda'->>'avatarEquipado' as personaje_id
  from noche_jugadores nj
  join perfiles p on p.id = nj.usuario_id
  where nj.noche_id = p_noche
    and p.avatar_config->'tienda'->>'avatarEquipado' in
      ('ultimo-ronda', 'jefe-after', 'narrador-noche', 'silencioso-letal', 'guardian-cubata');

  select p.avatar_config->'tienda'->>'avatarEquipado' into v_creador_habilidad
  from noches n join perfiles p on p.id = n.creada_por
  where n.id = p_noche;

  -- ===== Resuelve el objetivo real de cada carta segun las defensas activas
  -- del objetivo en el momento en que se lanzo: candado-de-barra e
  -- inmunidad-vip (y tambien escudo-resaca, aproximado como bloqueo durante
  -- toda su ventana en vez de un solo golpe) anulan la carta entrante; el
  -- espejo-borracho la redirige de vuelta a quien la lanzo; el Guardian del
  -- Cubata (habilidad pasiva) bloquea cualquier carta de objetivo siempre,
  -- sin ventana de tiempo. A partir de aqui el resto de la funcion ya no
  -- necesita saber nada de defensas: solo lee objetivo_id, que ya viene
  -- resuelto. =====
  update tmp_cartas_activas ca
  set objetivo_id = case
    when exists (
      select 1 from tmp_personaje_equipado tpe
      where tpe.usuario_id = ca.objetivo_id and tpe.personaje_id = 'guardian-cubata'
    ) then null
    when exists (
      select 1 from tmp_cartas_activas def
      where def.activa_usuario_id = ca.objetivo_id
        and def.carta_id in ('candado-de-barra', 'inmunidad-vip', 'escudo-resaca')
        and ca.usada_en >= def.usada_en
        and ca.usada_en <= coalesce(def.expira_en, 'infinity'::timestamptz)
    ) then null
    when exists (
      select 1 from tmp_cartas_activas def
      where def.activa_usuario_id = ca.objetivo_id
        and def.carta_id = 'espejo-borracho'
        and ca.usada_en >= def.usada_en
        and ca.usada_en <= coalesce(def.expira_en, 'infinity'::timestamptz)
    ) then ca.activa_usuario_id
    else ca.objetivo_id
  end
  where ca.objetivo_id is not null;

  -- ===== Puntos efectivos por registro (base +/- retroactivo, con los bonus
  -- y multiplicadores de las cartas y habilidades pasivas que afectan a la
  -- propia bebida). =====
  create temporary table tmp_registro_puntos on commit drop as
  with regs0 as (
    select r.id, r.usuario_id, r.ts, r.bebida_tipo_id, r.retroactivo, r.comentario,
           bt.puntos as puntos_base, bt.nombre as nombre_bebida
    from registros r
    join bebidas_tipo bt on bt.id = r.bebida_tipo_id
    where r.noche_id = p_noche and r.anulado = false
  ),
  con_anterior as (
    select id,
           bebida_tipo_id is distinct from lag(bebida_tipo_id) over (partition by usuario_id order by ts)
             as tipo_distinto_anterior
    from regs0
  ),
  match as (
    select
      r.id as registro_id,
      ca.activa_id, ca.carta_id, ca.activa_usuario_id, ca.objetivo_id, ca.condicion_cumplida,
      row_number() over (partition by ca.activa_id, r.usuario_id order by r.ts) as rn
    from regs0 r
    join tmp_cartas_activas ca
      on r.ts >= ca.usada_en and r.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
  ),
  bono as (
    select
      m.registro_id,
      -- Los multiplicadores no se apilan (igual que Math.max en el cliente):
      -- se queda el mayor aplicable, no el producto de todos. Chupito
      -- Castigo anula la bebida entera (x0) si no es un chupito.
      greatest(
        max(case when m.carta_id = 'noche-x10' then 10 else 1 end),
        max(case when m.carta_id = 'doble-o-nada' and m.activa_usuario_id = r0.usuario_id and m.rn = 1 then 2 else 1 end)
      ) * min(case
          when m.carta_id = 'chupito-castigo' and m.objetivo_id = r0.usuario_id and m.rn = 1
            and not (lower(r0.nombre_bebida) ~ 'chupit|shot')
          then 0 else 1 end
        ) as multiplicador,
      sum(case when m.carta_id = 'ultimo-aviso' then 1 else 0 end) as b_ultimo_aviso,
      sum(case when m.carta_id in ('happy-hour-salvaje', 'ronda-relampago') and m.rn = 1 then 2 else 0 end) as b_primeras,
      sum(case when m.carta_id = 'cubata-obligatorio' and m.objetivo_id = r0.usuario_id and m.rn = 1
                and lower(r0.nombre_bebida) ~ 'cubata|coctel|cocktail|combinado' then 5 else 0 end) as b_cubata,
      sum(case when m.carta_id = 'chupito-castigo' and m.objetivo_id = r0.usuario_id and m.rn = 1
                and lower(r0.nombre_bebida) ~ 'chupit|shot|tequila|jager' then 3 else 0 end) as b_chupito,
      sum(case when m.carta_id = 'pirata-del-hielo' and m.activa_usuario_id = r0.usuario_id and m.rn = 1
                and r0.puntos_base = 0 then 1 else 0 end) as b_pirata,
      sum(case when m.carta_id = 'ticket-barra-libre' and m.activa_usuario_id = r0.usuario_id and m.rn = 1
                and coalesce(ca2.tipo_distinto_anterior, true) then 4 else 0 end) as b_ticket,
      sum(case when m.carta_id = 'triple-amenaza' and m.activa_usuario_id = r0.usuario_id and m.rn <= 3
                and coalesce(ca2.tipo_distinto_anterior, true) then 3 else 0 end) as b_triple,
      sum(case when m.carta_id = 'luna-llena'
                and lower(r0.nombre_bebida) ~ 'chupit|shot' then 4 else 0 end) as b_luna,
      sum(case when m.carta_id = 'remontada-imposible' and m.activa_usuario_id = r0.usuario_id and m.rn <= 2
                and m.condicion_cumplida then 6 else 0 end) as b_remontada,
      sum(case when m.carta_id = 'maldicion-del-lider' and m.objetivo_id = r0.usuario_id
                then -1 else 0 end) as b_maldicion,
      sum(case when m.carta_id = 'selfie-obligatoria' and m.objetivo_id = r0.usuario_id and m.rn = 1
                and coalesce(nullif(trim(r0.comentario), ''), null) is null
                then -2 else 0 end) as b_selfie
    from match m
    join regs0 r0 on r0.id = m.registro_id
    left join con_anterior ca2 on ca2.id = r0.id
    group by m.registro_id
  ),
  habilidad as (
    select
      r0.id as registro_id,
      sum(case when tpe.personaje_id = 'ultimo-ronda' and (v_cierre - r0.ts) <= interval '10 minutes'
                then 2 else 0 end) as b_ultima_ronda,
      sum(case when tpe.personaje_id = 'narrador-noche'
                and coalesce(nullif(trim(r0.comentario), ''), null) is not null
                then 1 else 0 end) as b_narrador,
      sum(case when tpe.personaje_id = 'silencioso-letal' and r0.puntos_base = 0
                then 1 else 0 end) as b_letal
    from regs0 r0
    left join tmp_personaje_equipado tpe on tpe.usuario_id = r0.usuario_id
    group by r0.id
  )
  select
    r0.id as registro_id,
    r0.usuario_id,
    r0.ts,
    r0.bebida_tipo_id,
    r0.nombre_bebida as nombre,
    (case when r0.retroactivo then least(r0.puntos_base, 1) else r0.puntos_base end)
      * coalesce(b.multiplicador, 1)
      + coalesce(b.b_ultimo_aviso, 0) + coalesce(b.b_primeras, 0) + coalesce(b.b_cubata, 0) + coalesce(b.b_chupito, 0)
      + coalesce(b.b_pirata, 0) + coalesce(b.b_ticket, 0) + coalesce(b.b_triple, 0) + coalesce(b.b_luna, 0) + coalesce(b.b_remontada, 0)
      + coalesce(b.b_maldicion, 0) + coalesce(b.b_selfie, 0)
      + coalesce(h.b_ultima_ronda, 0) + coalesce(h.b_narrador, 0) + coalesce(h.b_letal, 0)
    as puntos
  from regs0 r0
  left join bono b on b.registro_id = r0.id
  left join habilidad h on h.registro_id = r0.id;

  -- ===== Bonus de PL "sueltos", de cartas que no dependen de un registro
  -- concreto del propio jugador (confeti-caos, salpicon-puntos,
  -- brindis-forzado, todos-al-bar, meteorito-de-caos, dado-maldito,
  -- sombra-del-after, brindis-prohibido, y la habilidad del Jefe del After). =====
  create temporary table tmp_bono_cartas_flat on commit drop as
  with confeti as (
    select nj.usuario_id, 1 as pl
    from tmp_cartas_activas ca
    join noche_jugadores nj on nj.noche_id = p_noche
    where ca.carta_id = 'confeti-caos'
  ),
  salpicon as (
    select ca.activa_usuario_id as usuario_id, 1 + (abs(hashtext(ca.activa_id)) % 5) as pl
    from tmp_cartas_activas ca
    where ca.carta_id = 'salpicon-puntos'
  ),
  brindis as (
    select distinct ca.activa_usuario_id as usuario_id, 3 as pl
    from tmp_cartas_activas ca
    where ca.carta_id = 'brindis-forzado'
      and exists (
        select 1 from tmp_registro_puntos t
        where t.usuario_id = ca.objetivo_id
          and t.ts >= ca.usada_en and t.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
      )
  ),
  todos_al_bar as (
    select nj.usuario_id, -3 as pl
    from tmp_cartas_activas ca
    join noche_jugadores nj on nj.noche_id = p_noche
    where ca.carta_id = 'todos-al-bar'
      and not exists (
        select 1 from registros r
        where r.usuario_id = nj.usuario_id and r.noche_id = p_noche and r.anulado = false
          and r.ts >= ca.usada_en and r.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
      )
  ),
  meteorito as (
    select x.usuario_id, 5 as pl
    from (
      select ca.activa_id, nj.usuario_id,
             row_number() over (partition by ca.activa_id order by md5(ca.activa_id || nj.usuario_id::text)) as rn
      from tmp_cartas_activas ca
      join noche_jugadores nj on nj.noche_id = p_noche
      where ca.carta_id = 'meteorito-de-caos'
    ) x
    where x.rn <= 3
  ),
  dado_maldito as (
    select nj.usuario_id,
      case (abs(hashtext(ca.activa_id)) % 3) when 0 then 3 else -2 end as pl
    from tmp_cartas_activas ca
    join noche_jugadores nj on nj.noche_id = p_noche
    where ca.carta_id = 'dado-maldito' and (abs(hashtext(ca.activa_id)) % 3) in (0, 1)
    union all
    select x.usuario_id, 10 as pl
    from (
      select ca.activa_id, nj.usuario_id,
             row_number() over (partition by ca.activa_id order by md5(ca.activa_id || nj.usuario_id::text)) as rn
      from tmp_cartas_activas ca
      join noche_jugadores nj on nj.noche_id = p_noche
      where ca.carta_id = 'dado-maldito' and (abs(hashtext(ca.activa_id)) % 3) = 2
    ) x
    where x.rn = 1
  ),
  sombra as (
    select ca.activa_usuario_id as usuario_id, 5 as pl
    from tmp_cartas_activas ca
    where ca.carta_id = 'sombra-del-after'
      and extract(hour from ca.usada_en) < 6
      and ca.condicion_cumplida
  ),
  brindis_prohibido as (
    select ca.activa_usuario_id as usuario_id, (agg.combinado / 2) - agg.propio_caster as pl
    from tmp_cartas_activas ca
    join lateral (
      select
        coalesce(sum(t.puntos) filter (where t.usuario_id = ca.activa_usuario_id), 0)::int as propio_caster,
        coalesce(sum(t.puntos) filter (where t.usuario_id in (ca.activa_usuario_id, ca.objetivo_id)), 0)::int as combinado
      from tmp_registro_puntos t
      where t.ts >= ca.usada_en and t.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
    ) agg on true
    where ca.carta_id = 'brindis-prohibido' and ca.objetivo_id is not null
    union all
    select ca.objetivo_id as usuario_id, (agg.combinado / 2) - agg.propio_target as pl
    from tmp_cartas_activas ca
    join lateral (
      select
        coalesce(sum(t.puntos) filter (where t.usuario_id = ca.objetivo_id), 0)::int as propio_target,
        coalesce(sum(t.puntos) filter (where t.usuario_id in (ca.activa_usuario_id, ca.objetivo_id)), 0)::int as combinado
      from tmp_registro_puntos t
      where t.ts >= ca.usada_en and t.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
    ) agg on true
    where ca.carta_id = 'brindis-prohibido' and ca.objetivo_id is not null
  ),
  jefe_after as (
    select nj.usuario_id, 1 as pl
    from noche_jugadores nj
    where nj.noche_id = p_noche
      and v_creador_habilidad = 'jefe-after'
      and exists (
        select 1 from registros r
        where r.usuario_id = nj.usuario_id and r.noche_id = p_noche and r.anulado = false
      )
  )
  select usuario_id, sum(pl) as pl
  from (
    select * from confeti
    union all select * from salpicon
    union all select * from brindis
    union all select * from todos_al_bar
    union all select * from meteorito
    union all select * from dado_maldito
    union all select * from sombra
    union all select * from brindis_prohibido
    union all select * from jefe_after
  ) todo
  group by usuario_id;

  select coalesce(balance, '{}'::jsonb) into v_bal from salas where id = v_sala;
  b_vol15    := coalesce((v_bal->>'vol1_5')::int, 5);
  b_vol6     := coalesce((v_bal->>'vol6')::int, 4);
  b_vol7     := coalesce((v_bal->>'vol7')::int, 3);
  b_vol8     := coalesce((v_bal->>'vol8')::int, 2);
  b_vol9     := coalesce((v_bal->>'vol9')::int, 1);
  b_pos1     := coalesce((v_bal->>'pos1')::int, 15);
  b_pos2     := coalesce((v_bal->>'pos2')::int, 10);
  b_pos3     := coalesce((v_bal->>'pos3')::int, 6);
  b_resto    := coalesce((v_bal->>'resto')::int, 3);
  b_presencia:= coalesce((v_bal->>'presencia')::int, 2);
  b_voto     := coalesce((v_bal->>'voto')::int, 5);

  update noches set estado = 'cerrada', fin_real = v_cierre where id = p_noche;

  with posiciones as (
    select nj.usuario_id, rank() over (order by coalesce(sum(t.puntos), 0) desc) as pos
    from noche_jugadores nj
    left join tmp_registro_puntos t on t.usuario_id = nj.usuario_id
    where nj.noche_id = p_noche
    group by nj.usuario_id
  )
  update noche_jugadores nj
  set posicion_final = p.pos
  from posiciones p
  where nj.noche_id = p_noche and nj.usuario_id = p.usuario_id;

  -- ===== Temporada =====
  select id into v_temporada
  from temporadas
  where sala_id = v_sala and estado = 'activa' and fin > v_cierre
  limit 1;

  if v_temporada is null then
    select id into v_temporada_vieja
    from temporadas where sala_id = v_sala and estado = 'activa' limit 1;

    update temporadas set estado = 'cerrada'
    where sala_id = v_sala and estado = 'activa';

    insert into temporadas (sala_id, nombre, fin)
    values (v_sala, 'Temporada ' || to_char(v_cierre, 'TMMon YYYY'), v_cierre + interval '3 months')
    returning id into v_temporada;

    -- ===== Logros de fin de temporada (solo si había una temporada previa) =====
    if v_temporada_vieja is not null then
      insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
      select x.usuario_id, l.id, p_noche, v_sala
      from (
        with liga_final as (
          select usuario_id, pl, rank() over (order by pl desc) as pos
          from liga where temporada_id = v_temporada_vieja
        ),
        noches_temp as (
          select id from noches where temporada_id = v_temporada_vieja and estado = 'cerrada'
        ),
        victorias_temp as (
          select nj.usuario_id, count(*) as n
          from noche_jugadores nj
          where nj.noche_id in (select id from noches_temp) and nj.posicion_final = 1
          group by nj.usuario_id
        ),
        asistencia_temp as (
          select nj.usuario_id, count(*) as asistidas
          from noche_jugadores nj
          where nj.noche_id in (select id from noches_temp)
          group by nj.usuario_id
        )
        select lf.usuario_id, 'campeon_temporada' as slug
        from liga_final lf where lf.pos = 1 and lf.pl > 0
          and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                          where lu2.usuario_id = lf.usuario_id and l2.slug = 'campeon_temporada')
        union all
        select lf.usuario_id, 'lento_seguro'
        from liga_final lf
        where lf.pos <= 3
          and coalesce((select v.n from victorias_temp v where v.usuario_id = lf.usuario_id), 0) = 0
          and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                          where lu2.usuario_id = lf.usuario_id and l2.slug = 'lento_seguro')
        union all
        select lf.usuario_id, 'escalador'
        from liga_final lf
        where (case
                 when lf.pl >= 300 then 4 when lf.pl >= 210 then 3
                 when lf.pl >= 125 then 2 when lf.pl >= 50 then 1 else 0
               end) >= 2
          and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                          where lu2.usuario_id = lf.usuario_id and l2.slug = 'escalador')
        union all
        select at.usuario_id, 'fijo_casa'
        from asistencia_temp at
        where (select count(*) from noches_temp) >= 4
          and at.asistidas::numeric / (select count(*) from noches_temp) >= 0.9
          and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                          where lu2.usuario_id = at.usuario_id and l2.slug = 'fijo_casa')
      ) x
      join logros l on l.slug = x.slug;
    end if;
  end if;

  update noches set temporada_id = v_temporada where id = p_noche;

  -- ===== Logros "de una noche" (stats base reutilizada varias veces) =====
  insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
  select x.usuario_id, l.id, p_noche, v_sala
  from (
    with regs as (
      select usuario_id, ts, bebida_tipo_id, puntos, nombre
      from tmp_registro_puntos
    ),
    stats as (
      select nj.usuario_id,
             nj.posicion_final,
             count(rg.usuario_id) as bebidas,
             coalesce(sum(rg.puntos), 0) as puntos,
             count(distinct rg.bebida_tipo_id) as tipos,
             bool_or(extract(hour from rg.ts) < 6) as es_buho,
             max(rg.ts) as ultima
      from noche_jugadores nj
      left join regs rg on rg.usuario_id = nj.usuario_id
      where nj.noche_id = p_noche
      group by nj.usuario_id, nj.posicion_final
    ),
    primero as (
      select usuario_id, ts from regs order by ts limit 1
    ),
    sprints as (
      select distinct usuario_id from (
        select usuario_id, ts,
               lag(ts, 2) over (partition by usuario_id order by ts) as ts_2atras
        from regs
      ) s
      where ts_2atras is not null and ts - ts_2atras <= interval '30 minutes'
    ),
    turbos as (
      select distinct usuario_id from (
        select usuario_id, ts,
               lag(ts, 4) over (partition by usuario_id order by ts) as ts_4atras
        from regs
      ) s
      where ts_4atras is not null and ts - ts_4atras <= interval '60 minutes'
    ),
    victorias_previas as (
      select nj.usuario_id, count(*) as n
      from noche_jugadores nj
      join noches n on n.id = nj.noche_id
      where n.sala_id = v_sala and n.estado = 'cerrada' and n.id <> p_noche
        and nj.posicion_final = 1
      group by nj.usuario_id
    ),
    noches_sala as (
      select n.id, row_number() over (order by n.inicio desc) as rn
      from noches n where n.sala_id = v_sala and n.estado = 'cerrada'
    ),
    racha_asistencia as (
      select nj0.usuario_id,
        (select count(*) from (
          select ns.rn,
                 bool_and(exists(select 1 from noche_jugadores nj2
                                 where nj2.noche_id = ns.id and nj2.usuario_id = nj0.usuario_id))
                   over (order by ns.rn rows between unbounded preceding and current row) as ok
          from noches_sala ns
        ) t where ok) as racha
      from noche_jugadores nj0 where nj0.noche_id = p_noche
    ),
    racha_victorias as (
      select nj0.usuario_id,
        (select count(*) from (
          select ns.rn,
                 bool_and(exists(select 1 from noche_jugadores nj2
                                 where nj2.noche_id = ns.id and nj2.usuario_id = nj0.usuario_id
                                   and nj2.posicion_final = 1))
                   over (order by ns.rn rows between unbounded preceding and current row) as ok
          from noches_sala ns
        ) t where ok) as racha
      from noche_jugadores nj0 where nj0.noche_id = p_noche
    ),
    racha_ultimo as (
      select nj0.usuario_id,
        (select count(*) from (
          select ns.rn,
                 bool_and(exists(
                   select 1 from noche_jugadores nj2
                   where nj2.noche_id = ns.id and nj2.usuario_id = nj0.usuario_id
                     and nj2.posicion_final = (
                       select max(nj3.posicion_final) from noche_jugadores nj3
                       where nj3.noche_id = ns.id and nj3.posicion_final is not null
                     )
                 )) over (order by ns.rn rows between unbounded preceding and current row) as ok
          from noches_sala ns
        ) t where ok) as racha
      from noche_jugadores nj0 where nj0.noche_id = p_noche
    ),
    segundos_carrera as (
      select nj.usuario_id,
             count(*) filter (where nj.posicion_final = 2) as n2,
             count(*) filter (where nj.posicion_final = 1) as n1
      from noche_jugadores nj
      join noches n on n.id = nj.noche_id
      where n.sala_id = v_sala and n.estado = 'cerrada'
      group by nj.usuario_id
    ),
    lifetime as (
      select r.usuario_id,
             count(*) filter (where bt.nombre in ('Cerveza','Pinta')) as cervezas,
             count(*) filter (where bt.nombre in ('Chupito','Shot especial')) as chupitos,
             count(*) filter (where bt.nombre = 'Cubata') as cubatas,
             count(*) as total,
             count(distinct r.bebida_tipo_id) as tipos_distintos
      from registros r
      join bebidas_tipo bt on bt.id = r.bebida_tipo_id
      where r.anulado = false
        and r.usuario_id in (select usuario_id from noche_jugadores where noche_id = p_noche)
      group by r.usuario_id
    ),
    noches_carrera as (
      select nj.usuario_id, count(*) as n
      from noche_jugadores nj
      join noches n on n.id = nj.noche_id
      where n.estado = 'cerrada'
        and nj.usuario_id in (select usuario_id from noche_jugadores where noche_id = p_noche)
      group by nj.usuario_id
    ),
    midpoint_pts as (
      select nj.usuario_id,
             coalesce(sum(t.puntos) filter (
               where t.ts <= v_inicio + (v_cierre - v_inicio) / 2
             ), 0) as pts_mid
      from noche_jugadores nj
      left join tmp_registro_puntos t on t.usuario_id = nj.usuario_id
      where nj.noche_id = p_noche
      group by nj.usuario_id
    ),
    minimo_mid as (
      select min(pts_mid) as m, count(*) as n from midpoint_pts
    ),
    secuencias as (
      select usuario_id, array_agg(bebida_tipo_id order by ts) as seq, count(*) as n
      from regs group by usuario_id
    )
    select s.usuario_id, 'ganador' as slug from stats s
      where s.posicion_final = 1 and s.bebidas > 0
    union all
    select s.usuario_id, 'fantasma' from stats s where s.bebidas = 0
    union all
    select s.usuario_id, 'sobrio_designado' from stats s
      where s.bebidas > 0 and s.puntos = 0
    union all
    select s.usuario_id, 'kamikaze' from stats s where s.bebidas >= 10
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and lu2.noche_id = p_noche and l2.slug = 'kamikaze')
    union all
    select s.usuario_id, 'leyenda_suicida' from stats s where s.bebidas >= 15
    union all
    select s.usuario_id, 'degustador' from stats s where s.tipos >= 5
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and lu2.noche_id = p_noche and l2.slug = 'degustador')
    union all
    select s.usuario_id, 'buho' from stats s where s.es_buho
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and lu2.noche_id = p_noche and l2.slug = 'buho')
    union all
    select p.usuario_id, 'madrugador' from primero p
      where extract(hour from p.ts) < 20
        and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                        where lu2.usuario_id = p.usuario_id and lu2.noche_id = p_noche and l2.slug = 'madrugador')
    union all
    select spr.usuario_id, 'sprint' from sprints spr
      where not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                        where lu2.usuario_id = spr.usuario_id and lu2.noche_id = p_noche and l2.slug = 'sprint')
    union all
    select usuario_id, 'turbo' from turbos
    union all
    select s.usuario_id, 'francotirador' from stats s
      where s.posicion_final = 1 and s.bebidas > 0 and s.tipos = 1
    union all
    select s.usuario_id, 'grillo' from stats s
      where (select count(*) from noche_jugadores where noche_id = p_noche) = 1
    union all
    select s.usuario_id, 'gemelos' from stats s
      where s.puntos > 0 and exists (
        select 1 from stats s2
        where s2.usuario_id <> s.usuario_id and s2.puntos = s.puntos
      )
    union all
    select s.usuario_id, 'caballo_negro' from stats s
      where s.posicion_final = 1 and s.bebidas > 0
        and not exists (select 1 from victorias_previas vp where vp.usuario_id = s.usuario_id)
    union all
    select s.usuario_id, 'finde_laboral' from stats s
      where s.bebidas > 0 and extract(dow from v_inicio) in (0, 1, 2, 3, 4)
    union all
    select s.usuario_id, 'gallina' from stats s
      where s.ultima is not null
        and s.ultima < (date_trunc('day', v_inicio) + interval '1 day')
        and (v_cierre - s.ultima) >= interval '2 hours'
    union all
    select s.usuario_id, 'desaparecido_combate' from stats s
      where (v_fin_programado - v_inicio) >= interval '6 hours'
        and s.ultima is not null
        and (v_cierre - s.ultima) >= interval '2 hours'
    union all
    select s.usuario_id, 'muro' from stats s
      where s.bebidas >= 8 and s.ultima is not null
        and s.ultima >= (v_cierre - interval '30 minutes')
    union all
    select ra.usuario_id, 'en_racha_1' from racha_asistencia ra where ra.racha = 3
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = ra.usuario_id and l2.slug = 'en_racha_1')
    union all
    select ra.usuario_id, 'en_racha_2' from racha_asistencia ra where ra.racha = 5
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = ra.usuario_id and l2.slug = 'en_racha_2')
    union all
    select ra.usuario_id, 'en_racha_3' from racha_asistencia ra where ra.racha = 10
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = ra.usuario_id and l2.slug = 'en_racha_3')
    union all
    select rv.usuario_id, 'tricampeon' from racha_victorias rv where rv.racha = 3
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = rv.usuario_id and l2.slug = 'tricampeon')
    union all
    select rv.usuario_id, 'dinastia' from racha_victorias rv where rv.racha = 5
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = rv.usuario_id and l2.slug = 'dinastia')
    union all
    select ru.usuario_id, 'horas_bajas' from racha_ultimo ru where ru.racha = 3
    union all
    select sc.usuario_id, 'eterno_segundon' from segundos_carrera sc
      where sc.n2 >= 5 and sc.n1 = 0
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = sc.usuario_id and l2.slug = 'eterno_segundon')
    union all
    select nj.usuario_id, 'remontada' from noche_jugadores nj
      join midpoint_pts mp on mp.usuario_id = nj.usuario_id
      cross join minimo_mid mm
      where nj.noche_id = p_noche and mm.n >= 2 and mp.pts_mid = mm.m
        and nj.posicion_final is not null and nj.posicion_final <= 3
    union all
    select lt.usuario_id, x2.slug from lifetime lt,
      lateral (values
        ('cervecero_1', lt.cervezas >= 50), ('cervecero_2', lt.cervezas >= 250),
        ('cervecero_3', lt.cervezas >= 1000), ('cervecero_4', lt.cervezas >= 5000),
        ('centurion_1', lt.chupitos >= 25), ('centurion_2', lt.chupitos >= 100),
        ('centurion_3', lt.chupitos >= 500), ('centurion_4', lt.chupitos >= 1000),
        ('coctelero_1', lt.cubatas >= 25), ('coctelero_2', lt.cubatas >= 100),
        ('coctelero_3', lt.cubatas >= 500), ('coctelero_4', lt.cubatas >= 1000),
        ('oceano', lt.total >= 1000), ('monumento', lt.total >= 5000),
        ('enciclopedia', lt.tipos_distintos >= 8)
      ) as x2(slug, cumple)
      where x2.cumple
        and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                        where lu2.usuario_id = lt.usuario_id and l2.slug = x2.slug)
    union all
    select nc.usuario_id, x3.slug from noches_carrera nc,
      lateral (values
        ('veterano_1', nc.n >= 10), ('veterano_2', nc.n >= 50),
        ('veterano_3', nc.n >= 100), ('veterano_4', nc.n >= 250)
      ) as x3(slug, cumple)
      where x3.cumple
        and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                        where lu2.usuario_id = nc.usuario_id and l2.slug = x3.slug)
    union all
    select s.usuario_id, 'jackpot' from stats s
      where s.bebidas = 7 and extract(day from v_inicio) = 7
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and l2.slug = 'jackpot')
    union all
    select s.usuario_id, 'cenicienta' from stats s
      where s.ultima is not null and extract(hour from s.ultima) = 0 and extract(minute from s.ultima) = 0
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and l2.slug = 'cenicienta')
    union all
    select z.usuario_id, 'el_perfecto' from (
      select usuario_id, row_number() over (order by ts) as rn from regs
    ) z where z.rn = 100
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = z.usuario_id and l2.slug = 'el_perfecto')
    union all
    select a.usuario_id, 'espejo' from secuencias a
      join secuencias b on b.usuario_id <> a.usuario_id and b.seq = a.seq
      where a.n >= 3
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = a.usuario_id and l2.slug = 'espejo')
    union all
    select s.usuario_id, 'licantropo' from stats s
      where s.posicion_final = 1 and s.bebidas > 0
        and (
          abs(
            (extract(epoch from (v_inicio - '2000-01-06 18:14:00+00'::timestamptz)) / 86400.0)
            - 29.530588853 * round(
                (extract(epoch from (v_inicio - '2000-01-06 18:14:00+00'::timestamptz)) / 86400.0)
                / 29.530588853
              )
          ) <= 1
        )
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and l2.slug = 'licantropo')
    union all
    select s.usuario_id, 'nochevieja_congelada' from stats s
      where s.bebidas = 0 and extract(month from v_inicio) = 12 and extract(day from v_inicio) = 31
      and not exists (select 1 from logros_usuario lu2 join logros l2 on l2.id=lu2.logro_id
                      where lu2.usuario_id = s.usuario_id and l2.slug = 'nochevieja_congelada')
    union all
    select s.usuario_id, 'cumple_legendario' from stats s
      join perfiles p on p.id = s.usuario_id
      where p.cumpleanos is not null
        and extract(month from p.cumpleanos) = extract(month from v_inicio)
        and extract(day from p.cumpleanos) = extract(day from v_inicio)
        and s.posicion_final = 1 and s.bebidas > 0
    union all
    select s.usuario_id, 'cumple_responsable' from stats s
      join perfiles p on p.id = s.usuario_id
      where p.cumpleanos is not null
        and extract(month from p.cumpleanos) = extract(month from v_inicio)
        and extract(day from p.cumpleanos) = extract(day from v_inicio)
        and s.bebidas = (select min(bebidas) from stats)
        and (select count(*) from noche_jugadores where noche_id = p_noche) >= 2
    union all
    select distinct propios.usuario_id, 'siesta' from (
      select usuario_id, ts - lag(ts) over (partition by usuario_id order by ts) as gap
      from regs
    ) propios where propios.gap >= interval '3 hours'
    union all
    select distinct combo.usuario_id, 'combo' from (
      select usuario_id, bebida_tipo_id,
             lag(bebida_tipo_id, 1) over (partition by usuario_id order by ts) as b1,
             lag(bebida_tipo_id, 2) over (partition by usuario_id order by ts) as b2
      from regs
    ) combo
    where combo.b1 is not null and combo.b2 is not null
      and combo.bebida_tipo_id <> combo.b1 and combo.bebida_tipo_id <> combo.b2 and combo.b1 <> combo.b2
  ) x
  join logros l on l.slug = x.slug;

  -- ===== Hidratado (secuencia propia, aparte por su forma) =====
  insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
  select r.usuario_id, l.id, p_noche, v_sala
  from (
    with regs2 as (
      select r.usuario_id, r.ts, (bt.puntos = 0) as es_agua
      from registros r join bebidas_tipo bt on bt.id = r.bebida_tipo_id
      where r.noche_id = p_noche and r.anulado = false
    ),
    secuenciado as (
      select usuario_id, es_agua,
             lag(es_agua) over (partition by usuario_id order by ts) as prev
      from regs2
    )
    select usuario_id
    from secuenciado
    group by usuario_id
    having count(*) >= 2
       and count(*) filter (where es_agua) >= 1
       and count(*) filter (where not es_agua) >= 1
       and bool_and(prev is null or prev <> es_agua)
  ) r
  join logros l on l.slug = 'hidratado';

  -- ===== Happy Hour (repetible por tramos: una medalla por hora con 3+) =====
  insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
  select t.usuario_id, l.id, p_noche, v_sala
  from (
    select usuario_id, count(*) as n from (
      select usuario_id, date_trunc('hour', ts) as hora, count(*) as c
      from registros where noche_id = p_noche and anulado = false
      group by usuario_id, date_trunc('hour', ts)
      having count(*) >= 3
    ) hh group by usuario_id
  ) t, generate_series(1, t.n)
  join logros l on l.slug = 'happy_hour';

  -- ===== Logros por tramos ya existentes (chupitos/cervezas/cubatas) =====
  insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
  select t.usuario_id, l.id, p_noche, v_sala
  from (
    with conteos as (
      select r.usuario_id,
             count(*) filter (where bt.nombre in ('Chupito','Shot especial')) as chupitos,
             count(*) filter (where bt.nombre in ('Cerveza','Pinta')) as cervezas,
             count(*) filter (where bt.nombre = 'Cubata') as cubatas
      from registros r
      join bebidas_tipo bt on bt.id = r.bebida_tipo_id
      where r.noche_id = p_noche and r.anulado = false
      group by r.usuario_id
    )
    select usuario_id, 'ronda_torera' as slug
    from conteos, generate_series(1, floor(chupitos / 5.0)::int)
    where chupitos >= 5
    union all
    select usuario_id, 'media_docena'
    from conteos, generate_series(1, floor(cervezas / 6.0)::int)
    where cervezas >= 6
    union all
    select usuario_id, 'poker_copas'
    from conteos, generate_series(1, floor(cubatas / 4.0)::int)
    where cubatas >= 4
  ) t
  join logros l on l.slug = t.slug;

  -- ===== Puntos de Liga =====
  with regs_alcohol as (
    select r.usuario_id,
           row_number() over (partition by r.usuario_id order by r.ts) as n
    from registros r
    join bebidas_tipo bt on bt.id = r.bebida_tipo_id
    where r.noche_id = p_noche and r.anulado = false and bt.puntos > 0 and r.retroactivo = false
  ),
  vol as (
    select usuario_id,
           count(*) as bebidas,
           sum(case
                 when n <= 5 then b_vol15
                 when n = 6 then b_vol6
                 when n = 7 then b_vol7
                 when n = 8 then b_vol8
                 else b_vol9
               end) as pl_vol
    from regs_alcohol
    group by usuario_id
  ),
  votos as (
    select votado_id as usuario_id, count(*) * b_voto as pl_votos
    from noche_votos
    where noche_id = p_noche
    group by votado_id
  ),
  base as (
    select nj.usuario_id,
           coalesce(v.pl_vol, 0) as pl_vol,
           case
             when coalesce(v.bebidas, 0) = 0 then b_presencia
             when nj.posicion_final = 1 then b_pos1
             when nj.posicion_final = 2 then b_pos2
             when nj.posicion_final = 3 then b_pos3
             else b_resto
           end as pl_pos,
           coalesce(vt.pl_votos, 0) as pl_votos
    from noche_jugadores nj
    left join vol v on v.usuario_id = nj.usuario_id
    left join votos vt on vt.usuario_id = nj.usuario_id
    where nj.noche_id = p_noche
  )
  update noche_jugadores nj
  set pl_ganados = b.pl_vol + b.pl_pos + b.pl_votos
  from base b
  where nj.noche_id = p_noche and nj.usuario_id = b.usuario_id;

  update noche_jugadores nj
  set pl_ganados = coalesce(nj.pl_ganados, 0) + lp.total
  from (
    select lu.usuario_id, sum(l.pl) as total
    from logros_usuario lu
    join logros l on l.id = lu.logro_id
    where lu.noche_id = p_noche
    group by lu.usuario_id
  ) lp
  where nj.noche_id = p_noche and nj.usuario_id = lp.usuario_id;

  -- ===== Bonus sueltos de cartas y habilidades pasivas globales (confeti-caos,
  -- salpicon-puntos, brindis-forzado, todos-al-bar, meteorito-de-caos,
  -- dado-maldito, sombra-del-after, brindis-prohibido, Jefe del After) =====
  update noche_jugadores nj
  set pl_ganados = coalesce(nj.pl_ganados, 0) + fb.pl
  from tmp_bono_cartas_flat fb
  where nj.noche_id = p_noche and nj.usuario_id = fb.usuario_id;

  -- ===== Cartas que dependen de la posicion final (no se pueden calcular
  -- antes porque la posicion depende de los puntos, y estas cartas dependen
  -- de la posicion: se resuelven aparte, ya con posicion_final fijada). =====

  -- Caliz Final Boss: la ultima bebida de la noche de quien la uso vale x5
  -- (ya conto 1x normal; aqui se suman las 4x extra) si acaba en el podio.
  update noche_jugadores nj
  set pl_ganados = coalesce(nj.pl_ganados, 0) + cfb.extra
  from (
    select ca.activa_usuario_id as usuario_id, (ultima.puntos * 4) as extra
    from tmp_cartas_activas ca
    join noche_jugadores nj2 on nj2.noche_id = p_noche and nj2.usuario_id = ca.activa_usuario_id
    join lateral (
      select t.puntos from tmp_registro_puntos t
      where t.usuario_id = ca.activa_usuario_id
      order by t.ts desc
      limit 1
    ) ultima on true
    where ca.carta_id = 'caliz-final-boss' and nj2.posicion_final <= 3
  ) cfb
  where nj.noche_id = p_noche and nj.usuario_id = cfb.usuario_id;

  -- Tormenta Challenger: durante su ventana, las bebidas de quien acabe en
  -- el top 3 valen x2 (se suma el 1x extra sobre lo ya contado).
  update noche_jugadores nj
  set pl_ganados = coalesce(nj.pl_ganados, 0) + tc.extra
  from (
    select t.usuario_id, sum(t.puntos)::int as extra
    from tmp_cartas_activas ca
    join tmp_registro_puntos t
      on t.ts >= ca.usada_en and t.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
    join noche_jugadores nj2 on nj2.noche_id = p_noche and nj2.usuario_id = t.usuario_id and nj2.posicion_final <= 3
    where ca.carta_id = 'tormenta-challenger'
    group by t.usuario_id
  ) tc
  where nj.noche_id = p_noche and nj.usuario_id = tc.usuario_id;

  -- ===== Penalizaciones (vomitona, KO, etc. elegidas al cerrar la noche) =====
  update noche_jugadores nj
  set pl_ganados = greatest(0, coalesce(nj.pl_ganados, 0) + pen.total)
  from (
    select np.usuario_id, sum(pt.pl) as total
    from noche_penalizaciones np
    join penalizaciones_tipo pt on pt.id = np.penalizacion_id
    where np.noche_id = p_noche
    group by np.usuario_id
  ) pen
  where nj.noche_id = p_noche and nj.usuario_id = pen.usuario_id;

  -- ===== Foto de la liga antes de sumar el PL de esta noche, para poder
  -- avisar despues a quien haya sido superado en la clasificacion. =====
  create temporary table tmp_liga_antes on commit drop as
  select usuario_id, pl from liga where temporada_id = v_temporada;

  insert into liga (temporada_id, usuario_id, pl)
  select v_temporada, usuario_id, coalesce(pl_ganados, 0)
  from noche_jugadores
  where noche_id = p_noche
  on conflict (temporada_id, usuario_id)
  do update set pl = liga.pl + excluded.pl;

  -- ===== Notifica a quien haya bajado de puesto en la liga por el cierre
  -- de esta noche (solo si ya tenia puesto antes; una temporada nueva no
  -- genera avisos porque no hay "antes" con quien comparar). =====
  insert into notificaciones_pendientes (usuario_id, sala_id, titulo, cuerpo, url)
  select
    ra.usuario_id,
    v_sala,
    '📉 Te han superado en la liga',
    'Ahora vas ' || rd.pos || 'º con ' || rd.pl || ' PL.',
    '/sala/' || v_sala
  from (
    select usuario_id, pl, rank() over (order by pl desc) as pos from tmp_liga_antes
  ) ra
  join (
    select usuario_id, pl, rank() over (order by pl desc) as pos
    from liga where temporada_id = v_temporada
  ) rd on rd.usuario_id = ra.usuario_id
  where rd.pos > ra.pos;

  -- ===== XP =====
  update perfiles p
  set xp = p.xp + x.total
  from (
    with st as (
      select nj.usuario_id, nj.posicion_final,
             count(r.id) filter (where r.anulado = false) as bebidas
      from noche_jugadores nj
      left join registros r
        on r.noche_id = nj.noche_id and r.usuario_id = nj.usuario_id
      where nj.noche_id = p_noche
      group by nj.usuario_id, nj.posicion_final
    ),
    lx as (
      select lu.usuario_id,
             sum(case l.rareza
                   when 'comun' then 25
                   when 'rara' then 75
                   when 'epica' then 200
                   else 500
                 end) as xp_logros
      from logros_usuario lu
      join logros l on l.id = lu.logro_id
      where lu.noche_id = p_noche
      group by lu.usuario_id
    )
    select st.usuario_id,
           st.bebidas * 5 + 20
           + case when st.posicion_final = 1 and st.bebidas > 0 then 100 else 0 end
           + coalesce(lx.xp_logros, 0) as total
    from st
    left join lx on lx.usuario_id = st.usuario_id
  ) x
  where p.id = x.usuario_id;

  -- ===== Chapas por logro (ademas de la XP que ya dan) =====
  update perfiles p
  set avatar_config = jsonb_set(
    coalesce(p.avatar_config, '{}'::jsonb)
      || jsonb_build_object('tienda', coalesce(p.avatar_config->'tienda', '{}'::jsonb)),
    '{tienda,bonus}',
    to_jsonb(coalesce((p.avatar_config->'tienda'->>'bonus')::int, 0) + cm.total)
  )
  from (
    select lu.usuario_id,
           sum(case l.rareza
                 when 'comun' then 8
                 when 'rara' then 20
                 when 'epica' then 50
                 else 150
               end) as total
    from logros_usuario lu
    join logros l on l.id = lu.logro_id
    where lu.noche_id = p_noche
    group by lu.usuario_id
  ) cm
  where p.id = cm.usuario_id;

  -- ===== Trono del Campeon: cofre epico si acabas 1º tras usarla =====
  update perfiles p
  set avatar_config = jsonb_set(
    coalesce(p.avatar_config, '{}'::jsonb)
      || jsonb_build_object('inventario',
           coalesce(p.avatar_config->'inventario', '{}'::jsonb)
             || jsonb_build_object('cofres', coalesce(p.avatar_config->'inventario'->'cofres', '{}'::jsonb))
         ),
    '{inventario,cofres,epico}',
    to_jsonb(coalesce((p.avatar_config->'inventario'->'cofres'->>'epico')::int, 0) + tdc.n)
  )
  from (
    select ca.activa_usuario_id as usuario_id, count(*) as n
    from tmp_cartas_activas ca
    join noche_jugadores nj2 on nj2.noche_id = p_noche and nj2.usuario_id = ca.activa_usuario_id and nj2.posicion_final = 1
    where ca.carta_id = 'trono-del-campeon'
    group by ca.activa_usuario_id
  ) tdc
  where p.id = tdc.usuario_id;

  -- ===== Coronacion Secreta: cofre legendario si NO estabas en podio al
  -- usarla y acabas en el podio =====
  update perfiles p
  set avatar_config = jsonb_set(
    coalesce(p.avatar_config, '{}'::jsonb)
      || jsonb_build_object('inventario',
           coalesce(p.avatar_config->'inventario', '{}'::jsonb)
             || jsonb_build_object('cofres', coalesce(p.avatar_config->'inventario'->'cofres', '{}'::jsonb))
         ),
    '{inventario,cofres,legendario}',
    to_jsonb(coalesce((p.avatar_config->'inventario'->'cofres'->>'legendario')::int, 0) + cs.n)
  )
  from (
    select ca.activa_usuario_id as usuario_id, count(*) as n
    from tmp_cartas_activas ca
    join noche_jugadores nj2 on nj2.noche_id = p_noche and nj2.usuario_id = ca.activa_usuario_id and nj2.posicion_final <= 3
    where ca.carta_id = 'coronacion-secreta' and ca.condicion_cumplida
    group by ca.activa_usuario_id
  ) cs
  where p.id = cs.usuario_id;
end;
$function$;
