-- Amplía los eventos de temporada: 4 eventos (Halloween, Navidad, Año
-- Nuevo, Verano), 3 niveles cada uno (común=participar, épico=5 días
-- distintos, legendario=ganar una noche), cada nivel da un banner y un
-- marco exclusivos. El legendario, además, desbloquea la skin de evento
-- de los 5 personajes ocultos (una skin compartida, vale con cualquier
-- evento). Sustituye a otorgar_banner_temporada (solo daba 1 banner por
-- participar) por otorgar_recompensas_temporada.
--
-- Mismas ventanas que src/lib/temporadaCosmetica.ts — si cambian las
-- fechas ahí, hay que replicarlo aquí también.

insert into public.banners_catalogo (id, nombre, rareza, precio, exclusivo)
values
  ('halloween-epico', 'Aquelarre', 'exclusiva', 0, true),
  ('halloween-legendario', 'Señor de las Sombras', 'exclusiva', 0, true),
  ('navidad-epico', 'Estrella de Belén', 'exclusiva', 0, true),
  ('navidad-legendario', 'Espíritu de la Navidad', 'exclusiva', 0, true),
  ('anio-nuevo-comun', 'Brindis de Medianoche', 'exclusiva', 0, true),
  ('anio-nuevo-epico', 'Confeti Dorado', 'exclusiva', 0, true),
  ('anio-nuevo-legendario', 'Campanadas Legendarias', 'exclusiva', 0, true),
  ('verano-epico', 'Atardecer de Playa', 'exclusiva', 0, true),
  ('verano-legendario', 'Rey del Verano', 'exclusiva', 0, true),
  ('maestro-prestigio', 'Maestro de Prestigio', 'exclusiva', 0, true)
on conflict (id) do nothing;

drop function if exists public.otorgar_banner_temporada();

create or replace function public.otorgar_recompensas_temporada()
returns text[] -- ids de banner concedidos en esta llamada (para depurar/mostrar)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_hoy date := (now() at time zone 'utc')::date;
  v_mes int := extract(month from v_hoy)::int;
  v_dia int := extract(day from v_hoy)::int;
  v_anio int := extract(year from v_hoy)::int;
  v_evento text;
  v_desde date;
  v_hasta date;
  v_recompensas jsonb := '{
    "halloween": {"comun":"noche-de-brujas","epico":"halloween-epico","legendario":"halloween-legendario"},
    "navidad": {"comun":"luces-de-navidad","epico":"navidad-epico","legendario":"navidad-legendario"},
    "anio-nuevo": {"comun":"anio-nuevo-comun","epico":"anio-nuevo-epico","legendario":"anio-nuevo-legendario"},
    "verano": {"comun":"chiringuito-de-verano","epico":"verano-epico","legendario":"verano-legendario"}
  }'::jsonb;
  v_comun boolean;
  v_epico boolean;
  v_legendario boolean;
  v_config jsonb;
  v_tienda jsonb;
  v_marcos jsonb;
  v_inventario jsonb;
  v_skins jsonb;
  v_id text;
  v_concedidos text[] := array[]::text[];
  v_skin_id text;
begin
  if v_uid is null then
    return v_concedidos;
  end if;

  if (v_mes = 10 and v_dia >= 20) or (v_mes = 11 and v_dia <= 2) then
    v_evento := 'halloween';
    v_desde := make_date(v_anio, 10, 20);
    v_hasta := make_date(v_anio, 11, 2);
  elsif v_mes = 12 and v_dia between 15 and 30 then
    v_evento := 'navidad';
    v_desde := make_date(v_anio, 12, 15);
    v_hasta := make_date(v_anio, 12, 30);
  elsif (v_mes = 12 and v_dia = 31) or (v_mes = 1 and v_dia <= 2) then
    v_evento := 'anio-nuevo';
    if v_mes = 12 then
      v_desde := make_date(v_anio, 12, 31);
      v_hasta := make_date(v_anio + 1, 1, 2);
    else
      v_desde := make_date(v_anio - 1, 12, 31);
      v_hasta := make_date(v_anio, 1, 2);
    end if;
  elsif (v_mes > 6 or (v_mes = 6 and v_dia >= 21)) and (v_mes < 9 or (v_mes = 9 and v_dia <= 21)) then
    v_evento := 'verano';
    v_desde := make_date(v_anio, 6, 21);
    v_hasta := make_date(v_anio, 9, 21);
  else
    return v_concedidos;
  end if;

  v_comun := exists (
    select 1 from registros_sala
    where usuario_id = v_uid and anulado = false
      and (ts at time zone 'utc')::date between v_desde and v_hasta
  );
  if not v_comun then
    return v_concedidos;
  end if;

  v_epico := (
    select count(distinct (ts at time zone 'utc')::date) >= 5
    from registros_sala
    where usuario_id = v_uid and anulado = false
      and (ts at time zone 'utc')::date between v_desde and v_hasta
  );

  v_legendario := exists (
    select 1 from noche_jugadores nj join noches n on n.id = nj.noche_id
    where nj.usuario_id = v_uid and nj.posicion_final = 1 and n.estado = 'cerrada'
      and (n.inicio at time zone 'utc')::date between v_desde and v_hasta
  );

  select avatar_config into v_config from perfiles where id = v_uid;
  v_config := coalesce(v_config, '{}'::jsonb);
  v_tienda := coalesce(v_config->'tienda', '{}'::jsonb);
  v_marcos := coalesce(v_tienda->'marcos', '[]'::jsonb);
  v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
  v_skins := coalesce(v_inventario->'skins', '[]'::jsonb);

  -- Común: siempre que hay al menos un registro en la ventana.
  v_id := v_recompensas -> v_evento ->> 'comun';
  insert into banners_usuario (usuario_id, banner_id) values (v_uid, v_id) on conflict do nothing;
  if found then v_concedidos := v_concedidos || v_id; end if;
  if not (v_marcos ? v_id) then v_marcos := v_marcos || to_jsonb(v_id); end if;

  if v_epico then
    v_id := v_recompensas -> v_evento ->> 'epico';
    insert into banners_usuario (usuario_id, banner_id) values (v_uid, v_id) on conflict do nothing;
    if found then v_concedidos := v_concedidos || v_id; end if;
    if not (v_marcos ? v_id) then v_marcos := v_marcos || to_jsonb(v_id); end if;
  end if;

  if v_legendario then
    v_id := v_recompensas -> v_evento ->> 'legendario';
    insert into banners_usuario (usuario_id, banner_id) values (v_uid, v_id) on conflict do nothing;
    if found then v_concedidos := v_concedidos || v_id; end if;
    if not (v_marcos ? v_id) then v_marcos := v_marcos || to_jsonb(v_id); end if;

    -- Skin de evento: compartida entre eventos, una por personaje.
    foreach v_skin_id in array array[
      'ultimo-ronda-evento', 'jefe-after-evento', 'guardian-cubata-evento',
      'narrador-noche-evento', 'silencioso-letal-evento'
    ]
    loop
      if not (v_skins ? v_skin_id) then v_skins := v_skins || to_jsonb(v_skin_id); end if;
    end loop;
  end if;

  v_tienda := v_tienda || jsonb_build_object('marcos', v_marcos);
  v_inventario := v_inventario || jsonb_build_object('skins', v_skins);
  v_config := v_config || jsonb_build_object('tienda', v_tienda, 'inventario', v_inventario);
  update perfiles set avatar_config = v_config where id = v_uid;

  return v_concedidos;
