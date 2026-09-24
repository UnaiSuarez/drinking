-- Hasta ahora perfiles.nombre se generaba en el alta (handle_new_user) a
-- partir del correo (la parte antes de la @) y no había forma de cambiarlo
-- ni garantía de que fuera único. Esto se necesita para poder buscar/añadir
-- amigos por nombre. Cambios:
--
-- 1) Resuelve el único duplicado que había en producción (dos perfiles con
--    el mismo nombre, en minúsculas) antes de poder crear el índice único.
-- 2) Índice único case-insensitive sobre nombre.
-- 3) handle_new_user sigue generando un nombre por defecto a partir del
--    correo (el login solo pide correo+contraseña, no username), pero ahora
--    evita colisiones añadiendo un sufijo numérico si hace falta.
-- 4) Nueva RPC cambiar_nombre_usuario para que cada jugador pueda elegir su
--    propio nombre desde el perfil, validando formato y unicidad.

update perfiles set nombre = nombre || '3'
where id = '60a827d7-f948-456b-b683-058914f70b35'
  and lower(nombre) = 'tualemandeconfianza';

create unique index if not exists perfiles_nombre_lower_key on perfiles (lower(nombre));

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

  insert into public.perfiles (id, nombre)
  values (new.id, v_candidato);
  return new;
end;
$function$;

create or replace function public.cambiar_nombre_usuario(p_nombre text)
 returns perfiles
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_nombre text;
  v_fila public.perfiles;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  v_nombre := trim(coalesce(p_nombre, ''));
  if length(v_nombre) < 3 or length(v_nombre) > 24 then
    raise exception 'El nombre debe tener entre 3 y 24 caracteres';
  end if;
  if v_nombre !~ '^[[:alnum:]_. -]+$' then
    raise exception 'Solo letras, números, espacios, guiones, puntos y guion bajo';
  end if;
  if exists (
    select 1 from perfiles where lower(nombre) = lower(v_nombre) and id <> auth.uid()
  ) then
    raise exception 'Ese nombre ya está en uso';
  end if;

  begin
    update perfiles set nombre = v_nombre where id = auth.uid()
    returning * into v_fila;
  exception when unique_violation then
    raise exception 'Ese nombre ya está en uso';
  end;

  return v_fila;
end;
$function$;
