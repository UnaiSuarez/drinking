-- Herramientas de administrador: dar o quitar una skin / momento histórico a un
-- usuario. Mismo patrón que admin_ajustar_carta / admin_ajustar_cofre: las
-- skins viven en perfiles.avatar_config -> inventario -> skins (array de ids).
-- Solo añade una función nueva; no modifica datos ni otras funciones.

create or replace function public.admin_ajustar_skin(
  p_usuario uuid,
  p_skin_id text,
  p_dar boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cfg jsonb;
  v_skins jsonb;
begin
  if not es_super_admin() then
    raise exception 'No autorizado';
  end if;

  select coalesce(avatar_config, '{}'::jsonb) into v_cfg
  from perfiles where id = p_usuario;
  if not found then
    return;
  end if;

  v_skins := coalesce(v_cfg->'inventario'->'skins', '[]'::jsonb);
  if p_dar then
    if not (v_skins ? p_skin_id) then
      v_skins := v_skins || to_jsonb(p_skin_id);
    end if;
  else
    select coalesce(jsonb_agg(e), '[]'::jsonb) into v_skins
    from jsonb_array_elements(v_skins) e
    where (e #>> '{}') <> p_skin_id;
  end if;

  v_cfg := jsonb_set(
    v_cfg,
    '{inventario}',
    coalesce(v_cfg->'inventario', '{}'::jsonb) || jsonb_build_object('skins', v_skins),
    true
  );

  -- Si se quita la skin que llevaba puesta, deja de figurar como equipada.
  if not p_dar and (v_cfg->'tienda'->>'skinEquipada') = p_skin_id then
    v_cfg := jsonb_set(v_cfg, '{tienda,skinEquipada}', 'null'::jsonb);
  end if;

  update perfiles set avatar_config = v_cfg where id = p_usuario;
end;
$$;

revoke all on function public.admin_ajustar_skin(uuid, text, boolean) from public, anon;
grant execute on function public.admin_ajustar_skin(uuid, text, boolean) to authenticated;
