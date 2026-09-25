-- Los cofres por nivel y medalla se entregan una sola vez, aunque la XP baje
-- y el jugador vuelva a alcanzar un nivel. El historial permite auditar y
-- recuperar cada recompensa sin depender del contador mutable del inventario.
create table public.recompensas_cofre (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  origen text not null check (origen in ('nivel', 'medalla')),
  referencia text not null,
  cofre_tipo text not null check (cofre_tipo in ('comun', 'epico', 'legendario')),
  otorgado_en timestamptz not null default now(),
  primary key (usuario_id, origen, referencia)
);

alter table public.recompensas_cofre enable row level security;
revoke all on public.recompensas_cofre from public, anon, authenticated;

create or replace function public.recompensar_niveles_xp()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nivel integer := 1;
  v_paso integer;
  v_tipo text;
  v_config jsonb := coalesce(new.avatar_config, '{}'::jsonb);
  v_inventario jsonb;
  v_cofres jsonb;
begin
  while round(100 * power((v_nivel + 1)::numeric, 1.4)) <= greatest(new.xp, 0) loop
    v_nivel := v_nivel + 1;
  end loop;

  v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
  v_cofres := coalesce(v_inventario->'cofres', '{}'::jsonb);
  for v_paso in 2..v_nivel loop
    v_tipo := case
      when v_paso % 10 = 0 then 'legendario'
      when v_paso % 5 = 0 then 'epico'
      else 'comun'
    end;
    insert into public.recompensas_cofre (usuario_id, origen, referencia, cofre_tipo)
    values (new.id, 'nivel', v_paso::text, v_tipo)
    on conflict do nothing;
    if found then
      v_cofres := jsonb_set(
        v_cofres,
        array[v_tipo],
        to_jsonb(coalesce((v_cofres->>v_tipo)::integer, 0) + 1),
        true
      );
    end if;
  end loop;

  new.avatar_config := v_config || jsonb_build_object(
    'inventario', v_inventario || jsonb_build_object('cofres', v_cofres)
  );
  return new;
end;
$$;

revoke all on function public.recompensar_niveles_xp() from public, anon, authenticated;
create trigger recompensar_niveles_xp
before update of xp on public.perfiles
for each row execute function public.recompensar_niveles_xp();

create or replace function public.otorgar_cofre_medalla(
  p_medalla_id uuid,
  p_usuario uuid,
  p_rareza text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_tipo text := case
    when p_rareza = 'legendaria' then 'legendario'
    when p_rareza in ('rara', 'epica') then 'epico'
    else 'comun'
  end;
begin
  insert into public.recompensas_cofre (usuario_id, origen, referencia, cofre_tipo)
  values (p_usuario, 'medalla', p_medalla_id::text, v_tipo)
  on conflict do nothing;
  if not found then
    return;
  end if;

  update public.perfiles p
  set avatar_config = jsonb_set(
    coalesce(p.avatar_config, '{}'::jsonb)
      || jsonb_build_object('inventario', coalesce(p.avatar_config->'inventario', '{}'::jsonb)),
    '{inventario,cofres}',
    coalesce(p.avatar_config->'inventario'->'cofres', '{}'::jsonb)
      || jsonb_build_object(
        v_tipo,
        coalesce((p.avatar_config->'inventario'->'cofres'->>v_tipo)::integer, 0) + 1
      ),
    true
  )
  where p.id = p_usuario;
end;
$$;

revoke all on function public.otorgar_cofre_medalla(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.recompensar_medalla()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_rareza text;
begin
  select rareza into v_rareza from public.logros where id = new.logro_id;
  perform public.otorgar_cofre_medalla(new.id, new.usuario_id, v_rareza);
  return new;
end;
$$;

revoke all on function public.recompensar_medalla() from public, anon, authenticated;
create trigger recompensar_medalla
after insert on public.logros_usuario
for each row execute function public.recompensar_medalla();

-- Recompensas retroactivas: nivel inicial 1 no da cofre; los niveles 2+
-- y cada medalla ya obtenida se entregan con la misma clave idempotente.
update public.perfiles set xp = xp;

do $$
declare
  v_medalla record;
begin
  for v_medalla in
    select lu.id, lu.usuario_id, l.rareza
    from public.logros_usuario lu
    join public.logros l on l.id = lu.logro_id
  loop
    perform public.otorgar_cofre_medalla(
      v_medalla.id, v_medalla.usuario_id, v_medalla.rareza
    );
  end loop;
end;
$$;
