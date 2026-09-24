create or replace function public.eliminar_mi_cuenta()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_sala uuid;
  v_noche uuid;
  v_relevo uuid;
begin
  if v_usuario is null then raise exception 'No autenticado'; end if;
  if not exists (select 1 from auth.users where id = v_usuario) then
    raise exception 'Cuenta no encontrada';
  end if;

  -- A sole member's room has nobody to inherit it. Remove its dependent
  -- records explicitly where older foreign keys do not cascade.
  for v_sala in
    select sm.sala_id from public.sala_miembros sm
    where sm.usuario_id = v_usuario
      and not exists (
        select 1 from public.sala_miembros otro
        where otro.sala_id = sm.sala_id and otro.usuario_id <> v_usuario
      )
  loop
    delete from public.noche_confirmaciones c using public.noches n
      where c.noche_id = n.id and n.sala_id = v_sala;
    delete from public.noche_penalizaciones p using public.noches n
      where p.noche_id = n.id and n.sala_id = v_sala;
    delete from public.notificaciones_pendientes where sala_id = v_sala;
    delete from public.salas where id = v_sala;
  end loop;

  -- Keep shared rooms and give the longest-standing remaining member the
  -- founder role. Night authorship must also point to an existing member.
  for v_sala in
    select sm.sala_id from public.sala_miembros sm
    where sm.usuario_id = v_usuario and sm.rol = 'fundador'
  loop
    select otro.usuario_id into v_relevo
    from public.sala_miembros otro
    where otro.sala_id = v_sala and otro.usuario_id <> v_usuario
    order by otro.joined_at, otro.usuario_id limit 1;
    if v_relevo is null then raise exception 'No hay relevo para la sala'; end if;
    update public.sala_miembros set rol = 'fundador'
      where sala_id = v_sala and usuario_id = v_relevo;
  end loop;

  for v_noche, v_sala in
    select n.id, n.sala_id from public.noches n where n.creada_por = v_usuario
  loop
    select otro.usuario_id into v_relevo
    from public.sala_miembros otro
    where otro.sala_id = v_sala and otro.usuario_id <> v_usuario
    order by otro.joined_at, otro.usuario_id limit 1;
    if v_relevo is null then raise exception 'No hay relevo para una noche'; end if;
    update public.noches set creada_por = v_relevo where id = v_noche;
  end loop;

  delete from public.noche_confirmaciones where usuario_id = v_usuario;
  delete from public.noche_penalizaciones
    where usuario_id = v_usuario or otorgada_por = v_usuario;
  delete from public.notificaciones_pendientes where usuario_id = v_usuario;
  delete from public.retos_reclamados where usuario_id = v_usuario;

  -- perfiles and the user's remaining participation cascade from auth.users.
  delete from auth.users where id = v_usuario;
end;
$$;

revoke all on function public.eliminar_mi_cuenta() from public, anon, authenticated;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
