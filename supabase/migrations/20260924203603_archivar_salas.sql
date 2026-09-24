alter table public.salas add column archivada_at timestamptz;
create index salas_archivadas_idx on public.salas (archivada_at) where archivada_at is not null;

create or replace function public.archivar_sala(p_sala uuid)
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
  ) then
    raise exception 'Solo el fundador puede archivar la sala';
  end if;
  if exists (
    select 1 from public.noches
    where sala_id = p_sala and estado in ('pendiente', 'activa', 'cerrando')
  ) then
    raise exception 'Cierra la noche en curso antes de archivar la sala';
  end if;
  update public.salas set archivada_at = now() where id = p_sala and archivada_at is null;
end;
$$;

create or replace function public.restaurar_sala(p_sala uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (
    select 1 from public.sala_miembros
    where sala_id = p_sala and usuario_id = auth.uid() and rol = 'fundador'
  ) then
    raise exception 'Solo el fundador puede restaurar la sala';
  end if;
  update public.salas set archivada_at = null where id = p_sala;
  if not found then raise exception 'Sala no encontrada'; end if;
end;
$$;

create or replace function public.unirse_sala(p_codigo text)
returns public.salas language plpgsql security definer set search_path = ''
as $$
declare
  v_sala public.salas;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into v_sala from public.salas
  where codigo = upper(trim(p_codigo)) and archivada_at is null;
  if not found then raise exception 'Código no válido'; end if;
  insert into public.sala_miembros (sala_id, usuario_id, rol)
  values (v_sala.id, auth.uid(), 'miembro')
  on conflict do nothing;
  return v_sala;
end;
$$;

revoke all on function public.archivar_sala(uuid) from public, anon;
revoke all on function public.restaurar_sala(uuid) from public, anon;
grant execute on function public.archivar_sala(uuid) to authenticated;
grant execute on function public.restaurar_sala(uuid) to authenticated;

create or replace function public.rechazar_escritura_sala_archivada()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_sala uuid := new.sala_id;
  v_archivada timestamptz;
begin
  if v_sala is null and tg_table_name = 'registros' and new.noche_id is not null then
    select sala_id into v_sala from public.noches where id = new.noche_id;
  end if;
  if v_sala is null then return new; end if;
  select archivada_at into v_archivada from public.salas where id = v_sala for share;
  if v_archivada is not null then
    raise exception 'Esta sala está archivada';
  end if;
  return new;
end;
$$;

create trigger no_noches_en_sala_archivada before insert on public.noches
  for each row execute function public.rechazar_escritura_sala_archivada();
create trigger no_registros_en_sala_archivada before insert on public.registros
  for each row execute function public.rechazar_escritura_sala_archivada();
create trigger no_sojas_en_sala_archivada before insert on public.sojas_registros
  for each row execute function public.rechazar_escritura_sala_archivada();
create trigger no_miembros_en_sala_archivada before insert on public.sala_miembros
  for each row execute function public.rechazar_escritura_sala_archivada();
revoke all on function public.rechazar_escritura_sala_archivada() from public, anon, authenticated;