end;
$function$;

-- Maestro de Prestigio (ciclo 6): el único marco más allá del infinito, y
-- su banner a juego. Mismo mecanismo que los prestigios 1-5, una línea más
-- en cada CASE.
create or replace function public.ascender_prestigio(p_ciclo_actual integer)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles%rowtype;
  v_ciclo integer;
  v_marco text;
  v_tienda jsonb;
  v_marcos jsonb;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into v_perfil from public.perfiles where id = v_uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  select coalesce(max(ciclo), 0) into v_ciclo from public.prestigios where usuario_id = v_uid;
  if p_ciclo_actual is null or p_ciclo_actual <> v_ciclo then
    raise exception 'Tu prestigio ha cambiado. Actualiza la pagina.';
  end if;
  if coalesce(v_perfil.xp, 0) < round(100 * power(50::numeric, 1.4)) then
    raise exception 'Necesitas alcanzar el nivel 50';
  end if;
  if exists (select 1 from public.noche_jugadores j join public.noches n on n.id = j.noche_id
    where j.usuario_id = v_uid and n.estado <> 'cerrada') then
    raise exception 'Termina tus noches pendientes antes de hacer prestigio';
  end if;
  update public.perfiles set xp = xp where id = v_uid returning * into v_perfil;
  v_ciclo := v_ciclo + 1;
  v_marco := case v_ciclo when 1 then 'eclipse' when 2 then 'supernova' when 3 then 'quasar' when 4 then 'singularidad' when 5 then 'infinito' when 6 then 'maestro-prestigio' else null end;
  v_tienda := coalesce(v_perfil.avatar_config->'tienda', '{}'::jsonb);
  v_marcos := coalesce(v_tienda->'marcos', '[]'::jsonb);
  if v_marco is not null and not (v_marcos ? v_marco) then v_marcos := v_marcos || to_jsonb(v_marco); end if;
  v_tienda := v_tienda || jsonb_build_object('marcos', v_marcos,
    'bonus', coalesce((v_tienda->>'bonus')::integer, 0) + floor(v_perfil.xp::numeric / 50)::integer);
  insert into public.prestigios(usuario_id, ciclo, xp_anterior, marco) values(v_uid, v_ciclo, v_perfil.xp, v_marco);
  update public.perfiles set xp = 0,
    avatar_config = coalesce(v_perfil.avatar_config, '{}'::jsonb) || jsonb_build_object('tienda', v_tienda)
    where id = v_uid;
  return jsonb_build_object('ciclo', v_ciclo, 'marco', v_marco);
end;
$function$;

create or replace function public.entregar_banner_prestigio()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare v_banner text;
begin
  v_banner := case new.ciclo
    when 1 then 'primer-juramento'
    when 2 then 'guardian-esmeralda'
    when 3 then 'corona-mareas'
    when 4 then 'eclipse-real'
    when 5 then 'cenit'
    when 6 then 'maestro-prestigio'
    else null
  end;
  if v_banner is not null then
    insert into public.banners_usuario(usuario_id, banner_id)
    values (new.usuario_id, v_banner) on conflict do nothing;
  end if;
  return new;
end;
$function$;
