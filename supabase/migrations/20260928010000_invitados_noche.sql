-- Modo invitado: un enlace temporal para una noche concreta, para que
-- alguien sin cuenta pueda apuntarse al marcador sin unirse a la sala
-- permanente. Usa Supabase Auth anónimo (auth.signInAnonymously en el
-- cliente): handle_new_user ya crea un perfil normal para cualquier fila
-- nueva en auth.users, así que el invitado reutiliza el 100% del modelo de
-- datos existente (noche_jugadores, registros, podio...) sin tocar RLS.
-- El único hueco real es que se le da de alta en sala_miembros con
-- rol='invitado' (si no, "registros_insert"/"noches_select" etc. no le
-- dejarían ver ni registrar nada de esa noche) — por eso necesita
-- limpieza aparte (ver cron_forzar_cierre_noches), ya que "invitado" no
-- debe quedarse en la sala para siempre.

alter table public.sala_miembros
  drop constraint sala_miembros_rol_check,
  add constraint sala_miembros_rol_check
    check (rol = any (array['fundador', 'admin', 'miembro', 'invitado']));

create table if not exists public.invitaciones_noche (
  token text primary key,
  noche_id uuid not null references public.noches(id) on delete cascade,
  creado_por uuid not null references public.perfiles(id),
  creado_en timestamptz not null default now()
);

alter table public.invitaciones_noche enable row level security;
-- Sin política de SELECT a propósito: la vista previa de la invitación pasa
-- por info_invitacion() (SECURITY DEFINER), no por leer la tabla directa.
-- Así el token en sí sigue siendo lo único que hace falta conocer.

create or replace function public.crear_invitacion_noche(p_noche uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sala uuid;
  v_estado text;
  v_token text;
begin
  select sala_id, estado into v_sala, v_estado from noches where id = p_noche;
  if v_sala is null then
    raise exception 'Noche no encontrada';
  end if;
  if not es_miembro(v_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;
  if v_estado not in ('pendiente', 'activa') then
    raise exception 'Esta noche ya no admite invitados';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into invitaciones_noche (token, noche_id, creado_por)
  values (v_token, p_noche, auth.uid());

  return v_token;
end;
$function$;

create or replace function public.info_invitacion(p_token text)
returns table(sala_nombre text, noche_fecha timestamptz, valida boolean)
language sql
security definer
set search_path to 'public'
as $function$
  select s.nombre, n.inicio, (n.estado in ('pendiente', 'activa'))
  from invitaciones_noche i
  join noches n on n.id = i.noche_id
  join salas s on s.id = n.sala_id
  where i.token = p_token;
$function$;

create or replace function public.unirse_como_invitado(p_token text, p_nombre text)
returns uuid -- noche_id, para redirigir
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_noche uuid;
  v_sala uuid;
  v_estado text;
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  select i.noche_id, n.sala_id, n.estado
    into v_noche, v_sala, v_estado
  from invitaciones_noche i
  join noches n on n.id = i.noche_id
  where i.token = p_token;

  if v_noche is null then
    raise exception 'Invitación no válida';
  end if;
  if v_estado not in ('pendiente', 'activa') then
    raise exception 'Esta noche ya no admite invitados';
  end if;

  v_nombre := nullif(trim(p_nombre), '');
  if v_nombre is null or length(v_nombre) < 2 then
    raise exception 'Pon un nombre de al menos 2 letras';
  end if;

  update perfiles set nombre = v_nombre where id = auth.uid();

  insert into sala_miembros (sala_id, usuario_id, rol)
  values (v_sala, auth.uid(), 'invitado')
  on conflict (sala_id, usuario_id) do nothing;

  insert into noche_jugadores (noche_id, usuario_id)
  values (v_noche, auth.uid())
  on conflict (noche_id, usuario_id) do nothing;

  return v_noche;
end;
$function$;
