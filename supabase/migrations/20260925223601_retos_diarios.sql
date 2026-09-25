-- El día se calcula en Madrid, incluyendo los cambios de horario de verano.
-- La visita y la reclamación comparten una clave única para impedir duplicados.
create table public.retos_diarios (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  visita_at timestamptz not null default now(),
  reclamado_at timestamptz,
  primary key (usuario_id, dia)
);

alter table public.retos_diarios enable row level security;
revoke all on public.retos_diarios from public, anon, authenticated;
grant select on public.retos_diarios to authenticated;
create policy "Ver mis retos diarios" on public.retos_diarios
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create function public.registrar_visita_diaria()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  insert into public.retos_diarios (usuario_id, dia)
  values (v_uid, (now() at time zone 'Europe/Madrid')::date)
  on conflict (usuario_id, dia) do nothing;
end;
$$;

create function public.estado_reto_diario()
returns table(dia date, visita boolean, actividad boolean, reclamado boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_dia date := (now() at time zone 'Europe/Madrid')::date;
  v_inicio timestamptz := (v_dia::timestamp at time zone 'Europe/Madrid');
  v_fin timestamptz := ((v_dia + 1)::timestamp at time zone 'Europe/Madrid');
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  return query
  select v_dia,
    exists (
      select 1 from public.retos_diarios d
      where d.usuario_id = v_uid and d.dia = v_dia
    ),
    exists (
      select 1 from public.registros r
      where r.usuario_id = v_uid and r.anulado = false
        and r.ts >= v_inicio and r.ts < v_fin
    ) or exists (
      select 1 from public.sojas_registros s
      where s.usuario_id = v_uid
        and s.ts >= v_inicio and s.ts < v_fin
    ),
    exists (
      select 1 from public.retos_diarios d
      where d.usuario_id = v_uid and d.dia = v_dia
        and d.reclamado_at is not null
    );
end;
$$;

create function public.reclamar_reto_diario()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_dia date := (now() at time zone 'Europe/Madrid')::date;
  v_estado record;
  v_config jsonb;
  v_inventario jsonb;
  v_cofres jsonb;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select coalesce(p.avatar_config, '{}'::jsonb) into v_config
  from public.perfiles p where p.id = v_uid for update;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  select * into v_estado from public.estado_reto_diario();
  if not v_estado.visita or not v_estado.actividad then
    raise exception 'Completa los dos pasos antes de reclamar';
  end if;

  update public.retos_diarios
  set reclamado_at = now()
  where usuario_id = v_uid and dia = v_dia and reclamado_at is null;
  if not found then
    raise exception 'Cofre diario ya reclamado';
  end if;

  v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
  v_cofres := coalesce(v_inventario->'cofres', '{}'::jsonb);
  v_config := v_config || jsonb_build_object(
    'inventario', v_inventario || jsonb_build_object(
      'cofres', v_cofres || jsonb_build_object(
        'comun', coalesce((v_cofres->>'comun')::integer, 0) + 1
      )
    )
  );
  update public.perfiles set avatar_config = v_config where id = v_uid;
end;
$$;

revoke all on function public.registrar_visita_diaria() from public, anon;
revoke all on function public.estado_reto_diario() from public, anon;
revoke all on function public.reclamar_reto_diario() from public, anon;
grant execute on function public.registrar_visita_diaria() to authenticated;
grant execute on function public.estado_reto_diario() to authenticated;
grant execute on function public.reclamar_reto_diario() to authenticated;
