-- cron_forzar_cierre_noches: el cierre automático de noches llevaba fallando
-- desde el 10/07/2026 08:20 UTC con
--   relation "tmp_cartas_activas" already exists
-- y dejaba sin cerrar TODAS las noches, no solo las que lo provocaban.
--
-- 1) CAUSA. finalizar_noche crea cinco tablas temporales `on commit drop`
--    (tmp_cartas_activas, tmp_personaje_equipado, tmp_registro_puntos,
--    tmp_bono_cartas_flat, tmp_liga_antes). `on commit drop` las borra al
--    terminar la TRANSACCIÓN, no la llamada a la función. El cron recorría las
--    noches vencidas y llamaba a finalizar_noche por cada una dentro de una sola
--    ejecución (= una transacción): con dos o más noches vencidas en la misma
--    pasada, la segunda llamada intentaba crear tablas que la primera ya había
--    dejado. Con una sola noche vencida por pasada nunca falló, por eso estuvo
--    latente desde que finalizar_noche empezó a usar tablas temporales.
--
-- 2) POR QUÉ NO SE ARREGLABA SOLO. El error deshacía la transacción entera del
--    cron, incluidos los dos pasos anteriores (borrar pendientes de más de 24 h y
--    pasar a «cerrando» las activas vencidas) y la primera noche que sí se había
--    finalizado. Las mismas noches seguían vencidas en la pasada siguiente, cada
--    10 minutos, y volvían a fallar.
--
-- 3) CORRECCIÓN (alcance mínimo). Antes de finalizar cada noche se eliminan,
--    con nombre, las cinco tablas temporales que finalizar_noche crea. Así cada
--    llamada parte limpia aunque la anterior sea de la misma transacción. No se
--    toca finalizar_noche ni el resto de la función.
--
--    Si finalizar_noche falla por CUALQUIER otra causa, el error se sigue
--    propagando: la ejecución del cron falla y queda visible en
--    `cron.job_run_details` (status 'failed'), como hasta ahora. No hay
--    aislamiento por noche: una noche defectuosa vuelve a bloquear el cierre de
--    las demás hasta que se corrija. Aislarlas exigiría un registro persistente
--    y observable de los fallos individuales; queda como mejora posterior.
--
--    Si finalizar_noche cambia y crea otra tabla temporal, hay que añadirla a la
--    lista de aquí (la prueba supabase/tests/cron_cierre_noches.sql lo detecta:
--    fallará el escenario de varias noches vencidas).
--
--    Se conserva todo lo demás: mismos permisos (postgres y service_role),
--    security definer y search_path, y los pasos 1 y 2 tal cual estaban.
create or replace function public.cron_forzar_cierre_noches()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_categorias text[] := array[
    '💀 El más borracho','😂 El más divertido','🤝 Mejor compa de la noche',
    '🚀 MVP de la noche','🔍 El descubierto (parecía sobrio y no lo estaba)',
    '🤦 La cagada más graciosa','🎯 El más consistente','🦸 El momento más heroico'
  ];
  r record;
begin
  delete from noches
  where estado = 'pendiente' and created_at <= now() - interval '24 hours';

  update noches
  set estado = 'cerrando',
      fin_gracia = now(),
      votacion_categoria = coalesce(votacion_categoria, v_categorias[floor(random() * array_length(v_categorias,1))::int + 1])
  where estado = 'activa' and fin_programado <= now() - interval '24 hours';

  for r in
    select id from noches
    where estado = 'cerrando' and fin_gracia <= now() - interval '24 hours'
  loop
    -- Tablas temporales `on commit drop` de finalizar_noche: sobreviven a la
    -- llamada anterior dentro de esta misma transacción.
    drop table if exists pg_temp.tmp_cartas_activas,
                         pg_temp.tmp_personaje_equipado,
                         pg_temp.tmp_registro_puntos,
                         pg_temp.tmp_bono_cartas_flat,
                         pg_temp.tmp_liga_antes;
    perform finalizar_noche(r.id);
  end loop;
end;
$function$;
