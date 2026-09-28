-- unirse_como_invitado renombraba SIEMPRE al que se une, incluso si abría
-- el enlace ya con una cuenta real (le cambiaría el nombre de su perfil de
-- verdad al que escriba en el formulario de invitado). Solo debe tocar el
-- nombre cuando quien llama es una sesión anónima (invitado de verdad).
create or replace function public.unirse_como_invitado(p_token text, p_nombre text)
returns uuid
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

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    v_nombre := nullif(trim(p_nombre), '');
    if v_nombre is null or length(v_nombre) < 2 then
      raise exception 'Pon un nombre de al menos 2 letras';
    end if;
    update perfiles set nombre = v_nombre where id = auth.uid();
  end if;

  insert into sala_miembros (sala_id, usuario_id, rol)
  values (v_sala, auth.uid(), 'invitado')
  on conflict (sala_id, usuario_id) do nothing;

  insert into noche_jugadores (noche_id, usuario_id)
  values (v_noche, auth.uid())
  on conflict (noche_id, usuario_id) do nothing;

  return v_noche;
end;
$function$;
