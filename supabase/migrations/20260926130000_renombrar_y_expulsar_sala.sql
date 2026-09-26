-- Gestión de sala para admin/fundador: cambiar el nombre y echar a un
-- miembro. Mismo espíritu que archivar_sala (RPC security definer, sin
-- política de update en la tabla).

create or replace function public.renombrar_sala(p_sala uuid, p_nombre text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_rol text;
  v_nombre text := trim(coalesce(p_nombre, ''));
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if v_nombre = '' or length(v_nombre) > 60 then
    raise exception 'Nombre no válido';
  end if;

  select rol into v_rol from sala_miembros
  where sala_id = p_sala and usuario_id = auth.uid();
  if v_rol is null or v_rol not in ('admin', 'fundador') then
    raise exception 'No tienes permiso para renombrar esta sala';
  end if;

  update salas set nombre = v_nombre where id = p_sala;
end;
$function$;

revoke all on function public.renombrar_sala(uuid, text) from public, anon;
grant execute on function public.renombrar_sala(uuid, text) to authenticated;

-- Expulsa a un miembro de la sala. Un admin solo puede echar a un
-- 'miembro' normal; el fundador puede echar a cualquiera menos a sí
-- mismo (para eso está archivar/transferir la sala, no esto).
create or replace function public.expulsar_miembro_sala(p_sala uuid, p_usuario_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_mi_rol text;
  v_rol_objetivo text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_usuario_id = auth.uid() then
    raise exception 'No puedes expulsarte a ti mismo';
  end if;

  select rol into v_mi_rol from sala_miembros
  where sala_id = p_sala and usuario_id = auth.uid();
  if v_mi_rol is null or v_mi_rol not in ('admin', 'fundador') then
    raise exception 'No tienes permiso para expulsar miembros de esta sala';
  end if;

  select rol into v_rol_objetivo from sala_miembros
  where sala_id = p_sala and usuario_id = p_usuario_id;
  if v_rol_objetivo is null then
    raise exception 'Ese usuario no es miembro de esta sala';
  end if;
  if v_mi_rol = 'admin' and v_rol_objetivo <> 'miembro' then
    raise exception 'Un admin solo puede expulsar a miembros normales';
  end if;
  if v_rol_objetivo = 'fundador' then
    raise exception 'No se puede expulsar al fundador';
  end if;

  delete from sala_miembros where sala_id = p_sala and usuario_id = p_usuario_id;
end;
$function$;

revoke all on function public.expulsar_miembro_sala(uuid, uuid) from public, anon;
grant execute on function public.expulsar_miembro_sala(uuid, uuid) to authenticated;
