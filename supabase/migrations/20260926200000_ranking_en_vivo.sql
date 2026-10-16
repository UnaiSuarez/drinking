-- Ranking en vivo de una noche, calculado en el servidor con EXACTAMENTE
-- la misma lógica que finalizar_noche (per-registro: multiplicadores,
-- bonos y habilidades pasivas; "sueltas": confeti-caos, salpicon-puntos,
-- brindis-forzado, todos-al-bar, meteorito-de-caos, dado-maldito,
-- sombra-del-after, brindis-prohibido, habilidad del Jefe del After),
-- pero de SOLO LECTURA (stable, sin tocar la noche ni nada).
--
-- Motivo: el cliente (NocheLive) recalculaba los puntos por su cuenta a
-- partir de los registros y las cartas activas, pero nunca tuvo en cuenta
-- las cartas "sueltas" (las que no cuelgan de un registro propio, como
-- Salpicon de Puntos) ni las habilidades pasivas de personaje, y algunas
-- de esas cartas usan un sorteo determinista (hashtext/md5 sobre el id de
-- la carta) que es imposible reproducir fielmente en JavaScript sin
-- arriesgarse a que el número en vivo no coincida con el que se guarda al
-- cerrar. La forma correcta de que el marcador en vivo sea siempre fiel es
-- que use el MISMO cálculo que el cierre real, no una copia aparte: por
-- eso esto vive en el servidor y el cliente solo lo consulta.
--
-- Si se cierra la noche ahora mismo, el PL final puede diferir un poco de
-- esto en los casos muy dependientes del instante exacto (p. ej. Último
-- Ronda mira cuántos minutos faltan para el cierre real), pero para el
-- resto de cartas el número coincide siempre.
create or replace function public.ranking_en_vivo(p_noche uuid)
 returns table(usuario_id uuid, puntos integer, bebidas integer)
 language plpgsql
 volatile
 security definer
 set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_sala uuid;
  v_creador_habilidad text;
  v_ahora timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select n.sala_id into v_sala from noches n where n.id = p_noche;
  if v_sala is null then
    raise exception 'Noche no encontrada';
  end if;
  if not es_miembro(v_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  create temporary table tmp_live_cartas_activas on commit drop as
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

  create temporary table tmp_live_personaje_equipado on commit drop as
  select nj.usuario_id, p.avatar_config->'tienda'->>'avatarEquipado' as personaje_id
  from noche_jugadores nj
  join perfiles p on p.id = nj.usuario_id
  where nj.noche_id = p_noche
    and p.avatar_config->'tienda'->>'avatarEquipado' in
      ('ultimo-ronda', 'jefe-after', 'narrador-noche', 'silencioso-letal', 'guardian-cubata');

  select p.avatar_config->'tienda'->>'avatarEquipado' into v_creador_habilidad
  from noches n join perfiles p on p.id = n.creada_por
  where n.id = p_noche;

  update tmp_live_cartas_activas ca
  set objetivo_id = case
    when exists (
      select 1 from tmp_live_personaje_equipado tpe
      where tpe.usuario_id = ca.objetivo_id and tpe.personaje_id = 'guardian-cubata'
    ) then null
    when exists (
      select 1 from tmp_live_cartas_activas def
      where def.activa_usuario_id = ca.objetivo_id
        and def.carta_id in ('candado-de-barra', 'inmunidad-vip', 'escudo-resaca')
        and ca.usada_en >= def.usada_en
        and ca.usada_en <= coalesce(def.expira_en, 'infinity'::timestamptz)
    ) then null
    when exists (
      select 1 from tmp_live_cartas_activas def
      where def.activa_usuario_id = ca.objetivo_id
        and def.carta_id = 'espejo-borracho'
        and ca.usada_en >= def.usada_en
        and ca.usada_en <= coalesce(def.expira_en, 'infinity'::timestamptz)
    ) then ca.activa_usuario_id
    else ca.objetivo_id
  end
  where ca.objetivo_id is not null;

  create temporary table tmp_live_registro_puntos on commit drop as
  with regs0 as (
    select r.id, r.usuario_id, r.ts, r.bebida_tipo_id, r.retroactivo, r.comentario,
           bt.puntos as puntos_base, bt.nombre as nombre_bebida
    from registros r
    join bebidas_tipo bt on bt.id = r.bebida_tipo_id
    where r.noche_id = p_noche and r.anulado = false
  ),
  con_anterior as (
    select regs0.id,
           bebida_tipo_id is distinct from lag(bebida_tipo_id) over (partition by regs0.usuario_id order by regs0.ts)
             as tipo_distinto_anterior
    from regs0
  ),
  match as (
    select
      r.id as registro_id,
      ca.activa_id, ca.carta_id, ca.activa_usuario_id, ca.objetivo_id, ca.condicion_cumplida,
      row_number() over (partition by ca.activa_id, r.usuario_id order by r.ts) as rn
    from regs0 r
    join tmp_live_cartas_activas ca
      on r.ts >= ca.usada_en and r.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
  ),
  bono as (
    select
      m.registro_id,
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
      sum(case when tpe.personaje_id = 'ultimo-ronda' and (v_ahora - r0.ts) <= interval '10 minutes'
                then 2 else 0 end) as b_ultima_ronda,
      sum(case when tpe.personaje_id = 'narrador-noche'
                and coalesce(nullif(trim(r0.comentario), ''), null) is not null
                then 1 else 0 end) as b_narrador,
      sum(case when tpe.personaje_id = 'silencioso-letal' and r0.puntos_base = 0
                then 1 else 0 end) as b_letal
    from regs0 r0
    left join tmp_live_personaje_equipado tpe on tpe.usuario_id = r0.usuario_id
    group by r0.id
  )
  select
    r0.id as registro_id,
    r0.usuario_id,
    r0.ts,
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

  create temporary table tmp_live_bono_flat on commit drop as
  with confeti as (
    select nj.usuario_id, 1 as pl
    from tmp_live_cartas_activas ca
    join noche_jugadores nj on nj.noche_id = p_noche
    where ca.carta_id = 'confeti-caos'
  ),
  salpicon as (
    select ca.activa_usuario_id as usuario_id, 1 + (abs(hashtext(ca.activa_id)) % 5) as pl
    from tmp_live_cartas_activas ca
    where ca.carta_id = 'salpicon-puntos'
  ),
  brindis as (
    select distinct ca.activa_usuario_id as usuario_id, 3 as pl
    from tmp_live_cartas_activas ca
    where ca.carta_id = 'brindis-forzado'
      and exists (
        select 1 from tmp_live_registro_puntos t
        where t.usuario_id = ca.objetivo_id
          and t.ts >= ca.usada_en and t.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
      )
  ),
  todos_al_bar as (
    select nj.usuario_id, -3 as pl
    from tmp_live_cartas_activas ca
    join noche_jugadores nj on nj.noche_id = p_noche
    where ca.carta_id = 'todos-al-bar'
      and ca.expira_en is not null and ca.expira_en <= v_ahora
      and not exists (
        select 1 from registros r
        where r.usuario_id = nj.usuario_id and r.noche_id = p_noche and r.anulado = false
          and r.ts >= ca.usada_en and r.ts <= ca.expira_en
      )
  ),
  meteorito as (
    select x.usuario_id, 5 as pl
    from (
      select ca.activa_id, nj.usuario_id,
             row_number() over (partition by ca.activa_id order by md5(ca.activa_id || nj.usuario_id::text)) as rn
      from tmp_live_cartas_activas ca
      join noche_jugadores nj on nj.noche_id = p_noche
      where ca.carta_id = 'meteorito-de-caos'
    ) x
    where x.rn <= 3
  ),
  dado_maldito as (
    select nj.usuario_id,
      case (abs(hashtext(ca.activa_id)) % 3) when 0 then 3 else -2 end as pl
    from tmp_live_cartas_activas ca
    join noche_jugadores nj on nj.noche_id = p_noche
    where ca.carta_id = 'dado-maldito' and (abs(hashtext(ca.activa_id)) % 3) in (0, 1)
    union all
    select x.usuario_id, 10 as pl
    from (
      select ca.activa_id, nj.usuario_id,
             row_number() over (partition by ca.activa_id order by md5(ca.activa_id || nj.usuario_id::text)) as rn
      from tmp_live_cartas_activas ca
      join noche_jugadores nj on nj.noche_id = p_noche
      where ca.carta_id = 'dado-maldito' and (abs(hashtext(ca.activa_id)) % 3) = 2
    ) x
    where x.rn = 1
  ),
  sombra as (
    select ca.activa_usuario_id as usuario_id, 5 as pl
    from tmp_live_cartas_activas ca
    where ca.carta_id = 'sombra-del-after'
      and extract(hour from ca.usada_en) < 6
      and ca.condicion_cumplida
  ),
  brindis_prohibido as (
    select ca.activa_usuario_id as usuario_id, (agg.combinado / 2) - agg.propio_caster as pl
    from tmp_live_cartas_activas ca
    join lateral (
      select
        coalesce(sum(t.puntos) filter (where t.usuario_id = ca.activa_usuario_id), 0)::int as propio_caster,
        coalesce(sum(t.puntos) filter (where t.usuario_id in (ca.activa_usuario_id, ca.objetivo_id)), 0)::int as combinado
      from tmp_live_registro_puntos t
      where t.ts >= ca.usada_en and t.ts <= coalesce(ca.expira_en, 'infinity'::timestamptz)
    ) agg on true
    where ca.carta_id = 'brindis-prohibido' and ca.objetivo_id is not null
    union all
    select ca.objetivo_id as usuario_id, (agg.combinado / 2) - agg.propio_target as pl
    from tmp_live_cartas_activas ca
    join lateral (
      select
        coalesce(sum(t.puntos) filter (where t.usuario_id = ca.objetivo_id), 0)::int as propio_target,
        coalesce(sum(t.puntos) filter (where t.usuario_id in (ca.activa_usuario_id, ca.objetivo_id)), 0)::int as combinado
      from tmp_live_registro_puntos t
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
  select todo.usuario_id, sum(todo.pl) as pl
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
  group by todo.usuario_id;

  return query
  select
    nj.usuario_id,
    (coalesce(rp.puntos_sum, 0) + coalesce(bf.pl, 0))::int as puntos,
    coalesce(rp.bebidas, 0)::int as bebidas
  from noche_jugadores nj
  left join (
    select t.usuario_id, sum(t.puntos) as puntos_sum, count(*) as bebidas
    from tmp_live_registro_puntos t
    group by t.usuario_id
  ) rp on rp.usuario_id = nj.usuario_id
  left join tmp_live_bono_flat bf on bf.usuario_id = nj.usuario_id
  where nj.noche_id = p_noche;
end;
$function$;

revoke all on function public.ranking_en_vivo(uuid) from public, anon;
grant execute on function public.ranking_en_vivo(uuid) to authenticated;
