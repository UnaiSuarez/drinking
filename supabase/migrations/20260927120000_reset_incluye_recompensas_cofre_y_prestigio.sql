-- admin_resetear_cuenta ya borraba xp, avatar_config, logros_usuario y liga,
-- pero no recompensas_cofre (evita duplicar el cofre de un nivel o medalla
-- ya entregados) ni prestigios (ciclos de prestigio, tabla añadida después).
-- Sin este borrado, un jugador reseteado que vuelve a subir de forma natural
-- no recibiría de nuevo esos cofres: los triggers los verían como "ya
-- entregados" y no los repondrían, aunque avatar_config se haya vaciado.
create or replace function public.admin_resetear_cuenta(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not es_super_admin() then
    raise exception 'No autorizado';
  end if;

  update perfiles
  set xp = 0, avatar_config = '{}'::jsonb
  where id = p_usuario;

  delete from logros_usuario where usuario_id = p_usuario;
  delete from liga where usuario_id = p_usuario;
  delete from recompensas_cofre where usuario_id = p_usuario;
  delete from prestigios where usuario_id = p_usuario;
end;
$$;
