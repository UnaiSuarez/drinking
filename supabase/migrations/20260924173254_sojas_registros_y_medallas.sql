create table public.sojas_registros (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas(id) on delete cascade,
  noche_id uuid references public.noches(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  bebida text not null check (bebida in ('agua', 'refresco', 'cerveza_0', 'coctel_0', 'zumo')),
  ts timestamptz not null default now()
);

create index sojas_registros_usuario_idx on public.sojas_registros (usuario_id, ts desc);
create index sojas_registros_noche_idx on public.sojas_registros (noche_id, ts desc);

alter table public.sojas_registros enable row level security;
create policy sojas_registros_select on public.sojas_registros
  for select to authenticated using (usuario_id = (select auth.uid()));
revoke all on public.sojas_registros from anon, authenticated;
grant select on public.sojas_registros to authenticated;

insert into public.logros (slug, nombre, icono, descripcion, rareza, pl, repetible, secreto)
values
  ('sojas-i', 'SOJAS I', '💧', 'Registra 5 bebidas sin alcohol. La primera gota cuenta.', 'comun', 0, false, false),
  ('sojas-ii', 'SOJAS II', '💧', 'Registra 20 bebidas sin alcohol.', 'rara', 0, false, false),
  ('sojas-iii', 'SOJAS III', '💧', 'Registra 50 bebidas sin alcohol.', 'epica', 0, false, false),
  ('sojas-iv', 'SOJAS IV', '💧', 'Registra 100 bebidas sin alcohol. Hidratacion legendaria.', 'legendaria', 0, false, false)
on conflict (slug) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  rareza = excluded.rareza,
  pl = 0,
  repetible = false;

create or replace function public.registrar_soja(
  p_sala uuid,
  p_bebida text,
  p_noche uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_estado text;
  v_tipo text;
  v_total integer;
  v_registro public.sojas_registros;
  v_fase record;
  v_logros jsonb := '[]'::jsonb;
begin
  if v_usuario is null then
    raise exception 'No autenticado';
  end if;
  if p_bebida not in ('agua', 'refresco', 'cerveza_0', 'coctel_0', 'zumo') then
    raise exception 'Bebida sin alcohol no valida';
  end if;
  if not public.es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  if p_noche is not null then
    select n.estado into v_estado
    from public.noches n
    where n.id = p_noche and n.sala_id = p_sala
      and exists (
        select 1 from public.noche_jugadores nj
        where nj.noche_id = n.id and nj.usuario_id = v_usuario
      )
      and ((n.estado = 'activa' and n.fin_programado > now())
        or (n.estado = 'cerrando' and n.fin_gracia > now()));
    if not found then
      raise exception 'La noche no admite registros SOJAS';
    end if;
  else
    select coalesce(s.config->>'tipo', 'normal') into v_tipo
    from public.salas s where s.id = p_sala;
    if v_tipo <> 'permanente' then
      raise exception 'Sin noche solo se puede registrar en una sala permanente';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sojas:' || v_usuario::text, 0));

  insert into public.sojas_registros (sala_id, noche_id, usuario_id, bebida)
  values (p_sala, p_noche, v_usuario, p_bebida)
  returning * into v_registro;

  update public.perfiles set xp = xp + 2 where id = v_usuario;
  select count(*) into v_total from public.sojas_registros where usuario_id = v_usuario;

  for v_fase in
    select l.id, l.slug, f.umbral
    from (values ('sojas-i', 5), ('sojas-ii', 20), ('sojas-iii', 50), ('sojas-iv', 100)) as f(slug, umbral)
    join public.logros l on l.slug = f.slug
    where f.umbral <= v_total
  loop
    if not exists (
      select 1 from public.logros_usuario lu
      where lu.usuario_id = v_usuario and lu.logro_id = v_fase.id
    ) then
      insert into public.logros_usuario (usuario_id, logro_id)
      values (v_usuario, v_fase.id);
      v_logros := v_logros || jsonb_build_array(v_fase.slug);
    end if;
  end loop;

  return jsonb_build_object(
    'registro', to_jsonb(v_registro),
    'xp_ganada', 2,
    'pl_ganados', 0,
    'total', v_total,
    'logros_nuevos', v_logros
  );
end;
$$;

revoke all on function public.registrar_soja(uuid, text, uuid) from public, anon;
grant execute on function public.registrar_soja(uuid, text, uuid) to authenticated;
