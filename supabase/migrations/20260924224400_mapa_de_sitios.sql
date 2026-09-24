-- Mapa de sitios: marcar dónde bebes (solo sala permanente, nunca en una
-- noche) y verlo luego en un mapa de perfil junto con los de tus amigos.
--
-- `sitios` es un catálogo compartido, igual que bebidas_catalogo: la
-- ubicación de un sitio es infraestructura compartida (para no duplicar
-- "Bar Pepe" cada vez que alguien lo marca). Lo que SÍ es privado es quién
-- ha bebido ahí: eso se calcula agregando `registros` filtrado a uno mismo
-- y a los amigos aceptados, no hace falta una tabla de "visitas" aparte.
--
-- `registros.sitio_id` solo se puede rellenar en registros de sala
-- permanente (`sala_id is not null`; los de una noche solo tienen
-- `noche_id`, nunca `sala_id`, ver registrar_bebida_suelta) — así queda
-- forzado en la propia RPC que no se pueda marcar sitio durante una noche.

create table if not exists public.sitios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  lat double precision not null,
  lng double precision not null,
  creado_por uuid references public.perfiles(id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table public.sitios enable row level security;

drop policy if exists sitios_select_autenticados on public.sitios;
create policy sitios_select_autenticados on public.sitios
  for select
  using (auth.uid() is not null);

alter table public.registros add column if not exists sitio_id uuid references public.sitios(id) on delete set null;

-- Sitios cercanos a un punto, para el selector al registrar una bebida.
-- Haversine (esfera de 6371 km); no hace falta PostGIS a esta escala de
-- datos. Limitado a los 5 más cercanos dentro del radio pedido.
create or replace function public.sitios_cercanos(p_lat double precision, p_lng double precision, p_radio_metros double precision default 150)
 returns table(id uuid, nombre text, distancia_m double precision)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select s.id, s.nombre, d.distancia_m
  from sitios s
  cross join lateral (
    select 2 * 6371000 * asin(sqrt(
      power(sin(radians(s.lat - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(s.lat)) * power(sin(radians(s.lng - p_lng) / 2), 2)
    )) as distancia_m
  ) d
  where auth.uid() is not null
    and d.distancia_m <= p_radio_metros
  order by d.distancia_m
  limit 5;
$function$;

create or replace function public.crear_sitio(p_nombre text, p_lat double precision, p_lng double precision)
 returns sitios
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_nombre text;
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

  insert into sitios (nombre, lat, lng, creado_por)
  values (v_nombre, p_lat, p_lng, auth.uid())
  returning * into v_fila;

  return v_fila;
end;
$function$;

-- Marca el sitio de un registro ya existente (de sala permanente: el
-- registro tiene que tener sala_id, nunca noche_id — así queda excluida
-- cualquier bebida de una noche).
create or replace function public.marcar_sitio_de_registro(p_registro_id uuid, p_sitio_id uuid)
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

  update registros
  set sitio_id = p_sitio_id
  where id = p_registro_id
    and usuario_id = auth.uid()
    and sala_id is not null
    and anulado = false;

  if not found then
    raise exception 'Ese registro no se puede marcar (no es tuyo, no es de sala permanente, o está anulado)';
  end if;
end;
$function$;

-- Sitios para el mapa de perfil: los tuyos, los de tus amigos aceptados, o
-- ambos (marcados por ti y por al menos un amigo).
create or replace function public.mis_sitios_mapa()
 returns table(sitio_id uuid, nombre text, lat double precision, lng double precision, tipo text)
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
    end as tipo
  from marcas m
  join sitios s on s.id = m.sitio_id
  where auth.uid() is not null
  group by s.id, s.nombre, s.lat, s.lng;
$function$;

-- Ficha de un sitio: desglose de bebidas por persona (solo tú y tus amigos
-- aceptados, nunca desconocidos aunque hayan marcado el mismo sitio).
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
  )
  select
    r.usuario_id,
    p.nombre,
    bt.id as bebida_tipo_id,
    bt.nombre as bebida_nombre,
    bt.icono as bebida_icono,
    count(*) as cantidad,
    max(r.ts) as ultima
  from registros r
  join perfiles p on p.id = r.usuario_id
  join bebidas_tipo bt on bt.id = r.bebida_tipo_id
  where auth.uid() is not null
    and r.sitio_id = p_sitio_id
    and r.anulado = false
    and r.usuario_id in (select usuario_id from visibles)
  group by r.usuario_id, p.nombre, bt.id, bt.nombre, bt.icono
  order by (r.usuario_id = auth.uid()) desc, cantidad desc;
$function$;
