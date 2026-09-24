-- Sistema de amigos real (solicitudes, aceptar/rechazar), ahora que
-- perfiles.nombre es único (20260924215656). Un jugador busca a otro por
-- nombre, le envía una solicitud, y el otro la acepta o la rechaza.
--
-- Una sola fila por par de usuarios (orden canónico usuario_a < usuario_b,
-- comparando uuids) evita duplicados en cualquier dirección. `estado`
-- distingue una solicitud pendiente de una amistad ya aceptada;
-- `solicitado_por` dice quién la envió (para no dejar que el destinatario
-- se "auto-acepte" su propia solicitud, y para que el remitente vea "pendiente
-- de respuesta" en vez de un botón de aceptar).
--
-- No hay políticas de insert/update/delete: todas las mutaciones pasan por
-- las RPCs de abajo (security definer), igual que el resto de la app. Solo
-- hay política de lectura, y solo de las filas propias.
create table if not exists public.amistades (
  id uuid primary key default gen_random_uuid(),
  usuario_a uuid not null references public.perfiles(id) on delete cascade,
  usuario_b uuid not null references public.perfiles(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada')),
  solicitado_por uuid not null references public.perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  respondido_at timestamptz,
  constraint amistades_orden_canonico check (usuario_a < usuario_b),
  constraint amistades_par_unico unique (usuario_a, usuario_b)
);

alter table public.amistades enable row level security;

drop policy if exists amistades_select_propias on public.amistades;
create policy amistades_select_propias on public.amistades
  for select
  using (usuario_a = auth.uid() or usuario_b = auth.uid());

-- Busca perfiles por nombre (subcadena, sin distinguir mayúsculas), excluyendo
-- al propio usuario. Limitado a 10 resultados para no exponer todo el listado.
create or replace function public.buscar_usuarios_por_nombre(p_query text)
 returns table(id uuid, nombre text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select p.id, p.nombre
  from perfiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.nombre ilike '%' || trim(coalesce(p_query, '')) || '%'
    and length(trim(coalesce(p_query, ''))) >= 2
  order by p.nombre
  limit 10;
$function$;

-- Devuelve las amistades (aceptadas y pendientes, en ambas direcciones) del
-- usuario autenticado, ya con el "otro" usuario resuelto.
create or replace function public.mis_amigos()
 returns table(
   amigo_id uuid,
   nombre text,
   estado text,
   solicitado_por uuid,
   created_at timestamptz
 )
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select
    case when a.usuario_a = auth.uid() then a.usuario_b else a.usuario_a end as amigo_id,
    p.nombre,
    a.estado,
    a.solicitado_por,
    a.created_at
  from amistades a
  join perfiles p
    on p.id = case when a.usuario_a = auth.uid() then a.usuario_b else a.usuario_a end
  where auth.uid() is not null
    and auth.uid() in (a.usuario_a, a.usuario_b)
  order by a.created_at desc;
$function$;

create or replace function public.enviar_solicitud_amistad(p_destino_id uuid)
 returns amistades
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_a uuid;
  v_b uuid;
  v_fila public.amistades;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_destino_id is null or p_destino_id = auth.uid() then
    raise exception 'Destino no válido';
  end if;
  if not exists (select 1 from perfiles where id = p_destino_id) then
    raise exception 'Ese usuario no existe';
  end if;

  v_a := least(auth.uid(), p_destino_id);
  v_b := greatest(auth.uid(), p_destino_id);

  select * into v_fila from amistades where usuario_a = v_a and usuario_b = v_b;

  if found then
    if v_fila.estado = 'aceptada' then
      raise exception 'Ya sois amigos';
    elsif v_fila.solicitado_por = auth.uid() then
      raise exception 'Ya le has enviado una solicitud';
    else
      -- El destino ya te había enviado una solicitud: al "enviarle" tú una,
      -- se entiende como aceptarla, en vez de dejar dos pendientes cruzadas.
      update amistades set estado = 'aceptada', respondido_at = now()
      where id = v_fila.id
      returning * into v_fila;
      return v_fila;
    end if;
  end if;

  insert into amistades (usuario_a, usuario_b, estado, solicitado_por)
  values (v_a, v_b, 'pendiente', auth.uid())
  returning * into v_fila;

  return v_fila;
end;
$function$;

create or replace function public.responder_solicitud_amistad(p_solicitante_id uuid, p_aceptar boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_a uuid;
  v_b uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  v_a := least(auth.uid(), p_solicitante_id);
  v_b := greatest(auth.uid(), p_solicitante_id);

  if p_aceptar then
    update amistades
    set estado = 'aceptada', respondido_at = now()
    where usuario_a = v_a and usuario_b = v_b
      and estado = 'pendiente' and solicitado_por = p_solicitante_id;
    if not found then
      raise exception 'No hay ninguna solicitud pendiente de esa persona';
    end if;
  else
    delete from amistades
    where usuario_a = v_a and usuario_b = v_b
      and estado = 'pendiente' and solicitado_por = p_solicitante_id;
    if not found then
      raise exception 'No hay ninguna solicitud pendiente de esa persona';
    end if;
  end if;
end;
$function$;

-- Quita una amistad ya aceptada, o cancela una solicitud propia pendiente
-- (funciona en ambos sentidos, valga cual valga el estado actual).
create or replace function public.eliminar_amigo(p_otro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_a uuid;
  v_b uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  v_a := least(auth.uid(), p_otro_id);
  v_b := greatest(auth.uid(), p_otro_id);

  delete from amistades where usuario_a = v_a and usuario_b = v_b;
  if not found then
    raise exception 'No hay ninguna relación con esa persona';
  end if;
end;
$function$;
