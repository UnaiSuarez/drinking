-- Dos ampliaciones pedidas tras usar el mapa y la página de bebidas de la
-- sala:
--
-- 1) Las SOJAS (sin alcohol) también se pueden marcar en el mapa, con la
--    misma restricción que la bebida suelta: solo fuera de una noche.
--    `registrar_soja` ya exige sala permanente cuando `p_noche` es nulo
--    (ver su cuerpo), así que basta con exigir `noche_id is null` al
--    marcar, igual que `marcar_sitio_de_registro` exige `sala_id is not
--    null`. `sojas_registros.sala_id` es NOT NULL siempre (a diferencia de
--    `registros`), así que aquí el discriminador de "no es una noche" es
--    `noche_id`, no `sala_id`.
--
-- 2) /sala/[id]/registros gana un desglose agregado por jugador y por
--    bebida (cuántas de cada una, y si es una bebida concreta del
--    catálogo o solo el tipo genérico), calculado en Postgres para no
--    tener que cargar el historial entero (mismo espíritu que
--    ranking_bebidas_sala).
alter table public.sojas_registros add column if not exists sitio_id uuid references public.sitios(id) on delete set null;

create or replace function public.marcar_sitio_de_soja(p_registro_id uuid, p_sitio_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not exists (select 1 from sitios where id = p_sitio_id) then
    raise exception 'Ese sitio no existe';
  end if;

  update sojas_registros
  set sitio_id = p_sitio_id
  where id = p_registro_id
    and usuario_id = auth.uid()
    and noche_id is null;

  if not found then
    raise exception 'Ese registro SOJAS no se puede marcar (no es tuyo, o es de una noche)';
  end if;
end;
$function$;

-- mis_sitios_mapa: las marcas ahora vienen de registros (bebida suelta) Y
-- de sojas_registros, unidas. El tipo de fila devuelto no cambia.
create or replace function public.mis_sitios_mapa()
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
    union
    select distinct sr.sitio_id, sr.usuario_id
    from sojas_registros sr
    where sr.sitio_id is not null
      and sr.usuario_id in (select usuario_id from visibles)
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

-- detalle_sitio: desglose por persona, ahora combinando bebida suelta y
-- SOJAS (las SOJAS no tienen bebida_tipo_id del catálogo alcohólico, así
-- que ese campo sale a null en sus filas).
create or replace function public.detalle_sitio(p_sitio_id uuid)
 returns table(
   usuario_id uuid,
   nombre text,
   bebida_tipo_id integer,
   bebida_nombre text,
   bebida_icono text,
   cantidad bigint,
   ultima timestamptz
 )
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
  combinado as (
    select r.usuario_id, bt.id as bebida_tipo_id, bt.nombre as bebida_nombre, bt.icono as bebida_icono, r.ts
    from registros r
    join bebidas_tipo bt on bt.id = r.bebida_tipo_id
    where r.sitio_id = p_sitio_id
      and r.anulado = false
    union all
    select
      sr.usuario_id,
      null::integer,
      case sr.bebida
        when 'agua' then 'Agua'
        when 'refresco' then 'Refresco'
        when 'cerveza_0' then 'Cerveza 0,0'
        when 'coctel_0' then 'Cóctel 0,0'
        when 'zumo' then 'Zumo'
        else sr.bebida
      end,
      case sr.bebida
        when 'agua' then '💧'
        when 'refresco' then '🥤'
        when 'cerveza_0' then '🍺'
        when 'coctel_0' then '🍹'
        when 'zumo' then '🧃'
        else '🥤'
      end,
      sr.ts
    from sojas_registros sr
    where sr.sitio_id = p_sitio_id
  )
  select
    c.usuario_id,
    p.nombre,
    c.bebida_tipo_id,
    c.bebida_nombre,
    c.bebida_icono,
    count(*) as cantidad,
    max(c.ts) as ultima
  from combinado c
  join perfiles p on p.id = c.usuario_id
  where auth.uid() is not null
    and c.usuario_id in (select usuario_id from visibles)
  group by c.usuario_id, p.nombre, c.bebida_tipo_id, c.bebida_nombre, c.bebida_icono
  order by (c.usuario_id = auth.uid()) desc, cantidad desc;
$function$;

-- Desglose de bebidas por jugador para /sala/[id]/registros: cuántas de
-- cada una (concreta del catálogo, o solo el tipo genérico), agregado en
-- Postgres. Solo bebida suelta (sala_id is not null), igual que el resto
-- de esta página — nunca una noche.
create or replace function public.desglose_bebidas_sala(p_sala uuid)
 returns table(
   usuario_id uuid,
   bebida_tipo_id integer,
   bebida_tipo_nombre text,
   bebida_tipo_icono text,
   bebida_catalogo_id uuid,
   bebida_catalogo_nombre text,
   rareza text,
   cantidad bigint
 )
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select
    r.usuario_id,
    bt.id as bebida_tipo_id,
    bt.nombre as bebida_tipo_nombre,
    bt.icono as bebida_tipo_icono,
    bc.id as bebida_catalogo_id,
    bc.nombre as bebida_catalogo_nombre,
    bc.rareza,
    count(*) as cantidad
  from registros r
  join bebidas_tipo bt on bt.id = r.bebida_tipo_id
  left join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  where r.sala_id = p_sala
    and es_miembro(p_sala)
  group by r.usuario_id, bt.id, bt.nombre, bt.icono, bc.id, bc.nombre, bc.rareza
  order by r.usuario_id, cantidad desc;
$function$;
