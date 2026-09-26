-- Cofre épico de regalo al unirte a El Ranking, y retroactivo para las
-- cuentas que ya existían antes de este cambio.

-- 1) A partir de ahora: handle_new_user da un cofre épico junto con el
--    perfil nuevo.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_base text;
  v_candidato text;
  v_sufijo int := 1;
begin
  v_base := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );
  v_base := regexp_replace(v_base, '[^[:alnum:]_. -]', '', 'g');
  if v_base = '' then
    v_base := 'jugador';
  end if;

  v_candidato := v_base;
  while exists (select 1 from public.perfiles where lower(nombre) = lower(v_candidato)) loop
    v_sufijo := v_sufijo + 1;
    v_candidato := v_base || v_sufijo::text;
  end loop;

  insert into public.perfiles (id, nombre, avatar_config)
  values (
    new.id,
    v_candidato,
    jsonb_build_object('inventario', jsonb_build_object('cofres', jsonb_build_object('epico', 1)))
  );
  return new;
end;
$function$;

-- 2) Retroactivo: todas las cuentas que ya existían reciben 1 cofre épico
--    ahora mismo, sumado a los que ya tuvieran (no se pisa nada).
update perfiles
set avatar_config = jsonb_set(
  coalesce(avatar_config, '{}'::jsonb)
    || jsonb_build_object('inventario', coalesce(avatar_config->'inventario', '{}'::jsonb)),
  '{inventario,cofres,epico}',
  to_jsonb(coalesce((avatar_config->'inventario'->'cofres'->>'epico')::int, 0) + 1)
);
