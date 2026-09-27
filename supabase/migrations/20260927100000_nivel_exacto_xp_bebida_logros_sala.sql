-- 1) Admin: fijar el nivel exacto de un jugador. En vez de guardar un campo
--    "nivel" (no existe: el nivel se deriva siempre de perfiles.xp), calcula
--    la XP base de ese nivel con la misma curva de src/lib/niveles.ts y la
--    aplica. El trigger `recompensar_niveles_xp` (ya existente) se dispara
--    solo con la actualización de xp y entrega, de forma idempotente, los
--    cofres de todos los niveles intermedios — así el jugador los recibe
--    en cuanto entre, igual que si los hubiera subido jugando.
create or replace function public.admin_establecer_nivel(p_usuario uuid, p_nivel integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not es_super_admin() then
    raise exception 'No autorizado';
  end if;
  update perfiles
  set xp = case when p_nivel <= 1 then 0 else round(100 * power(p_nivel::numeric, 1.4)) end
  where id = p_usuario;
end;
$$;

revoke all on function public.admin_establecer_nivel(uuid, integer) from public, anon;
grant execute on function public.admin_establecer_nivel(uuid, integer) to authenticated;

-- 2) XP por bebida suelta (salas permanentes): antes era un +5 fijo para
--    cualquier bebida, igual que registrar un agua que un cubata. Ahora se
--    apoya en bebidas_tipo.puntos (la misma columna que ya gradúa el PL de
--    una noche) para que cada bebida dé una XP distinta, y sube la base para
--    que subir de nivel sea más alcanzable en una sala permanente:
--      agua/refresco (0 puntos) → 5 XP  (igual que antes, suelo)
--      cerveza/vino/kalimotxo (1) → 8 XP
--      pinta/chupito/shot (2)     → 11 XP
--      cubata (3)                 → 14 XP
--    El bono por primera vez con una bebida rara/épica/legendaria del
--    catálogo se mantiene igual (+5/+15/+30).
create or replace function public.registrar_bebida_suelta(p_sala uuid, p_bebida_tipo_id integer, p_bebida_catalogo_id uuid DEFAULT NULL::uuid, p_comentario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tipo text;
  v_tipo_id integer;
  v_puntos int;
  v_rareza text;
  v_es_primera boolean := false;
  v_bonus_rareza int := 0;
  v_xp int;
  v_registro public.registros;
  v_logros_nuevos jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bebida_suelta:' || auth.uid()::text, 0));

  select coalesce(config->>'tipo', 'normal') into v_tipo from salas where id = p_sala;
  if v_tipo <> 'permanente' then
    raise exception 'Solo se pueden registrar bebidas sueltas en una sala permanente';
  end if;

  v_tipo_id := p_bebida_tipo_id;

  if p_bebida_catalogo_id is not null then
    select categoria_id, rareza into v_tipo_id, v_rareza
    from bebidas_catalogo
    where id = p_bebida_catalogo_id and (sala_id is null or sala_id = p_sala);
    if not found then
      raise exception 'Bebida del catálogo no válida para esta sala';
    end if;

    v_es_primera := not exists (
      select 1 from registros
      where usuario_id = auth.uid() and bebida_catalogo_id = p_bebida_catalogo_id
    );
    if v_es_primera then
      v_bonus_rareza := case v_rareza
        when 'rara' then 5 when 'epica' then 15 when 'legendaria' then 30 else 0
      end;
    end if;
  end if;

  select puntos into v_puntos
  from bebidas_tipo where id = v_tipo_id and (sala_id is null or sala_id = p_sala);
  if not found then
    raise exception 'Tipo de bebida no válido para esta sala';
  end if;

  insert into registros (sala_id, usuario_id, bebida_tipo_id, bebida_catalogo_id, comentario)
  values (p_sala, auth.uid(), v_tipo_id, p_bebida_catalogo_id, nullif(trim(coalesce(p_comentario, '')), ''))
  returning * into v_registro;

  v_xp := 5 + coalesce(v_puntos, 0) * 3 + v_bonus_rareza;
  update perfiles set xp = xp + v_xp where id = auth.uid();

  v_logros_nuevos := otorgar_logros_lifetime(auth.uid(), p_sala);

  return to_jsonb(v_registro)
    || jsonb_build_object(
      'registro', to_jsonb(v_registro),
      'xp_ganada', v_xp,
      'descubierta', v_es_primera and v_bonus_rareza > 0,
      'logros_nuevos', coalesce(v_logros_nuevos, '[]'::jsonb)
    );
end;
$function$;

-- 3) Medallas exclusivas de sala permanente: solo se pueden conseguir
--    registrando bebidas sueltas (registros.noche_id is null), nunca en una
--    noche formal. No sustituyen a nada existente.
insert into public.logros (slug, nombre, icono, descripcion, rareza, pl, repetible, secreto) values
  ('sala_ritual', 'Ritual de Sala', '🕯️', 'Registra algo en 7 días distintos en una sala permanente (fuera de una noche).', 'rara', 0, false, false),
  ('sala_constancia', 'Constancia de Hierro', '⚙️', 'Registra algo en 30 días distintos en una sala permanente.', 'epica', 0, false, false),
  ('sala_leyenda', 'Leyenda del Barrio', '🏛️', 'Registra algo en 100 días distintos en una sala permanente.', 'legendaria', 0, false, false),
  ('sala_madrugada', 'Sesión de Madrugada', '🌌', 'Registra una bebida suelta entre las 00:00 y las 06:00, fuera de una noche.', 'rara', 0, false, false),
  ('sala_cronista', 'Cronista de Sala', '📓', 'Añade comentario a 20 bebidas sueltas.', 'rara', 0, false, false)
