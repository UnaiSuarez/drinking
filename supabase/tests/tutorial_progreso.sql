-- Test-only users and rollback: no persistent changes to any account.
begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  denied boolean;
  affected integer;
begin
  insert into auth.users(id, email, raw_user_meta_data) values
    (a, 'tutorial-test-' || a || '@example.invalid', '{}'::jsonb),
    (b, 'tutorial-test-' || b || '@example.invalid', '{}'::jsonb);
  insert into public.tutorial_progreso(usuario_id) values (b);
  perform set_config('request.jwt.claim.sub', a::text, true);
  execute 'set local role authenticated';
  assert (select count(*) = 0 from public.tutorial_progreso), 'Other progress must be private';
  insert into public.tutorial_progreso(usuario_id, paso, estado) values (a, 'salas', 'pausado');
  update public.tutorial_progreso set paso = 'final', vistos = array['bienvenida', 'salas'], estado = 'completado' where usuario_id = a;
  assert (select paso = 'final' and estado = 'completado' and cardinality(vistos) = 2 from public.tutorial_progreso where usuario_id = a);
  update public.tutorial_progreso set paso = 'salas' where usuario_id = b;
  get diagnostics affected = row_count;
  assert affected = 0, 'Cannot update another account';
  denied := false;
  begin
    update public.tutorial_progreso set usuario_id = gen_random_uuid() where usuario_id = a;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'Cannot transfer progress to another account';
  denied := false;
  begin
    insert into public.tutorial_progreso(usuario_id) values(gen_random_uuid());
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'Cannot insert progress for another account';
  assert not has_table_privilege('authenticated', 'public.tutorial_progreso', 'DELETE');
  execute 'reset role';
  execute 'set local role anon';
  denied := false;
  begin
    perform 1 from public.tutorial_progreso;
  exception when insufficient_privilege then denied := true;
  end;
  assert denied, 'Anonymous access denied';
  execute 'reset role';
end;
$$;
rollback;
