-- One permanent cosmetic for each of the first five prestige cycles.
create function public.entregar_banner_prestigio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_banner text;
begin
  v_banner := case new.ciclo
    when 1 then 'primer-juramento'
    when 2 then 'guardian-esmeralda'
    when 3 then 'corona-mareas'
    when 4 then 'eclipse-real'
    when 5 then 'cenit'
    else null
  end;
  if v_banner is not null then
    insert into public.banners_usuario(usuario_id, banner_id)
    values (new.usuario_id, v_banner) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.entregar_banner_prestigio() from public, anon, authenticated;
create trigger prestigio_banner_exclusivo after insert on public.prestigios
for each row execute function public.entregar_banner_prestigio();

-- Already-earned cycles receive the same cosmetic, without changing XP or stock.
insert into public.banners_usuario(usuario_id, banner_id)
select usuario_id, case ciclo
  when 1 then 'primer-juramento'
  when 2 then 'guardian-esmeralda'
  when 3 then 'corona-mareas'
  when 4 then 'eclipse-real'
  when 5 then 'cenit'
end
from public.prestigios where ciclo between 1 and 5
on conflict do nothing;
