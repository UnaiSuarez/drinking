-- Public aggregate for authenticated profiles. Room breakdown requires shared membership.
create or replace function public.estadisticas_perfil(p_usuario uuid, p_sala uuid default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (select 1 from public.perfiles where id = p_usuario) then
    raise exception 'Perfil no encontrado';
  end if;
  if p_sala is not null and not (
    exists (select 1 from public.sala_miembros where sala_id = p_sala and usuario_id = auth.uid())
    and exists (select 1 from public.sala_miembros where sala_id = p_sala and usuario_id = p_usuario)
  ) then
    raise exception 'No tienes acceso a esta sala';
  end if;

  with partidas as materialized (
    select nj.noche_id, nj.posicion_final, nj.pl_ganados, n.inicio, n.sala_id
    from public.noche_jugadores nj
    join public.noches n on n.id = nj.noche_id
    where nj.usuario_id = p_usuario and n.estado = 'cerrada'
      and (p_sala is null or n.sala_id = p_sala)
  ), bebidas as materialized (
    select r.noche_id, r.bebida_tipo_id, r.bebida_catalogo_id
    from public.registros r
    left join public.noches n on n.id = r.noche_id
    where r.usuario_id = p_usuario and r.anulado = false
      and (r.noche_id is null or n.estado = 'cerrada')
      and (p_sala is null or coalesce(r.sala_id, n.sala_id) = p_sala)
  ), bebidas_noche as (
    select noche_id, count(*) as total from bebidas
    where noche_id is not null group by noche_id
  ), meses as (
    select to_char(p.inicio at time zone 'Europe/Madrid', 'YYYY-MM') as mes,
      count(*) as noches,
      count(*) filter (where p.posicion_final = 1) as victorias,
      coalesce(sum(b.total), 0) as bebidas
    from partidas p left join bebidas_noche b on b.noche_id = p.noche_id
    group by 1
  ), tipos as (
    select coalesce(bt.nombre, bc.nombre, 'Otra') as nombre, count(*) as total
    from bebidas b
    left join public.bebidas_tipo bt on bt.id = b.bebida_tipo_id
    left join public.bebidas_catalogo bc on bc.id = b.bebida_catalogo_id
    group by 1
  )
  select jsonb_build_object(
    'noches', (select count(*) from partidas),
    'victorias', (select count(*) from partidas where posicion_final = 1),
    'podios', (select count(*) from partidas where posicion_final between 1 and 3),
    'pl', (select coalesce(sum(pl_ganados), 0) from partidas),
    'bebidasNoche', (select count(*) from bebidas where noche_id is not null),
    'bebidasSueltas', (select count(*) from bebidas where noche_id is null),
    'sojas', (select count(*) from public.sojas_registros s where s.usuario_id = p_usuario and (p_sala is null or s.sala_id = p_sala)),
    'salas', (select count(*) from public.sala_miembros sm where sm.usuario_id = p_usuario and (p_sala is null or sm.sala_id = p_sala)),
    'record', (select coalesce(max(total), 0) from bebidas_noche),
    'primeraNoche', (select min(inicio) from partidas),
    'ultimaNoche', (select max(inicio) from partidas),
    'meses', (select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'noches', noches, 'victorias', victorias, 'bebidas', bebidas) order by mes), '[]'::jsonb) from meses),
    'tipos', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'total', total) order by total desc, nombre), '[]'::jsonb) from tipos)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.estadisticas_perfil(uuid, uuid) from public, anon;
grant execute on function public.estadisticas_perfil(uuid, uuid) to authenticated;

-- Irreversible room removal, separate from the reversible archive action.
create or replace function public.eliminar_sala_definitivamente(p_sala uuid, p_nombre text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_sala public.salas;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into v_sala from public.salas where id = p_sala for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if not exists (
    select 1 from public.sala_miembros
    where sala_id = p_sala and usuario_id = auth.uid() and rol = 'fundador'
  ) then raise exception 'Solo el fundador puede eliminar la sala'; end if;
  if v_sala.archivada_at is null then raise exception 'Archiva la sala antes de eliminarla'; end if;
  if p_nombre is distinct from v_sala.nombre then raise exception 'El nombre de confirmación no coincide'; end if;
  if exists (select 1 from public.noches where sala_id = p_sala and estado <> 'cerrada') then
    raise exception 'Hay una noche sin cerrar';
  end if;

  delete from public.noche_confirmaciones c using public.noches n
    where c.noche_id = n.id and n.sala_id = p_sala;
  delete from public.noche_penalizaciones p using public.noches n
    where p.noche_id = n.id and n.sala_id = p_sala;
  delete from public.notificaciones_pendientes where sala_id = p_sala;
  delete from public.salas where id = p_sala;
end;
$$;

revoke all on function public.eliminar_sala_definitivamente(uuid, text) from public, anon;
grant execute on function public.eliminar_sala_definitivamente(uuid, text) to authenticated;
