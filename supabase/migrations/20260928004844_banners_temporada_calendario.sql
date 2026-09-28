-- Banners de temporada (calendario): Halloween, Navidad, Verano. Fechas
-- fijas de calendario, iguales para todas las salas, NO relacionadas con
-- las "temporadas" de liga que ya existen por sala (TemporadasSalaControl).
-- Se ganan gratis por participar: basta con registrar algo (una bebida
-- suelta, de momento) durante la ventana de fechas. Mismo cálculo de
-- ventanas que src/lib/temporadaCosmetica.ts — si cambian las fechas ahí,
-- hay que replicarlo aquí también.
--
-- Reutiliza el 100% del sistema de banners ya existente (banners_catalogo /
-- banners_usuario / banner_equipado): solo añade tres filas de catálogo y
-- una función que las concede. Las imágenes (BANNER_IMAGES en
-- src/lib/banners.ts) son rutas placeholder a /banners/*.webp que todavía
-- no existen — se generan aparte, esto deja el resto del camino hecho.

insert into public.banners_catalogo (id, nombre, rareza, precio, exclusivo)
values
  ('noche-de-brujas', 'Noche de brujas', 'exclusiva', 0, true),
  ('luces-de-navidad', 'Luces de Navidad', 'exclusiva', 0, true),
  ('chiringuito-de-verano', 'Chiringuito de verano', 'exclusiva', 0, true)
on conflict (id) do nothing;

create or replace function public.otorgar_banner_temporada()
returns text -- el banner_id concedido, o null si no hay temporada activa o ya lo tenía
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mes int := extract(month from (now() at time zone 'utc'))::int;
  v_dia int := extract(day from (now() at time zone 'utc'))::int;
  v_banner text;
begin
  if auth.uid() is null then
    return null;
  end if;

  -- Mismos rangos que BANNER_POR_TEMPORADA en temporadaCosmetica.ts.
  if (v_mes = 10 and v_dia >= 20) or (v_mes = 11 and v_dia <= 2) then
    v_banner := 'noche-de-brujas';
  elsif (v_mes = 12 and v_dia >= 15) or (v_mes = 1 and v_dia <= 6) then
    v_banner := 'luces-de-navidad';
  elsif (v_mes > 6 or (v_mes = 6 and v_dia >= 21)) and (v_mes < 9 or (v_mes = 9 and v_dia <= 21)) then
    v_banner := 'chiringuito-de-verano';
  else
    return null;
  end if;

  insert into banners_usuario (usuario_id, banner_id)
  values (auth.uid(), v_banner)
  on conflict (usuario_id, banner_id) do nothing;

  if not found then
    return null;
  end if;
  return v_banner;
end;
$function$;
