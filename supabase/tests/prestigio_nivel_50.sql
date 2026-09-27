-- Usuario temporal y rollback: no modifica ninguna cuenta real.
begin;
do $$
declare
  v_uid uuid := gen_random_uuid();
  v_xp integer := round(100 * power(50::numeric, 1.4));
  v_config jsonb;
  v_antes jsonb;
  v_cofres jsonb;
  v_resultado jsonb;
  v_rechazado boolean;
begin
  assert not has_table_privilege('authenticated', 'public.prestigios', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.prestigios', 'UPDATE');
  assert not has_function_privilege('anon', 'public.ascender_prestigio(integer)', 'EXECUTE');
  insert into auth.users(id, email, raw_user_meta_data)
  values(v_uid, 'prestigio-test-' || v_uid || '@example.invalid', '{}'::jsonb);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  update public.perfiles set xp = v_xp - 1 where id = v_uid;
  v_rechazado := false;
  begin
    perform public.ascender_prestigio(0);
  exception when raise_exception then v_rechazado := true;
  end;
  assert v_rechazado, 'El nivel 49 no puede ascender';
  update public.perfiles set xp = v_xp,
    avatar_config = avatar_config || jsonb_build_object('prueba', 'conservar') where id = v_uid;
  select avatar_config into v_antes from public.perfiles where id = v_uid;
  v_resultado := public.ascender_prestigio(0);
  assert (v_resultado->>'ciclo')::integer = 1;
  assert (select xp = 0 from public.perfiles where id = v_uid);
  select avatar_config into v_config from public.perfiles where id = v_uid;
  assert v_config->>'prueba' = 'conservar';
  assert (v_config->'inventario') = (v_antes->'inventario'), 'El inventario no cambia al ascender';
  assert v_config->'tienda'->'marcos' ? 'disco';
  assert (v_config->'tienda'->>'bonus')::integer = coalesce((v_antes->'tienda'->>'bonus')::integer,0) + floor(v_xp::numeric/50)::integer;
  assert (v_config->'tienda'->'marcos') @> (v_antes->'tienda'->'marcos');
  v_rechazado := false;
  begin
    perform public.ascender_prestigio(0);
  exception when raise_exception then v_rechazado := true;
  end;
  assert v_rechazado, 'Una peticion repetida no concede otro prestigio';
  update public.perfiles set xp = round(100 * power(2::numeric,1.4)) where id = v_uid;
  select avatar_config->'inventario'->'cofres' into v_cofres from public.perfiles where id = v_uid;
  assert (v_cofres->>'comun')::integer = coalesce((v_config->'inventario'->'cofres'->>'comun')::integer,0) + 1;
  update public.perfiles set xp = 0 where id = v_uid;
  update public.perfiles set xp = round(100 * power(2::numeric,1.4)) where id = v_uid;
  assert (select avatar_config->'inventario'->'cofres' = v_cofres from public.perfiles where id = v_uid), 'No duplicar cofres al recuperar nivel';
  assert (select count(*) = 1 from public.recompensas_cofre where usuario_id=v_uid and referencia='p1:2');
  update public.perfiles set xp = v_xp where id = v_uid;
  v_resultado := public.ascender_prestigio(1);
  assert (v_resultado->>'ciclo')::integer = 2;
  assert (select avatar_config->'tienda'->'marcos' ? 'reliquia' from public.perfiles where id=v_uid);
  perform set_config('request.jwt.claim.sub', '', true);
  v_rechazado := false;
  begin
    perform public.ascender_prestigio(2);
  exception when raise_exception then v_rechazado := true;
  end;
  assert v_rechazado, 'Requiere autenticacion';
end;
$$;
rollback;
