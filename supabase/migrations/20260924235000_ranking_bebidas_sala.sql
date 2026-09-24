-- Antes, /sala/[id]/registros cargaba TODOS los registros de bebida suelta
-- de la sala (en tandas de 1000) solo para sumar el ranking de quién lleva
-- más. Con esta RPC el ranking se calcula en el propio Postgres (un group
-- by, rápido con el índice de sala_id) y el frontend deja de tener que
-- traerse el historial entero para eso — el historial en sí ahora se pagina
-- (ver RegistrosSalaClient.tsx), así una sala con mucha actividad no
-- satura la pantalla con una lista interminable.
create or replace function public.ranking_bebidas_sala(p_sala uuid)
 returns table(usuario_id uuid, total bigint)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select r.usuario_id, count(*) as total
  from registros r
  where r.sala_id = p_sala
    and es_miembro(p_sala)
  group by r.usuario_id
  order by total desc;
$function$;
