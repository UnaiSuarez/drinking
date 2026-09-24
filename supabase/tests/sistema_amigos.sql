-- Prueba del sistema de amigos (migración 20260924221823).
--
-- Cómo usarla: pegarla tal cual en el editor SQL de Supabase (o ejecutarla
-- con psql). SIEMPRE termina con un error `RESULTADO_VERIFICACION {...}` y,
-- por tanto, se deshace por completo: no deja usuarios ni amistades de
-- prueba.
--
-- Comprueba, con tres usuarios sintéticos (A, B, C):
--  - buscar_usuarios_por_nombre encuentra por subcadena, sin distinguir
--    mayúsculas.
--  - A envía una solicitud a B (queda «pendiente», solicitado_por = A).
--  - A no puede duplicar la misma solicitud.
--  - B ve la solicitud entrante en mis_amigos().
--  - B la rechaza: no queda ninguna fila (se puede volver a solicitar).
--  - A vuelve a enviarla y B la acepta: queda «aceptada» para ambos.
--  - Solicitudes cruzadas: C envía a A, y cuando A "envía" a C se
--    auto-acepta en vez de dejar dos pendientes.
--  - A elimina la amistad con B.
do $verif$
declare
  uA uuid := gen_random_uuid();
  uB uuid := gen_random_uuid();
  uC uuid := gen_random_uuid();
  v_ok boolean := true;
  v_out jsonb := '{}'::jsonb;
  v_amistad amistades;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (uA, 'zz-amigo-a@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uB, 'zz-amigo-b@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (uC, 'zz-amigo-c@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  update perfiles set nombre = 'ZZBuscameAmigo' where id = uB;

  perform set_config('request.jwt.claims', json_build_object('sub', uA::text)::text, true);
  v_out := v_out || jsonb_build_object('busqueda', (select jsonb_agg(nombre) from buscar_usuarios_por_nombre('buscameamigo')));
  v_ok := v_ok and (select count(*) from buscar_usuarios_por_nombre('buscameamigo')) = 1;

  v_amistad := enviar_solicitud_amistad(uB);
  v_ok := v_ok and v_amistad.estado = 'pendiente' and v_amistad.solicitado_por = uA;

  begin
    perform enviar_solicitud_amistad(uB);
    v_ok := false; v_out := v_out || jsonb_build_object('duplicado_no_fallo', true);
  exception when others then
    v_out := v_out || jsonb_build_object('duplicado_error', sqlerrm);
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', uB::text)::text, true);
  v_ok := v_ok and (select count(*) from mis_amigos() where estado = 'pendiente' and solicitado_por = uA) = 1;

  perform responder_solicitud_amistad(uA, false);
  v_ok := v_ok and (select count(*) from amistades where least(uA,uB) = usuario_a and greatest(uA,uB) = usuario_b) = 0;

  perform set_config('request.jwt.claims', json_build_object('sub', uA::text)::text, true);
  perform enviar_solicitud_amistad(uB);
  perform set_config('request.jwt.claims', json_build_object('sub', uB::text)::text, true);
  perform responder_solicitud_amistad(uA, true);
  v_ok := v_ok and (select estado from mis_amigos() where amigo_id = uA) = 'aceptada';

  perform set_config('request.jwt.claims', json_build_object('sub', uC::text)::text, true);
  perform enviar_solicitud_amistad(uA);
  perform set_config('request.jwt.claims', json_build_object('sub', uA::text)::text, true);
  v_amistad := enviar_solicitud_amistad(uC);
  v_out := v_out || jsonb_build_object('cruzada_estado', v_amistad.estado);
  v_ok := v_ok and v_amistad.estado = 'aceptada';

  perform eliminar_amigo(uB);
  v_ok := v_ok and (select count(*) from mis_amigos() where amigo_id = uB) = 0;

  raise exception 'RESULTADO_VERIFICACION %', jsonb_build_object('ok', v_ok, 'detalle', v_out)::text;
end;
$verif$;
