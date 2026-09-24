-- Ampliación del mapa de sitios pedida tras probarlo:
--  - Al crear un sitio, poder ajustar el punto en un mapa en vez de que
--    tenga que ser exactamente donde estás (el frontend ya no manda las
--    coordenadas del GPS sin más: dan el centro inicial de un mapa con un
--    marcador arrastrable).
--  - Elegir un icono para el sitio (antes todos salían con el mismo
--    marcador genérico).
--  - Quién lo descubrió (ya se guardaba en `creado_por`, pero no se
--    exponía en el mapa de perfil) puede borrarlo.
alter table public.sitios add column if not exists icono text not null default '📍';

create or replace function public.crear_sitio(p_nombre text, p_lat double precision, p_lng double precision, p_icono text default '📍')
 returns sitios
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_nombre text;
  v_icono text;
  v_fila public.sitios;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  v_nombre := trim(coalesce(p_nombre, ''));
  if length(v_nombre) < 2 or length(v_nombre) > 60 then
    raise exception 'El nombre del sitio debe tener entre 2 y 60 caracteres';
  end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Ubicación no válida';
  end if;

  v_icono := trim(coalesce(p_icono, ''));
  if v_icono = '' or length(v_icono) > 8 then
    v_icono := '📍';
  end if;

  insert into sitios (nombre, lat, lng, creado_por, icono)
  values (v_nombre, p_lat, p_lng, auth.uid(), v_icono)
  returning * into v_fila;

  return v_fila;
end;
$function$;

-- Quién descubrió un sitio ya puede borrarlo (los registros que lo tenían
-- marcado se quedan sin sitio: `registros.sitio_id` ya era
-- `on delete set null`, no hace falta tocar nada más).
create or replace function public.eliminar_sitio(p_sitio_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  delete from sitios where id = p_sitio_id and creado_por = auth.uid();

  if not found then
    raise exception 'Ese sitio no existe o no lo descubriste tú';
  end if;
end;
$function$;

-- mis_sitios_mapa ahora también devuelve el icono y quién lo descubrió,
-- para poder pintarlo en el mapa y ofrecer el botón de borrar solo a quien
-- corresponda.
-- Cambia el tipo de fila devuelto (columnas nuevas), así que hace falta
-- borrarla antes: `create or replace` no permite cambiar el tipo de
-- retorno de una función con OUT params/tabla.
drop function if exists public.mis_sitios_mapa();

create function public.mis_sitios_mapa()
 returns table(sitio_id uuid, nombre text, lat double precision, lng double precision, tipo text, icono text, creado_por uuid, descubridor_nombre text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with visibles as (
    select auth.uid() as usuario_id
    union
    select amigo_id from mis_amigos() where estado = 'aceptada'
  ),
  marcas as (
    select distinct r.sitio_id, r.usuario_id
    from registros r
    where r.sitio_id is not null
      and r.anulado = false
      and r.usuario_id in (select usuario_id from visibles)
  )
  select
    s.id as sitio_id,
    s.nombre,
    s.lat,
    s.lng,
    case
      when bool_or(m.usuario_id = auth.uid()) and bool_or(m.usuario_id <> auth.uid()) then 'ambos'
      when bool_or(m.usuario_id = auth.uid()) then 'tuyo'
      else 'amigo'
    end as tipo,
    s.icono,
    s.creado_por,
    p.nombre as descubridor_nombre
  from marcas m
  join sitios s on s.id = m.sitio_id
  left join perfiles p on p.id = s.creado_por
  where auth.uid() is not null
  group by s.id, s.nombre, s.lat, s.lng, s.icono, s.creado_por, p.nombre;
$function$;
