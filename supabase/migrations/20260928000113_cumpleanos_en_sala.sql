-- Cumpleaños en la sala: un aviso visible para todos los miembros el día
-- del cumpleaños de alguien, y un cofre de regalo (una vez al año) para
-- quien cumple. Hasta ahora cumpleanos solo se usaba dentro de
-- finalizar_noche para dos logros (cumple_legendario/cumple_responsable),
-- que exigen haber jugado esa noche — esto funciona sin jugar, con solo
-- visitar la sala ese día.

alter table public.recompensas_cofre
  drop constraint recompensas_cofre_origen_check,
  add constraint recompensas_cofre_origen_check
    check (origen = any (array['nivel', 'medalla', 'cumpleanos']));

-- Quién cumple años hoy en una sala. Solo devuelve nombres (no la fecha
-- completa, para no exponer la edad de nadie a sus compañeros de sala).
create or replace function public.cumpleanos_hoy_en_sala(p_sala uuid)
returns table(usuario_id uuid, nombre text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;
  return query
    select p.id, p.nombre
    from perfiles p
    join sala_miembros sm on sm.usuario_id = p.id
    where sm.sala_id = p_sala
      and p.cumpleanos is not null
      and extract(month from p.cumpleanos) = extract(month from (now() at time zone 'utc'))
      and extract(day from p.cumpleanos) = extract(day from (now() at time zone 'utc'));
end;
$function$;

-- Regalo de cumpleaños del propio usuario que llama (auth.uid()): si hoy es
-- su cumpleaños y todavía no se le dio el regalo este año, le añade un
-- cofre épico al inventario. Idempotente vía recompensas_cofre (mismo
-- patrón que recompensar_niveles_xp), así que se puede llamar cada vez que
-- visita cualquier sala sin duplicar el regalo.
create or replace function public.regalo_cumpleanos_hoy()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cumple date;
  v_config jsonb;
  v_inventario jsonb;
  v_cofres jsonb;
  v_anio text;
begin
  select cumpleanos, avatar_config into v_cumple, v_config
  from perfiles where id = auth.uid();

  if v_cumple is null
    or extract(month from v_cumple) <> extract(month from (now() at time zone 'utc'))
    or extract(day from v_cumple) <> extract(day from (now() at time zone 'utc'))
  then
    return false;
  end if;

  v_anio := to_char((now() at time zone 'utc')::date, 'YYYY');

  insert into recompensas_cofre (usuario_id, origen, referencia, cofre_tipo)
  values (auth.uid(), 'cumpleanos', v_anio, 'epico')
  on conflict do nothing;

  if not found then
    return false;
  end if;

  v_config := coalesce(v_config, '{}'::jsonb);
  v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
  v_cofres := coalesce(v_inventario->'cofres', '{}'::jsonb);
  v_cofres := jsonb_set(
    v_cofres, array['epico'],
    to_jsonb(coalesce((v_cofres->>'epico')::integer, 0) + 1),
    true
  );

  update perfiles
  set avatar_config = v_config || jsonb_build_object(
    'inventario', v_inventario || jsonb_build_object('cofres', v_cofres)
  )
  where id = auth.uid();

  return true;
end;
$function$;
