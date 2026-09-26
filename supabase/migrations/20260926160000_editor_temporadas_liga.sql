-- Editor de temporadas de liga para admin/fundador de una sala permanente:
-- crear una nueva ya, editar nombre/fechas/premio de una existente, y
-- cerrarla manualmente antes de tiempo. finalizar_noche (que hasta ahora
-- era la única que creaba/cerraba temporadas, de forma automática al
-- cerrar una noche) sigue intacta y sin cambios: si no encuentra una
-- temporada activa vigente, crea la siguiente igual que siempre. Estas
-- RPCs solo dan control manual además de eso.

alter table public.temporadas add column if not exists premio text;

create or replace function public.crear_temporada_sala(
  p_sala uuid,
  p_nombre text,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_premio text default null
)
 returns temporadas
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol text;
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_temporada temporadas;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if v_nombre = '' or length(v_nombre) > 60 then
    raise exception 'Nombre no válido';
  end if;
  if p_fin <= p_inicio then
    raise exception 'La fecha de fin debe ser posterior al inicio';
  end if;

  select rol into v_rol from sala_miembros
  where sala_id = p_sala and usuario_id = auth.uid();
  if v_rol is null or v_rol not in ('admin', 'fundador') then
    raise exception 'No tienes permiso para gestionar temporadas de esta sala';
  end if;

  update temporadas set estado = 'cerrada' where sala_id = p_sala and estado = 'activa';

  insert into temporadas (sala_id, nombre, inicio, fin, estado, premio)
  values (p_sala, v_nombre, p_inicio, p_fin, 'activa', nullif(trim(coalesce(p_premio, '')), ''))
  returning * into v_temporada;

  return v_temporada;
end;
$function$;

revoke all on function public.crear_temporada_sala(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.crear_temporada_sala(uuid, text, timestamptz, timestamptz, text) to authenticated;

create or replace function public.actualizar_temporada(
  p_temporada_id uuid,
  p_nombre text default null,
  p_inicio timestamptz default null,
  p_fin timestamptz default null,
  p_premio text default null
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sala uuid;
  v_rol text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select sala_id into v_sala from temporadas where id = p_temporada_id;
  if v_sala is null then
    raise exception 'Temporada no encontrada';
  end if;

  select rol into v_rol from sala_miembros
  where sala_id = v_sala and usuario_id = auth.uid();
  if v_rol is null or v_rol not in ('admin', 'fundador') then
    raise exception 'No tienes permiso para gestionar temporadas de esta sala';
  end if;

  update temporadas set
    nombre = coalesce(nullif(trim(p_nombre), ''), nombre),
    inicio = coalesce(p_inicio, inicio),
    fin = coalesce(p_fin, fin),
    premio = case when p_premio is not null then nullif(trim(p_premio), '') else premio end
  where id = p_temporada_id;

  if (select fin from temporadas where id = p_temporada_id) <= (select inicio from temporadas where id = p_temporada_id) then
    raise exception 'La fecha de fin debe ser posterior al inicio';
  end if;
end;
$function$;

revoke all on function public.actualizar_temporada(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.actualizar_temporada(uuid, text, timestamptz, timestamptz, text) to authenticated;

create or replace function public.cerrar_temporada_manual(p_temporada_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sala uuid;
  v_rol text;
  v_estado text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select sala_id, estado into v_sala, v_estado from temporadas where id = p_temporada_id;
  if v_sala is null then
    raise exception 'Temporada no encontrada';
  end if;
  if v_estado <> 'activa' then
    raise exception 'Esa temporada ya no está activa';
  end if;

  select rol into v_rol from sala_miembros
  where sala_id = v_sala and usuario_id = auth.uid();
  if v_rol is null or v_rol not in ('admin', 'fundador') then
    raise exception 'No tienes permiso para gestionar temporadas de esta sala';
  end if;

  update temporadas set estado = 'cerrada', fin = least(fin, now()) where id = p_temporada_id;
end;
$function$;

revoke all on function public.cerrar_temporada_manual(uuid) from public, anon;
grant execute on function public.cerrar_temporada_manual(uuid) to authenticated;
