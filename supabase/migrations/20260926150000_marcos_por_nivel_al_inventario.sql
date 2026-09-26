-- Cada 10 niveles (10, 20, ..., 100) se añade un marco al inventario en
-- vez de aplicarse solo: el jugador lo equipa cuando quiera desde la
-- tienda/inventario, igual que uno comprado. Mismos tramos que
-- MARCO_NIVEL_HITOS en src/lib/marcos.ts — si cambia uno, cambia el otro.
--
-- Reemplaza recompensar_niveles_xp (20260925214323): añade el bloque de
-- marcos al final, sin tocar la parte de cofres que ya tenía.
create or replace function public.recompensar_niveles_xp()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nivel integer := 1;
  v_paso integer;
  v_tipo text;
  v_marco text;
  v_config jsonb := coalesce(new.avatar_config, '{}'::jsonb);
  v_inventario jsonb;
  v_cofres jsonb;
  v_tienda jsonb;
  v_marcos jsonb;
begin
  while round(100 * power((v_nivel + 1)::numeric, 1.4)) <= greatest(new.xp, 0) loop
    v_nivel := v_nivel + 1;
  end loop;

  v_inventario := coalesce(v_config->'inventario', '{}'::jsonb);
  v_cofres := coalesce(v_inventario->'cofres', '{}'::jsonb);
  v_tienda := coalesce(v_config->'tienda', '{}'::jsonb);
  v_marcos := coalesce(v_tienda->'marcos', '[]'::jsonb);

  for v_paso in 2..v_nivel loop
    v_tipo := case
      when v_paso % 10 = 0 then 'legendario'
      when v_paso % 5 = 0 then 'epico'
      else 'comun'
    end;
    insert into public.recompensas_cofre (usuario_id, origen, referencia, cofre_tipo)
    values (new.id, 'nivel', v_paso::text, v_tipo)
    on conflict do nothing;
    if found then
      v_cofres := jsonb_set(
        v_cofres,
        array[v_tipo],
        to_jsonb(coalesce((v_cofres->>v_tipo)::integer, 0) + 1),
        true
      );
    end if;

    if v_paso % 10 = 0 then
      v_marco := case v_paso
        when 10 then 'plata'
        when 20 then 'cosmico'
        when 30 then 'hielo'
        when 40 then 'aureola'
        when 50 then 'neon'
        when 60 then 'disco'
        when 70 then 'reliquia'
        when 80 then 'prisma'
        when 90 then 'trono'
        when 100 then 'llamas'
        else null
      end;
      if v_marco is not null and not (v_marcos ? v_marco) then
        v_marcos := v_marcos || to_jsonb(v_marco);
      end if;
    end if;
  end loop;

  new.avatar_config := v_config || jsonb_build_object(
    'inventario', v_inventario || jsonb_build_object('cofres', v_cofres),
    'tienda', v_tienda || jsonb_build_object('marcos', v_marcos)
  );
  return new;
end;
$$;

-- Retroactivo: quien ya tenga el nivel hecho recibe el marco ahora mismo.
update public.perfiles set xp = xp;
