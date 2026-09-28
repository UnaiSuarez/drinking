-- Tras cerrar cada noche, saca de la sala a los invitados (rol='invitado')
-- que jugaron esa noche: su acceso es "solo para esa noche", no deben
-- quedarse en la sala permanente después de que se cierre. Nunca toca
-- fundador/admin/miembro. Alcance mínimo: una sola sentencia añadida al
-- bucle ya existente, nada más de cron_forzar_cierre_noches cambia.
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

    delete from sala_miembros
    where rol = 'invitado'
      and (sala_id, usuario_id) in (
        select n.sala_id, nj.usuario_id
        from noche_jugadores nj
        join noches n on n.id = nj.noche_id
        where nj.noche_id = r.id
      );
  end loop;
end;
$function$;
