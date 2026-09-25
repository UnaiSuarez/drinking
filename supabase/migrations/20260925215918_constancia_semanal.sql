-- Tres días con actividad durante la semana UTC: una bebida normal o una
-- SOJA bastan para marcar cada día. No importa la cantidad consumida.
create or replace function public.estado_retos_semana()
returns table(slug text, actual bigint, umbral integer, reclamado boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_semana date := date_trunc('week', now() at time zone 'UTC')::date;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  return query
  with base as (
    select 'prueba_algo_nuevo'::text as slug,
      (select count(distinct r.bebida_tipo_id)::bigint from public.registros r
       where r.usuario_id = v_uid and r.anulado = false and r.ts >= v_semana) as actual,
      3 as umbral
    union all
    select 'maraton_semanal',
      (select count(*)::bigint from public.registros r
       where r.usuario_id = v_uid and r.anulado = false and r.ts >= v_semana),
      10
    union all
    select 'sube_al_podio',
      (select count(*)::bigint from public.noche_jugadores nj
       join public.noches n on n.id = nj.noche_id
       where nj.usuario_id = v_uid and nj.posicion_final <= 3
         and n.estado = 'cerrada' and n.fin_real >= v_semana),
      1
    union all
    select 'constancia_semanal',
      (select count(*)::bigint from (
        select (r.ts at time zone 'UTC')::date as dia
        from public.registros r
        where r.usuario_id = v_uid and r.anulado = false
          and r.ts >= (v_semana::timestamp at time zone 'UTC')
          and r.ts < ((v_semana + 7)::timestamp at time zone 'UTC')
        union
        select (s.ts at time zone 'UTC')::date as dia
        from public.sojas_registros s
        where s.usuario_id = v_uid
          and s.ts >= (v_semana::timestamp at time zone 'UTC')
          and s.ts < ((v_semana + 7)::timestamp at time zone 'UTC')
      ) dias),
      3
  )
  select b.slug, b.actual, b.umbral,
    exists (
      select 1 from public.retos_reclamados rr
      where rr.usuario_id = v_uid and rr.reto_slug = b.slug and rr.semana = v_semana
    ) as reclamado
  from base b;
end;
$$;

create or replace function public.reclamar_reto(p_slug text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_semana date := date_trunc('week', now() at time zone 'UTC')::date;
  v_uid uuid := auth.uid();
  v_actual bigint;
  v_umbral integer;
  v_config jsonb;
  v_inventario jsonb;
  v_cofres jsonb;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select e.actual, e.umbral into v_actual, v_umbral
  from public.estado_retos_semana() e
  where e.slug = p_slug;
  if v_umbral is null then
    raise exception 'Reto no válido';
  end if;
  if v_actual < v_umbral then
    raise exception 'Todavía no has completado este reto';
  end if;

  select coalesce(p.avatar_config, '{}'::jsonb) into v_config
  from public.perfiles p where p.id = v_uid for update;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  insert into public.retos_reclamados (usuario_id, reto_slug, semana)
  values (v_uid, p_slug, v_semana)
  on conflict (usuario_id, reto_slug, semana) do nothing;
  if not found then
    raise exception 'Ya has reclamado este reto esta semana';
  end if;

  v_config := v_config || jsonb_build_object(
    'tienda', coalesce(v_config->'tienda', '{}'::jsonb)
      || jsonb_build_object('bonus', coalesce((v_config->'tienda'->>'bonus')::integer, 0) + 20)
  );
  if p_slug = 'constancia_semanal' then
    v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
    v_cofres := coalesce(v_inventario->'cofres', '{}'::jsonb);
    v_config := v_config || jsonb_build_object(
      'inventario', v_inventario || jsonb_build_object(
        'cofres', v_cofres || jsonb_build_object(
          'comun', coalesce((v_cofres->>'comun')::integer, 0) + 1
        )
      )
    );
  end if;

  update public.perfiles
  set xp = xp + 30, avatar_config = v_config
  where id = v_uid;
end;
$$;

revoke all on function public.estado_retos_semana() from public, anon;
revoke all on function public.reclamar_reto(text) from public, anon;
grant execute on function public.estado_retos_semana() to authenticated;
grant execute on function public.reclamar_reto(text) to authenticated;
