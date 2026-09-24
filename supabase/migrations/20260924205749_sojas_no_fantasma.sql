create or replace function public.evitar_fantasma_con_sojas()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.noche_id is not null
    and exists (select 1 from public.logros where id = new.logro_id and slug = 'fantasma')
    and exists (
      select 1 from public.sojas_registros
      where noche_id = new.noche_id and usuario_id = new.usuario_id
    )
  then
    return null;
  end if;
  return new;
end;
$$;

create trigger evitar_fantasma_con_sojas
  before insert on public.logros_usuario
  for each row execute function public.evitar_fantasma_con_sojas();
revoke all on function public.evitar_fantasma_con_sojas() from public, anon, authenticated;
