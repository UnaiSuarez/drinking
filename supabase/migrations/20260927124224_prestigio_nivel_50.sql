-- Aplicada en Supabase: 20260927124224. No reinicia cuentas automaticamente.
-- Historial inmutable: el ciclo no depende de campos editables del avatar.
create table public.prestigios (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  ciclo integer not null check (ciclo > 0),
  xp_anterior integer not null check (xp_anterior >= 0),
  marco text,
  creado_en timestamptz not null default now(),
  primary key (usuario_id, ciclo)
);
alter table public.prestigios enable row level security;
revoke all on public.prestigios from public, anon, authenticated;
grant select (usuario_id, ciclo, marco, creado_en) on public.prestigios to authenticated;
create policy prestigios_lectura on public.prestigios for select to authenticated using (true);

create or replace function public.recompensar_niveles_xp()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nivel integer := 1;
  v_ciclo integer;
  v_paso integer;
  v_tipo text;
  v_marco text;
  v_config jsonb := coalesce(new.avatar_config, '{}'::jsonb);
  v_inventario jsonb;
  v_cofres jsonb;
  v_tienda jsonb;
  v_marcos jsonb;
begin
  select coalesce(max(ciclo), 0) into v_ciclo from public.prestigios where usuario_id = new.id;
  while round(100 * power((v_nivel + 1)::numeric, 1.4)) <= greatest(new.xp, 0) loop
    v_nivel := v_nivel + 1;
  end loop;
  v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
  v_cofres := coalesce(v_inventario->'cofres', '{}'::jsonb);
  v_tienda := coalesce(v_config->'tienda', '{}'::jsonb);
  v_marcos := coalesce(v_tienda->'marcos', '[]'::jsonb);
  for v_paso in 2..v_nivel loop
    v_tipo := case when v_paso % 10 = 0 then 'legendario' when v_paso % 5 = 0 then 'epico' else 'comun' end;
    insert into public.recompensas_cofre(usuario_id, origen, referencia, cofre_tipo)
    values (new.id, 'nivel', case when v_ciclo = 0 then v_paso::text else 'p' || v_ciclo || ':' || v_paso end, v_tipo)
    on conflict do nothing;
    if found then
      v_cofres := jsonb_set(v_cofres, array[v_tipo], to_jsonb(coalesce((v_cofres->>v_tipo)::integer, 0) + 1), true);
    end if;
    v_marco := case v_paso when 10 then 'plata' when 20 then 'cosmico' when 30 then 'hielo' when 40 then 'aureola' when 50 then 'neon' else null end;
    if v_marco is not null and not (v_marcos ? v_marco) then
      v_marcos := v_marcos || to_jsonb(v_marco);
    end if;
  end loop;
  new.avatar_config := v_config || jsonb_build_object(
    'inventario', v_inventario || jsonb_build_object('cofres', v_cofres),
    'tienda', v_tienda || jsonb_build_object('marcos', v_marcos)
  );
  return new;
end;
$$;
revoke all on function public.recompensar_niveles_xp() from public, anon, authenticated;

create function public.ascender_prestigio(p_ciclo_actual integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles%rowtype;
  v_ciclo integer;
  v_marco text;
  v_tienda jsonb;
  v_marcos jsonb;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  -- Mismo bloqueo de fila que las escrituras de XP: dos solicitudes no
  -- pueden reiniciar ni conceder dos veces un mismo ciclo.
  select * into v_perfil from public.perfiles where id = v_uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  select coalesce(max(ciclo), 0) into v_ciclo from public.prestigios where usuario_id = v_uid;
  if p_ciclo_actual is null or p_ciclo_actual <> v_ciclo then
    raise exception 'Tu prestigio ha cambiado. Actualiza la pagina.';
  end if;
  if coalesce(v_perfil.xp, 0) < round(100 * power(50::numeric, 1.4)) then
    raise exception 'Necesitas alcanzar el nivel 50';
  end if;
  if exists (select 1 from public.noche_jugadores j join public.noches n on n.id = j.noche_id
    where j.usuario_id = v_uid and n.estado <> 'cerrada') then
    raise exception 'Termina tus noches pendientes antes de hacer prestigio';
  end if;
  -- Liquida recompensas del ciclo anterior antes de cambiar de ciclo.
  update public.perfiles set xp = xp where id = v_uid returning * into v_perfil;
  v_ciclo := v_ciclo + 1;
  v_marco := case v_ciclo when 1 then 'disco' when 2 then 'reliquia' when 3 then 'prisma' when 4 then 'trono' when 5 then 'llamas' else null end;
  v_tienda := coalesce(v_perfil.avatar_config->'tienda', '{}'::jsonb);
  v_marcos := coalesce(v_tienda->'marcos', '[]'::jsonb);
  if v_marco is not null and not (v_marcos ? v_marco) then v_marcos := v_marcos || to_jsonb(v_marco); end if;
  -- Las chapas base dependen de floor(xp/50); trasladarlas al bonus
  -- conserva exactamente el saldo al reiniciar, sin volver a gastarlas.
  v_tienda := v_tienda || jsonb_build_object('marcos', v_marcos,
    'bonus', coalesce((v_tienda->>'bonus')::integer, 0) + floor(v_perfil.xp::numeric / 50)::integer);
  insert into public.prestigios(usuario_id, ciclo, xp_anterior, marco) values(v_uid, v_ciclo, v_perfil.xp, v_marco);
  update public.perfiles set xp = 0,
    avatar_config = coalesce(v_perfil.avatar_config, '{}'::jsonb) || jsonb_build_object('tienda', v_tienda)
    where id = v_uid;
  return jsonb_build_object('ciclo', v_ciclo, 'marco', v_marco);
end;
$$;
revoke all on function public.ascender_prestigio(integer) from public, anon;
grant execute on function public.ascender_prestigio(integer) to authenticated;
