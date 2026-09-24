-- Prueba de la migración 20260924215656 (nombre de usuario único).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios de prueba.
--
-- Comprueba:
--  A) handle_new_user genera un nombre por defecto a partir del email, y si
--     colisiona con uno ya existente le añade un sufijo numérico en vez de
--     fallar (la migración deja como ejemplo real un nombre duplicado
--     resuelto en producción: "tualemandeconfianza" / "…3").
--  B) cambiar_nombre_usuario rechaza nombres demasiado cortos.
--  C) cambiar_nombre_usuario rechaza nombres ya usados por otro perfil
--     (comparación case-insensitive).
--  D) cambiar_nombre_usuario acepta un nombre válido (letras, números,
--     espacios, puntos, guiones y guion bajo) y lo aplica.
do $verif$
declare
  u1 uuid := gen_random_uuid();
  v_nombre_generado text;
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
begin
  insert into auth.users (id, email, instance_id, aud, role)
  values (u1, 'tualemandeconfianza3@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  select nombre into v_nombre_generado from perfiles where id = u1;
  v_out := v_out || jsonb_build_object('nombre_generado_tras_colision', v_nombre_generado);
  v_ok := v_ok and v_nombre_generado <> 'tualemandeconfianza3';

  -- auth.uid() lee el sub del JWT simulado, para poder llamar a la RPC como
  -- si fuéramos el usuario recién creado.
  perform set_config('request.jwt.claims', json_build_object('sub', u1::text)::text, true);

  begin
    perform cambiar_nombre_usuario('ab');
    v_ok := false; v_out := v_out || jsonb_build_object('B_fallo_esperado', 'no fallo');
  exception when others then
    v_out := v_out || jsonb_build_object('B_error', sqlerrm);
    v_ok := v_ok and sqlerrm = 'El nombre debe tener entre 3 y 24 caracteres';
  end;

  begin
    perform cambiar_nombre_usuario('tualemandeconfianza');
    v_ok := false; v_out := v_out || jsonb_build_object('C_fallo_esperado', 'no fallo');
  exception when others then
    v_out := v_out || jsonb_build_object('C_error', sqlerrm);
    v_ok := v_ok and sqlerrm = 'Ese nombre ya está en uso';
  end;

  begin
    perform cambiar_nombre_usuario('Nombre_Valido.123');
    v_out := v_out || jsonb_build_object('D_nombre_final', (select nombre from perfiles where id = u1));
    v_ok := v_ok and (select nombre from perfiles where id = u1) = 'Nombre_Valido.123';
  exception when others then
    v_ok := false; v_out := v_out || jsonb_build_object('D_error_inesperado', sqlerrm);
  end;

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
