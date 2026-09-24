-- registrar_bebida_suelta: respuesta compatible con clientes antiguos y nuevos.
--
-- Contexto: antes del PR #15 la función devolvía la fila de `registros`
-- (`data.id`, `data.ts`, ...) y el cliente antiguo lee exactamente eso para
-- activar "Deshacer última". El PR #15 cambió la respuesta a
-- `{ registro: {...}, xp_ganada, descubierta, logros_nuevos }` sin conservar
-- los campos de primer nivel: un cliente antiguo (pestaña ya abierta, PWA con
-- el bundle anterior en caché) sigue registrando la bebida, pero recibe
-- `data.id`/`data.ts` = undefined y nunca puede mostrar "Deshacer".
--
-- Transición: la respuesta incluye AMBAS formas. Los campos de la fila
-- (`id`, `ts`, ...) siguen en el primer nivel para los clientes antiguos y
-- `registro` + el resto de claves los usan los nuevos. Cuando ya no queden
-- clientes anteriores al PR #15 se podrá retirar la parte de primer nivel
-- con una migración posterior (basta con quitar `to_jsonb(v_registro) ||`).
--
-- Además, la función se serializa por usuario con un bloqueo consultivo de
-- transacción: sin él, dos registros simultáneos de la misma bebida
-- concreta veían ambos "primera vez" y cobraban dos veces el bonus de
-- rareza, y los logros "de por vida" podían concederse dos veces (no hay
-- índice único que lo impida: los logros repetibles del motor de noches
-- ya tienen pares duplicados legítimos). La misma clave se toma en
-- otorgar_logros_lifetime (bloqueo reentrante dentro de la misma sesión).
create or replace function public.registrar_bebida_suelta(
  p_sala uuid,
  p_bebida_tipo_id integer,
  p_bebida_catalogo_id uuid default null,
  p_comentario text default null
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_tipo text;
  v_tipo_id integer;
  v_rareza text;
  v_es_primera boolean := false;
  v_bonus_rareza int := 0;
  v_xp int;
  v_registro public.registros;
  v_logros_nuevos jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bebida_suelta:' || auth.uid()::text, 0));

  select coalesce(config->>'tipo', 'normal') into v_tipo from salas where id = p_sala;
  if v_tipo <> 'permanente' then
    raise exception 'Solo se pueden registrar bebidas sueltas en una sala permanente';
  end if;

  v_tipo_id := p_bebida_tipo_id;

  if p_bebida_catalogo_id is not null then
    select categoria_id, rareza into v_tipo_id, v_rareza
    from bebidas_catalogo
    where id = p_bebida_catalogo_id and (sala_id is null or sala_id = p_sala);
    if not found then
      raise exception 'Bebida del catálogo no válida para esta sala';
    end if;

    v_es_primera := not exists (
      select 1 from registros
      where usuario_id = auth.uid() and bebida_catalogo_id = p_bebida_catalogo_id
    );
    if v_es_primera then
      v_bonus_rareza := case v_rareza
        when 'rara' then 5 when 'epica' then 15 when 'legendaria' then 30 else 0
      end;
    end if;
  end if;

  if not exists (
    select 1 from bebidas_tipo where id = v_tipo_id and (sala_id is null or sala_id = p_sala)
  ) then
    raise exception 'Tipo de bebida no válido para esta sala';
  end if;

  insert into registros (sala_id, usuario_id, bebida_tipo_id, bebida_catalogo_id, comentario)
  values (p_sala, auth.uid(), v_tipo_id, p_bebida_catalogo_id, nullif(trim(coalesce(p_comentario, '')), ''))
  returning * into v_registro;

  v_xp := 5 + v_bonus_rareza;
  update perfiles set xp = xp + v_xp where id = auth.uid();

  v_logros_nuevos := otorgar_logros_lifetime(auth.uid(), p_sala);

  return to_jsonb(v_registro)
    || jsonb_build_object(
      'registro', to_jsonb(v_registro),
      'xp_ganada', v_xp,
      'descubierta', v_es_primera and v_bonus_rareza > 0,
      'logros_nuevos', coalesce(v_logros_nuevos, '[]'::jsonb)
    );
end;
$function$;
