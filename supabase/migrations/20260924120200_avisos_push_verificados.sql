-- Avisos push verificados en el servidor.
--
-- Antes, /api/notificar-logro y /api/notificar-noche-activada enviaban un push
-- a toda la sala con el nombre del logro, el nombre de la sala y el usuario a
-- excluir tal y como los declaraba el navegador: cualquier miembro podía
-- mandar un aviso falso ("Fulano ha conseguido «Leyenda Viva»") y repetirlo
-- las veces que quisiera; además, la comprobación de la noche en el cliente
-- ("estado === 'activa'") se cumple también cuando una tercera persona se une
-- a una noche que ya llevaba rato activa, y volvía a avisar a todos.
--
-- Ahora el servidor pide el hecho a la base con estas dos funciones, que
-- (1) comprueban que el hecho es cierto y reciente, (2) lo "reclaman" de forma
-- atómica en `avisos_push` (clave única): solo la primera llamada obtiene los
-- datos para enviar, cualquier repetición o cliente atrasado obtiene 0 filas,
-- y (3) devuelven los textos (nombre de la sala, del logro, de la persona)
-- leídos de la propia base, no de la petición.

create table if not exists public.avisos_push (
  clave text primary key,
  tipo text not null check (tipo in ('logro', 'noche_activada')),
  usuario_id uuid references public.perfiles(id) on delete cascade,
  sala_id uuid references public.salas(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Solo escriben las funciones security definer de abajo; ningún rol de la API
-- necesita leer ni escribir directamente.
alter table public.avisos_push enable row level security;
revoke all on table public.avisos_push from anon, authenticated;

-- ===== Logro desbloqueado con una bebida suelta =====
-- Hecho comprobado: la persona que llama tiene un logro "de por vida"
-- (logros_usuario con noche_id nulo) en esa sala, de rareza rara o superior,
-- concedido hace menos de 5 minutos. Cada logro concedido se puede reclamar
-- una sola vez.
create or replace function public.reclamar_aviso_logro(p_sala uuid)
 returns table(
   aviso_logro_slug text,
   aviso_logro_nombre text,
   aviso_logro_icono text,
   aviso_logro_rareza text,
   aviso_sala_nombre text,
   aviso_usuario_nombre text
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  return query
  with candidatos as (
    select lu.id as lu_id, l.slug, l.nombre, l.icono, l.rareza
    from logros_usuario lu
    join logros l on l.id = lu.logro_id
    where lu.usuario_id = auth.uid()
      and lu.sala_id = p_sala
      and lu.noche_id is null
      and lu.ts > now() - interval '5 minutes'
      and l.rareza in ('rara', 'epica', 'legendaria')
  ),
  reclamados as (
    insert into avisos_push (clave, tipo, usuario_id, sala_id)
    select 'logro:' || c.lu_id::text, 'logro', auth.uid(), p_sala
    from candidatos c
    on conflict (clave) do nothing
    returning clave
  )
  select c.slug, c.nombre, c.icono, c.rareza, s.nombre, coalesce(pf.nombre, 'Alguien')
  from candidatos c
  join reclamados r on r.clave = 'logro:' || c.lu_id::text
  join salas s on s.id = p_sala
  left join perfiles pf on pf.id = auth.uid();
end;
$function$;

-- ===== Noche pendiente que se activa =====
-- Hecho comprobado: la noche está activa, la persona que llama es jugadora
-- de esa noche y su ingreso es el que la activó (el trigger
-- noche_jugadores_activar_pendiente fija `inicio = now()` en la MISMA
-- transacción que el insert del segundo jugador, así que `joined_at` e
-- `inicio` coinciden exactamente solo para quien provocó la activación), ya
-- había otro jugador antes y ocurrió hace menos de 10 minutos. Una tercera
-- persona que se une después no cumple `joined_at = inicio`. Se reclama una
-- sola vez por noche.
create or replace function public.reclamar_aviso_noche_activada(p_noche uuid)
 returns table(
   aviso_sala_id uuid,
   aviso_sala_nombre text,
   aviso_noche_id uuid
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sala uuid;
  v_estado text;
  v_inicio timestamptz;
  v_joined timestamptz;
  v_nombre text;
  v_reclamados integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select n.sala_id, n.estado, n.inicio into v_sala, v_estado, v_inicio
  from noches n where n.id = p_noche;
  if not found then
    return;
  end if;
  if not es_miembro(v_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  select nj.joined_at into v_joined
  from noche_jugadores nj
  where nj.noche_id = p_noche and nj.usuario_id = auth.uid();

  if v_estado <> 'activa'
     or v_joined is null
     or v_joined <> v_inicio
     or v_inicio < now() - interval '10 minutes'
     or not exists (
       select 1 from noche_jugadores otro
       where otro.noche_id = p_noche
         and otro.usuario_id <> auth.uid()
         and otro.joined_at < v_joined
     )
  then
    return;
  end if;

  insert into avisos_push (clave, tipo, usuario_id, sala_id)
  values ('noche_activada:' || p_noche::text, 'noche_activada', auth.uid(), v_sala)
  on conflict (clave) do nothing;
  get diagnostics v_reclamados = row_count;
  if v_reclamados = 0 then
    return;
  end if;

  select s.nombre into v_nombre from salas s where s.id = v_sala;
  return query select v_sala, v_nombre, p_noche;
end;
$function$;

revoke execute on function public.reclamar_aviso_logro(uuid) from public, anon;
revoke execute on function public.reclamar_aviso_noche_activada(uuid) from public, anon;
grant execute on function public.reclamar_aviso_logro(uuid) to authenticated;
grant execute on function public.reclamar_aviso_noche_activada(uuid) to authenticated;
