-- Borrado de un registro de SOJAS suelto (fuera de noche) en una sala
-- permanente, igual que ya existe para bebidas normales
-- (`borrar_registro_bebida_suelta`): el propio autor puede borrar el suyo,
-- y un admin o el fundador de la sala puede borrar el de cualquiera.
--
-- Solo aplica a SOJAS sueltas (`noche_id is null`), nunca a una registrada
-- dentro de una noche, por el mismo motivo que las bebidas normales: no
-- complicar la mecánica de noche/liga borrando algo que ya contó.
create or replace function public.borrar_soja_suelta(p_registro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sala_id uuid;
  v_usuario uuid;
  v_rol text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select sala_id, usuario_id into v_sala_id, v_usuario
  from sojas_registros
  where id = p_registro_id and noche_id is null;

  if not found then
    raise exception 'Registro no encontrado';
  end if;

  if v_usuario <> auth.uid() then
    select rol into v_rol from sala_miembros
    where sala_id = v_sala_id and usuario_id = auth.uid();

    if v_rol is null or v_rol not in ('admin', 'fundador') then
      raise exception 'No tienes permiso para borrar ese registro';
    end if;
  end if;

  delete from sojas_registros where id = p_registro_id;
end;
$function$;

revoke all on function public.borrar_soja_suelta(uuid) from public, anon;
grant execute on function public.borrar_soja_suelta(uuid) to authenticated;
