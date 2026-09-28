-- Desbloquea un personaje oculto para un jugador sin alterar sus skins ni
-- el resto de su inventario. Solo puede ejecutarlo el superadmin.
create or replace function public.admin_desbloquear_personaje(
  p_usuario uuid,
  p_personaje_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb;
  v_inventario jsonb;
  v_personajes jsonb;
  v_fragmentos jsonb;
begin
  if not public.es_super_admin() then
    raise exception 'No autorizado';
  end if;

  if p_personaje_id is null or p_personaje_id not in (
    'ultimo-ronda', 'jefe-after', 'narrador-noche',
    'silencioso-letal', 'guardian-cubata'
  ) then
    raise exception 'Personaje no válido';
  end if;

  select coalesce(avatar_config, '{}'::jsonb)
    into v_cfg
    from public.perfiles
    where id = p_usuario
    for update;
  if not found then
    raise exception 'Jugador no encontrado';
  end if;

  v_inventario := coalesce(v_cfg->'inventario', '{}'::jsonb);
  v_personajes := coalesce(v_inventario->'personajesOcultos', '[]'::jsonb);
  v_fragmentos := coalesce(v_inventario->'personajeFragmentos', '{}'::jsonb);

  if not (v_personajes ? p_personaje_id) then
    v_personajes := v_personajes || to_jsonb(p_personaje_id);
  end if;
  v_fragmentos := jsonb_set(v_fragmentos, array[p_personaje_id], '3'::jsonb, true);
  v_inventario := v_inventario || jsonb_build_object(
    'personajesOcultos', v_personajes,
    'personajeFragmentos', v_fragmentos
  );

  update public.perfiles
    set avatar_config = jsonb_set(v_cfg, '{inventario}', v_inventario, true)
    where id = p_usuario;
end;
$$;

revoke all on function public.admin_desbloquear_personaje(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_desbloquear_personaje(uuid, text) to authenticated;
