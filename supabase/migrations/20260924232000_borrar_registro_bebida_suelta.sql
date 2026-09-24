-- Listado y borrado de bebidas sueltas de una sala permanente: ver lo que
-- ha registrado cada miembro (ya visible por la política de lectura de
-- `registros`, que permite a cualquier miembro ver todos los registros de
-- su sala) y poder borrar un registro concreto por error, más allá de la
-- ventana de 30s que ya tenía `anular_bebida_suelta` para el propio último
-- registro.
--
-- Solo aplica a bebida suelta (`sala_id is not null`), nunca a un registro
-- de una noche (`noche_id`): igual que el mapa de sitios, para no
-- complicar la mecánica de noche/liga borrando algo que ya contó para el
-- podio. Puede borrar su propio registro cualquier miembro, y el de
-- cualquiera un admin o el fundador de la sala (limpieza/moderación).
create or replace function public.borrar_registro_bebida_suelta(p_registro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_sala_id uuid;
  v_usuario uuid;
  v_catalogo uuid;
  v_rareza text;
  v_xp int := 5;
  v_era_unica boolean;
  v_rol text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select sala_id, usuario_id, bebida_catalogo_id
    into v_sala_id, v_usuario, v_catalogo
  from registros
  where id = p_registro_id and sala_id is not null;

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

  if v_catalogo is not null then
    select count(*) = 1 into v_era_unica from registros
    where usuario_id = v_usuario and bebida_catalogo_id = v_catalogo;
    if v_era_unica then
      select rareza into v_rareza from bebidas_catalogo where id = v_catalogo;
      v_xp := v_xp + case v_rareza
        when 'rara' then 5 when 'epica' then 15 when 'legendaria' then 30 else 0
      end;
    end if;
  end if;

  delete from registros where id = p_registro_id;
  update perfiles set xp = greatest(0, xp - v_xp) where id = v_usuario;
end;
$function$;
