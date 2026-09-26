-- Amplía avisos_push_verificados (20260924120200) con dos avisos nuevos,
-- mismo patrón: el navegador solo dice qué fila reclama, el servidor
-- comprueba el hecho y lo reclama una sola vez en avisos_push.
--
-- 1) Bebida (o SOJA) suelta añadida en una sala: avisa al resto de la sala.
-- 2) Solicitud de amistad enviada: avisa solo al destinatario. Para esto
--    hace falta poder consultar las suscripciones de una sola persona (las
--    push existentes solo consultaban "toda la sala").

alter table public.avisos_push drop constraint if exists avisos_push_tipo_check;
alter table public.avisos_push add constraint avisos_push_tipo_check
  check (tipo in ('logro', 'noche_activada', 'bebida', 'amistad'));

create or replace function public.suscripciones_de_usuario(p_usuario uuid)
 returns table(usuario_id uuid, endpoint text, p256dh text, auth text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select usuario_id, endpoint, p256dh, auth
  from push_subscriptions
  where usuario_id = p_usuario;
$function$;

revoke all on function public.suscripciones_de_usuario(uuid) from public, anon;
grant execute on function public.suscripciones_de_usuario(uuid) to authenticated;

-- ===== Bebida suelta añadida =====
-- Hecho comprobado: el registro es del que llama, es una bebida suelta de
-- sala (no de noche) y se hizo hace menos de 2 minutos. Se reclama una sola
-- vez por registro.
create or replace function public.reclamar_aviso_bebida(p_registro_id uuid)
 returns table(
   aviso_sala_id uuid,
   aviso_sala_nombre text,
   aviso_usuario_nombre text,
   aviso_bebida_nombre text,
   aviso_bebida_icono text
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_reclamados integer;
  v_sala uuid;
  v_tipo_id integer;
  v_catalogo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select r.sala_id, r.bebida_tipo_id, r.bebida_catalogo_id
    into v_sala, v_tipo_id, v_catalogo_id
  from registros r
  where r.id = p_registro_id
    and r.usuario_id = auth.uid()
    and r.sala_id is not null
    and r.anulado = false
    and r.ts > now() - interval '2 minutes';

  if v_sala is null then
    return;
  end if;

  insert into avisos_push (clave, tipo, usuario_id, sala_id)
  values ('bebida:' || p_registro_id::text, 'bebida', auth.uid(), v_sala)
  on conflict (clave) do nothing;
  get diagnostics v_reclamados = row_count;
  if v_reclamados = 0 then
    return;
  end if;

  return query
  select
    v_sala,
    s.nombre,
    coalesce(pf.nombre, 'Alguien'),
    coalesce(bc.nombre, bt.nombre),
    bt.icono
  from salas s
  left join perfiles pf on pf.id = auth.uid()
  left join bebidas_tipo bt on bt.id = v_tipo_id
  left join bebidas_catalogo bc on bc.id = v_catalogo_id
  where s.id = v_sala;
end;
$function$;

-- Misma idea para una SOJA suelta (sojas_registros no tiene "anulado").
create or replace function public.reclamar_aviso_soja(p_registro_id uuid)
 returns table(
   aviso_sala_id uuid,
   aviso_sala_nombre text,
   aviso_usuario_nombre text,
   aviso_bebida_nombre text
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_reclamados integer;
  v_sala uuid;
  v_bebida text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select sr.sala_id, sr.bebida into v_sala, v_bebida
  from sojas_registros sr
  where sr.id = p_registro_id
    and sr.usuario_id = auth.uid()
    and sr.noche_id is null
    and sr.ts > now() - interval '2 minutes';

  if v_sala is null then
    return;
  end if;

  insert into avisos_push (clave, tipo, usuario_id, sala_id)
  values ('bebida:soja:' || p_registro_id::text, 'bebida', auth.uid(), v_sala)
  on conflict (clave) do nothing;
  get diagnostics v_reclamados = row_count;
  if v_reclamados = 0 then
    return;
  end if;

  return query
  select v_sala, s.nombre, coalesce(pf.nombre, 'Alguien'), v_bebida
  from salas s
  left join perfiles pf on pf.id = auth.uid()
  where s.id = v_sala;
end;
$function$;

-- ===== Solicitud de amistad =====
-- Hecho comprobado: la amistad la envió quien llama, sigue pendiente y se
-- creó hace menos de 2 minutos. Se reclama una sola vez por amistad.
create or replace function public.reclamar_aviso_amistad(p_amistad_id uuid)
 returns table(
   aviso_destinatario_id uuid,
   aviso_solicitante_nombre text
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_reclamados integer;
  v_a uuid;
  v_b uuid;
  v_destinatario uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select usuario_a, usuario_b into v_a, v_b
  from amistades
  where id = p_amistad_id
    and solicitado_por = auth.uid()
    and estado = 'pendiente'
    and created_at > now() - interval '2 minutes';

  if v_a is null then
    return;
  end if;
  v_destinatario := case when v_a = auth.uid() then v_b else v_a end;

  insert into avisos_push (clave, tipo, usuario_id, sala_id)
  values ('amistad:' || p_amistad_id::text, 'amistad', auth.uid(), null)
  on conflict (clave) do nothing;
  get diagnostics v_reclamados = row_count;
  if v_reclamados = 0 then
    return;
  end if;

  return query
  select v_destinatario, coalesce(pf.nombre, 'Alguien')
  from perfiles pf where pf.id = auth.uid();
end;
$function$;

revoke all on function public.reclamar_aviso_bebida(uuid) from public, anon;
revoke all on function public.reclamar_aviso_soja(uuid) from public, anon;
revoke all on function public.reclamar_aviso_amistad(uuid) from public, anon;
grant execute on function public.reclamar_aviso_bebida(uuid) to authenticated;
grant execute on function public.reclamar_aviso_soja(uuid) to authenticated;
grant execute on function public.reclamar_aviso_amistad(uuid) to authenticated;
