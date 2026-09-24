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
    select r.noche_id, coalesce(r.sala_id, n.sala_id) as sala_id,
      r.bebida_tipo_id, r.bebida_catalogo_id, r.ts
    from public.registros r
    left join public.noches n on n.id = r.noche_id
    where r.usuario_id = p_usuario and r.anulado = false
      and (r.noche_id is null or n.estado = 'cerrada')
      and (p_sala is null or coalesce(r.sala_id, n.sala_id) = p_sala)
  ), sojas as materialized (
    select s.sala_id, s.ts from public.sojas_registros s
    where s.usuario_id = p_usuario and (p_sala is null or s.sala_id = p_sala)
  ), bebidas_noche as (
    select noche_id, count(*) as total from bebidas
    where noche_id is not null group by noche_id
  ), meses as (
    select to_char(p.inicio at time zone 'Europe/Madrid', 'YYYY-MM') as mes,
      count(*) as noches,
      count(*) filter (where p.posicion_final = 1) as victorias,
      count(*) filter (where p.posicion_final between 1 and 3) as podios,
      coalesce(sum(p.pl_ganados), 0) as pl,
      coalesce(sum(b.total), 0) as bebidas
    from partidas p left join bebidas_noche b on b.noche_id = p.noche_id
    group by 1
  ), tipos as (
    select coalesce(bt.nombre, bc.nombre, 'Otra') as nombre, count(*) as total
    from bebidas b
    left join public.bebidas_tipo bt on bt.id = b.bebida_tipo_id
    left join public.bebidas_catalogo bc on bc.id = b.bebida_catalogo_id
    group by 1
  ), dias as (
    select extract(isodow from b.ts at time zone 'Europe/Madrid')::int as dia, count(*) as total
    from bebidas b group by 1
  ), horas as (
    select extract(hour from b.ts at time zone 'Europe/Madrid')::int as hora, count(*) as total
    from bebidas b group by 1
  ), salas_visibles as (
    select s.id, s.nombre, s.archivada_at
    from public.sala_miembros sm
    join public.salas s on s.id = sm.sala_id
    where sm.usuario_id = p_usuario and (p_sala is null or s.id = p_sala)
      and exists (select 1 from public.sala_miembros propia where propia.sala_id = s.id and propia.usuario_id = auth.uid())
  )
  select jsonb_build_object(
    'noches', (select count(*) from partidas),
    'victorias', (select count(*) from partidas where posicion_final = 1),
    'podios', (select count(*) from partidas where posicion_final between 1 and 3),
    'pl', (select coalesce(sum(pl_ganados), 0) from partidas),
    'bebidasNoche', (select count(*) from bebidas where noche_id is not null),
    'bebidasSueltas', (select count(*) from bebidas where noche_id is null),
    'sojas', (select count(*) from sojas),
    'salas', (select count(*) from public.sala_miembros sm where sm.usuario_id = p_usuario and (p_sala is null or sm.sala_id = p_sala)),
    'record', (select coalesce(max(total), 0) from bebidas_noche),
    'primeraNoche', (select min(inicio) from partidas),
    'ultimaNoche', (select max(inicio) from partidas),
    'medallas', (select count(*) from public.logros_usuario lu where lu.usuario_id = p_usuario and (p_sala is null or lu.sala_id = p_sala)),
    'meses', (select coalesce(jsonb_agg(jsonb_build_object('mes', mes, 'noches', noches, 'victorias', victorias, 'podios', podios, 'pl', pl, 'bebidas', bebidas) order by mes), '[]'::jsonb) from meses),
    'tipos', (select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'total', total) order by total desc, nombre), '[]'::jsonb) from tipos),
    'dias', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'total', coalesce(a.total, 0)) order by d.dia), '[]'::jsonb) from generate_series(1, 7) d(dia) left join dias a on a.dia = d.dia),
    'horas', (select coalesce(jsonb_agg(jsonb_build_object('hora', h.hora, 'total', coalesce(a.total, 0)) order by h.hora), '[]'::jsonb) from generate_series(0, 23) h(hora) left join horas a on a.hora = h.hora),
    'salasDetalle', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'nombre', s.nombre, 'archivada', s.archivada_at is not null,
      'noches', (select count(*) from partidas p where p.sala_id = s.id),
      'victorias', (select count(*) from partidas p where p.sala_id = s.id and p.posicion_final = 1),
      'podios', (select count(*) from partidas p where p.sala_id = s.id and p.posicion_final between 1 and 3),
      'pl', (select coalesce(sum(p.pl_ganados), 0) from partidas p where p.sala_id = s.id),
      'bebidasNoche', (select count(*) from bebidas b where b.sala_id = s.id and b.noche_id is not null),
      'bebidasSueltas', (select count(*) from bebidas b where b.sala_id = s.id and b.noche_id is null),
      'sojas', (select count(*) from sojas x where x.sala_id = s.id)
    ) order by s.nombre), '[]'::jsonb) from salas_visibles s),
    'ultimasNoches', (select coalesce(jsonb_agg(jsonb_build_object(
      'fecha', u.inicio, 'sala', u.nombre, 'posicion', u.posicion_final,
      'pl', u.pl_ganados, 'bebidas', u.bebidas
    ) order by u.inicio desc), '[]'::jsonb) from (
      select p.inicio, s.nombre, p.posicion_final, p.pl_ganados, coalesce(b.total, 0) as bebidas
      from partidas p join salas_visibles s on s.id = p.sala_id
      left join bebidas_noche b on b.noche_id = p.noche_id
      order by p.inicio desc limit 12
    ) u)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.estadisticas_perfil(uuid, uuid) from public, anon;
grant execute on function public.estadisticas_perfil(uuid, uuid) to authenticated;
