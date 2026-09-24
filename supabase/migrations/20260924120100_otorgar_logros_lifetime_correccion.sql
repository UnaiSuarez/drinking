-- otorgar_logros_lifetime: corrección de un fallo que rompía TODO registro de
-- bebida suelta, y endurecimiento de permisos y concurrencia.
--
-- 1) FALLO: la función declaraba `r record` para el bucle de logros y, antes
--    del bucle, sus consultas usaban `r` como alias de `registros`
--    (`from registros r ... r.bebida_tipo_id`). En plpgsql el nombre
--    cualificado `r.campo` se resuelve primero contra la variable, que aún no
--    está asignada, y cada llamada lanzaba «record "r" is not assigned yet».
--    Como registrar_bebida_suelta la invoca siempre, registrar CUALQUIER
--    bebida suelta (rápida o concreta) fallaba y revertía la transacción.
--    Se renombra la variable del bucle a v_cand.
--
-- 2) PERMISOS: al crearla en el PR #15 quedó con los permisos por defecto
--    (PUBLIC, anon, authenticated) y sin ninguna comprobación de identidad:
--    cualquiera con la clave pública podía llamar a
--    `otorgar_logros_lifetime(<cualquier usuario>, <cualquier sala>)` y
--    disparar la concesión de logros y su XP/chapas a otra persona. La única
--    llamada legítima es interna (registrar_bebida_suelta es security definer
--    y la ejecuta con los permisos de su propietario), así que se retira el
--    permiso a los roles de la API.
--
-- 3) CONCURRENCIA: la comprobación "ya lo tiene" + insert no era atómica y
--    dos ejecuciones simultáneas podían conceder el mismo logro dos veces.
--    Se serializa por usuario con la misma clave que registrar_bebida_suelta
--    (bloqueo consultivo de transacción, reentrante dentro de la sesión).
create or replace function public.otorgar_logros_lifetime(p_usuario uuid, p_sala uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_cervezas int; v_chupitos int; v_cubatas int; v_total int; v_tipos int;
  v_cervezas_cat int; v_raras_mas int; v_legendarias int;
  v_nuevos jsonb := '[]'::jsonb;
  v_cand record;
  v_logro logros%rowtype;
  v_xp int;
  v_chapas int;
  v_ya boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('bebida_suelta:' || p_usuario::text, 0));

  select
    count(*) filter (where bt.nombre in ('Cerveza','Pinta')),
    count(*) filter (where bt.nombre in ('Chupito','Shot especial')),
    count(*) filter (where bt.nombre = 'Cubata'),
    count(*),
    count(distinct r.bebida_tipo_id)
  into v_cervezas, v_chupitos, v_cubatas, v_total, v_tipos
  from registros r
  join bebidas_tipo bt on bt.id = r.bebida_tipo_id
  where r.usuario_id = p_usuario and r.anulado = false;

  select count(distinct r.bebida_catalogo_id)
  into v_cervezas_cat
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  join bebidas_tipo bt on bt.id = bc.categoria_id
  where r.usuario_id = p_usuario and r.anulado = false and bt.nombre = 'Cerveza';

  select
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza in ('rara','epica','legendaria')),
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza = 'legendaria')
  into v_raras_mas, v_legendarias
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  where r.usuario_id = p_usuario and r.anulado = false;

  for v_cand in
    select * from (values
      ('cervecero_1', v_cervezas >= 50), ('cervecero_2', v_cervezas >= 250),
      ('cervecero_3', v_cervezas >= 1000), ('cervecero_4', v_cervezas >= 5000),
      ('centurion_1', v_chupitos >= 25), ('centurion_2', v_chupitos >= 100),
      ('centurion_3', v_chupitos >= 500), ('centurion_4', v_chupitos >= 1000),
      ('coctelero_1', v_cubatas >= 25), ('coctelero_2', v_cubatas >= 100),
      ('coctelero_3', v_cubatas >= 500), ('coctelero_4', v_cubatas >= 1000),
      ('oceano', v_total >= 1000), ('monumento', v_total >= 5000),
      ('enciclopedia', v_tipos >= 8),
      ('sumiller_1', v_cervezas_cat >= 10), ('sumiller_2', v_cervezas_cat >= 25),
      ('coleccionista_raras', v_raras_mas >= 3),
      ('coleccionista_legendaria', v_legendarias >= 1)
    ) as t(slug, cumple)
    where cumple
  loop
    select exists (
      select 1 from logros_usuario lu join logros l on l.id = lu.logro_id
      where lu.usuario_id = p_usuario and l.slug = v_cand.slug
    ) into v_ya;
    if v_ya then
      continue;
    end if;

    select * into v_logro from logros where slug = v_cand.slug;
    if not found then
      continue;
    end if;

    insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
    values (p_usuario, v_logro.id, null, p_sala);

    v_xp := case v_logro.rareza
      when 'comun' then 25 when 'rara' then 75 when 'epica' then 200 else 500 end;
    v_chapas := case v_logro.rareza
      when 'comun' then 8 when 'rara' then 20 when 'epica' then 50 else 150 end;

    update perfiles p
    set xp = p.xp + v_xp,
        avatar_config = jsonb_set(
          coalesce(p.avatar_config, '{}'::jsonb)
            || jsonb_build_object('tienda', coalesce(p.avatar_config->'tienda', '{}'::jsonb)),
          '{tienda,bonus}',
          to_jsonb(coalesce((p.avatar_config->'tienda'->>'bonus')::int, 0) + v_chapas)
        )
    where p.id = p_usuario;

    v_nuevos := v_nuevos || jsonb_build_object(
      'slug', v_logro.slug, 'nombre', v_logro.nombre,
      'icono', v_logro.icono, 'rareza', v_logro.rareza
    );
  end loop;

  return v_nuevos;
end;
$function$;

revoke execute on function public.otorgar_logros_lifetime(uuid, uuid) from public, anon, authenticated;
