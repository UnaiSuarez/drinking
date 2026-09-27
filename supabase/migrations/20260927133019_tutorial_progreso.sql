-- Applied with the matching production migration version.
create table public.tutorial_progreso (
  usuario_id uuid primary key references public.perfiles(id) on delete cascade,
  paso text not null default 'bienvenida' check (char_length(paso) between 1 and 80),
  vistos text[] not null default '{}' check (cardinality(vistos) <= 100),
  estado text not null default 'en_curso' check (estado in ('en_curso', 'pausado', 'completado')),
  actualizado_at timestamptz not null default now()
);

alter table public.tutorial_progreso enable row level security;
revoke all on public.tutorial_progreso from anon, authenticated;
grant select, insert, update on public.tutorial_progreso to authenticated;
create policy "Leer mi tutorial" on public.tutorial_progreso for select to authenticated
  using ((select auth.uid()) = usuario_id);
create policy "Crear mi tutorial" on public.tutorial_progreso for insert to authenticated
  with check ((select auth.uid()) = usuario_id);
create policy "Guardar mi tutorial" on public.tutorial_progreso for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

comment on table public.tutorial_progreso is 'Guia inicial por cuenta. Sin fila: mostrar bienvenida, tambien a usuarios existentes. No otorga premios.';