on conflict (slug) do nothing;

-- 4) otorgar_logros_lifetime: añade las 5 candidatas de arriba al mismo
--    bucle que ya comprueba cervecero/centurion/coctelero/etc. en cada
--    bebida suelta (misma función, mismo punto de entrada — no hace falta
--    ningún disparador nuevo). Los nuevos conteos se limitan a
--    `noche_id is null` para que una noche formal nunca las adelante.
create or replace function public.otorgar_logros_lifetime(p_usuario uuid, p_sala uuid)
returns jsonb
language plpgsql security definer set search_path = 'public'
as $$
declare
  v_cervezas int; v_chupitos int; v_cubatas int; v_total int; v_tipos int;
  v_cervezas_cat int; v_raras_mas int; v_legendarias int;
  v_dias_sala int; v_comentarios_sala int; v_madrugada_sala boolean;
  v_nuevos jsonb := '[]'::jsonb;
  v_cand record;
  v_logro logros%rowtype;
  v_xp int;
  v_chapas int;
  v_ya boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('bebida_suelta:' || p_usuario::text, 0));

  select
    count(*) filter (where bt.nombre in ('Cerveza','Pinta')),
    count(*) filter (where bt.nombre in ('Chupito','Shot especial')),
    count(*) filter (where bt.nombre = 'Cubata'),
    count(*),
    count(distinct r.bebida_tipo_id)
  into v_cervezas, v_chupitos, v_cubatas, v_total, v_tipos
  from registros r
  join bebidas_tipo bt on bt.id = r.bebida_tipo_id
  where r.usuario_id = p_usuario and r.anulado = false;

  select count(distinct r.bebida_catalogo_id)
  into v_cervezas_cat
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  join bebidas_tipo bt on bt.id = bc.categoria_id
  where r.usuario_id = p_usuario and r.anulado = false and bt.nombre = 'Cerveza';

  select
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza in ('rara','epica','legendaria')),
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza = 'legendaria')
  into v_raras_mas, v_legendarias
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  where r.usuario_id = p_usuario and r.anulado = false;

  -- Solo bebidas sueltas (sin noche): base de las medallas exclusivas de sala.
  select count(distinct date_trunc('day', r.ts))
  into v_dias_sala
  from registros r
  where r.usuario_id = p_usuario and r.noche_id is null and r.anulado = false;

  select count(*) filter (where r.comentario is not null)
  into v_comentarios_sala
  from registros r
  where r.usuario_id = p_usuario and r.noche_id is null and r.anulado = false;

  select exists(
    select 1 from registros r
    where r.usuario_id = p_usuario and r.noche_id is null and r.anulado = false
      and extract(hour from r.ts) < 6
  ) into v_madrugada_sala;

  for v_cand in
    select * from (values
      ('cervecero_1', v_cervezas >= 50), ('cervecero_2', v_cervezas >= 250),
      ('cervecero_3', v_cervezas >= 1000), ('cervecero_4', v_cervezas >= 5000),
      ('centurion_1', v_chupitos >= 25), ('centurion_2', v_chupitos >= 100),
      ('centurion_3', v_chupitos >= 500), ('centurion_4', v_chupitos >= 1000),
      ('coctelero_1', v_cubatas >= 25), ('coctelero_2', v_cubatas >= 100),
      ('coctelero_3', v_cubatas >= 500), ('coctelero_4', v_cubatas >= 1000),
      ('oceano', v_total >= 1000), ('monumento', v_total >= 5000),
      ('enciclopedia', v_tipos >= 8),
      ('sumiller_1', v_cervezas_cat >= 10), ('sumiller_2', v_cervezas_cat >= 25),
      ('coleccionista_raras', v_raras_mas >= 3),
      ('coleccionista_legendaria', v_legendarias >= 1),
      ('sala_ritual', v_dias_sala >= 7),
      ('sala_constancia', v_dias_sala >= 30),
      ('sala_leyenda', v_dias_sala >= 100),
      ('sala_madrugada', v_madrugada_sala),
      ('sala_cronista', v_comentarios_sala >= 20)
    ) as t(slug, cumple)
    where cumple
  loop
    select exists (
      select 1 from logros_usuario lu join logros l on l.id = lu.logro_id
      where lu.usuario_id = p_usuario and l.slug = v_cand.slug
    ) into v_ya;
    if v_ya then
      continue;
    end if;

    select * into v_logro from logros where slug = v_cand.slug;
    if not found then
      continue;
    end if;

    insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
    values (p_usuario, v_logro.id, null, p_sala);

    v_xp := case v_logro.rareza
      when 'comun' then 25 when 'rara' then 75 when 'epica' then 200 else 500 end;
    v_chapas := case v_logro.rareza
      when 'comun' then 8 when 'rara' then 20 when 'epica' then 50 else 150 end;

    update perfiles p
    set xp = p.xp + v_xp,
        avatar_config = jsonb_set(
          coalesce(p.avatar_config, '{}'::jsonb)
            || jsonb_build_object('tienda', coalesce(p.avatar_config->'tienda', '{}'::jsonb)),
          '{tienda,bonus}',
          to_jsonb(coalesce((p.avatar_config->'tienda'->>'bonus')::int, 0) + v_chapas)
        )
    where p.id = p_usuario;

    v_nuevos := v_nuevos || jsonb_build_object(
      'slug', v_logro.slug, 'nombre', v_logro.nombre,
      'icono', v_logro.icono, 'rareza', v_logro.rareza
    );
  end loop;

  return v_nuevos;
