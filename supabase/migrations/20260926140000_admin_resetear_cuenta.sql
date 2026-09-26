-- Herramienta de administrador: resetear la progresión de un jugador a
-- cero. Mismo patrón que admin_ajustar_skin (solo añade una función
-- nueva, reutiliza es_super_admin()).
--
-- Alcance: XP, nivel, chapas, inventario (cartas/cofres/skins/marcos) y
-- medallas. No toca el historial de noches/registros ya jugados (son
-- historial compartido con el resto de la sala, no solo suyo) ni sus
-- salas o amistades: es un reset de progresión, no un borrado de cuenta.
create or replace function public.admin_resetear_cuenta(p_usuario uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not es_super_admin() then
    raise exception 'No autorizado';
  end if;

  update perfiles
  set xp = 0, avatar_config = '{}'::jsonb
  where id = p_usuario;

  delete from logros_usuario where usuario_id = p_usuario;
  delete from liga where usuario_id = p_usuario;
end;
$function$;

revoke all on function public.admin_resetear_cuenta(uuid) from public, anon;
grant execute on function public.admin_resetear_cuenta(uuid) to authenticated;
