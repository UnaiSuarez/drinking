-- Desde la ficha de un amigo (ya aceptado), un botón de mapa que muestra
-- solo los sitios que ÉL ha marcado (en vez del mapa combinado de
-- mis_sitios_mapa, que junta los tuyos con los de todos tus amigos).
--
-- Misma restricción de visibilidad que el resto del sistema de amigos: si
-- p_amigo_id no es una amistad aceptada tuya, no se devuelve nada.
create or replace function public.sitios_de_amigo(p_amigo_id uuid)
 returns table(sitio_id uuid, nombre text, lat double precision, lng double precision, tipo text, icono text, creado_por uuid, descubridor_nombre text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with es_amigo as (
    select 1 from amistades
    where estado = 'aceptada'
      and ((usuario_a = auth.uid() and usuario_b = p_amigo_id)
        or (usuario_a = p_amigo_id and usuario_b = auth.uid()))
  ),
  marcas as (
    select distinct r.sitio_id, r.usuario_id
    from registros r
    where r.sitio_id is not null
      and r.anulado = false
      and r.usuario_id in (auth.uid(), p_amigo_id)
      and exists (select 1 from es_amigo)
    union
    select distinct sr.sitio_id, sr.usuario_id
    from sojas_registros sr
    where sr.sitio_id is not null
      and sr.usuario_id in (auth.uid(), p_amigo_id)
      and exists (select 1 from es_amigo)
  ),
  marcas_de_amigo as (
    select m.sitio_id from marcas m where m.usuario_id = p_amigo_id
  )
  select
    s.id as sitio_id,
    s.nombre,
    s.lat,
    s.lng,
    case
      when bool_or(m.usuario_id = auth.uid()) then 'ambos'
      else 'amigo'
    end as tipo,
    s.icono,
    s.creado_por,
    p.nombre as descubridor_nombre
  from marcas m
  join sitios s on s.id = m.sitio_id
  left join perfiles p on p.id = s.creado_por
  where auth.uid() is not null
    and m.sitio_id in (select sitio_id from marcas_de_amigo)
  group by s.id, s.nombre, s.lat, s.lng, s.icono, s.creado_por, p.nombre;
$function$;

revoke all on function public.sitios_de_amigo(uuid) from public, anon;
grant execute on function public.sitios_de_amigo(uuid) to authenticated;