end;
$$;

-- 5) Lectura para el panel "Avance de medallas" de la sala permanente:
--    mismos conteos que otorgar_logros_lifetime (de por vida, no solo de
--    esta sala, porque las medallas también lo son), pero de solo lectura,
--    para poder pintar barras de progreso sin tener que traer al cliente
--    cada registro histórico del jugador.
create or replace function public.progreso_medallas_sala(p_sala uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_cervezas int; v_chupitos int; v_cubatas int; v_total int; v_tipos int;
  v_cervezas_cat int; v_raras_mas int; v_legendarias int;
  v_dias_sala int; v_comentarios_sala int; v_madrugada_sala boolean;
  v_obtenidos jsonb;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  select
    count(*) filter (where bt.nombre in ('Cerveza','Pinta')),
    count(*) filter (where bt.nombre in ('Chupito','Shot especial')),
    count(*) filter (where bt.nombre = 'Cubata'),
    count(*),
    count(distinct r.bebida_tipo_id)
  into v_cervezas, v_chupitos, v_cubatas, v_total, v_tipos
  from registros r
  join bebidas_tipo bt on bt.id = r.bebida_tipo_id
  where r.usuario_id = v_uid and r.anulado = false;

  select count(distinct r.bebida_catalogo_id)
  into v_cervezas_cat
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  join bebidas_tipo bt on bt.id = bc.categoria_id
  where r.usuario_id = v_uid and r.anulado = false and bt.nombre = 'Cerveza';

  select
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza in ('rara','epica','legendaria')),
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza = 'legendaria')
  into v_raras_mas, v_legendarias
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  where r.usuario_id = v_uid and r.anulado = false;

  select count(distinct date_trunc('day', r.ts))
  into v_dias_sala
  from registros r
  where r.usuario_id = v_uid and r.noche_id is null and r.anulado = false;

  select count(*) filter (where r.comentario is not null)
  into v_comentarios_sala
  from registros r
  where r.usuario_id = v_uid and r.noche_id is null and r.anulado = false;

  select exists(
    select 1 from registros r
    where r.usuario_id = v_uid and r.noche_id is null and r.anulado = false
      and extract(hour from r.ts) < 6
  ) into v_madrugada_sala;

  select coalesce(jsonb_agg(l.slug), '[]'::jsonb)
  into v_obtenidos
  from logros_usuario lu join logros l on l.id = lu.logro_id
  where lu.usuario_id = v_uid;

  return jsonb_build_object(
    'cervezas', v_cervezas, 'chupitos', v_chupitos, 'cubatas', v_cubatas,
    'total', v_total, 'tipos', v_tipos,
    'cervezasCatalogo', v_cervezas_cat, 'rarasOMas', v_raras_mas, 'legendarias', v_legendarias,
    'diasSala', v_dias_sala, 'comentariosSala', v_comentarios_sala, 'madrugadaSala', v_madrugada_sala,
    'obtenidos', v_obtenidos
  );
end;
$$;

revoke all on function public.progreso_medallas_sala(uuid) from public, anon;
grant execute on function public.progreso_medallas_sala(uuid) to authenticated;
