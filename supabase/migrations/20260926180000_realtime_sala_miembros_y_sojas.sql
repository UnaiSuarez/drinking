-- Habilita Supabase Realtime para sala_miembros y sojas_registros, que
-- SalaView y la página de bebidas de la sala empiezan a escuchar ahora
-- para actualizarse solas (quién se une, SOJAS registradas). registros,
-- noches y perfiles ya estaban en la publicación (los usa NocheLive desde
-- hace tiempo); esto solo añade las dos que faltaban. Envuelto en DO por si
-- alguna ya estuviera añadida a mano en el dashboard (evita el error "is
-- already member of publication").
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.sala_miembros';
  exception when duplicate_object then
    null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.sojas_registros';
  exception when duplicate_object then
    null;
  end;
end;
$$;
