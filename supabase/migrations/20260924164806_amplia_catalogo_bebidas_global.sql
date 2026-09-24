-- Amplía el catálogo global de bebidas concretas (de 35 a 134 entradas) y
-- retira la posibilidad de elegir la rareza al añadir una bebida nueva desde
-- la sala permanente: crear_bebida_catalogo ya no acepta p_rareza, siempre
-- usa 'comun' para las que crea un jugador. Las rarezas superiores solo
-- existen en este catálogo global seleccionado a mano.

-- crear_bebida_catalogo cambia de firma (3 argumentos en vez de 4): hay que
-- retirar la sobrecarga vieja explícitamente o quedarían las dos coexistiendo
-- y ambiguas (ver el fallo de otorgar_logros_lifetime documentado en
-- supabase/README.md).
drop function if exists public.crear_bebida_catalogo(uuid, text, integer, text);

create or replace function public.crear_bebida_catalogo(p_sala uuid, p_nombre text, p_categoria_id integer)
 returns bebidas_catalogo
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_tipo text;
  v_nombre text;
  v_fila public.bebidas_catalogo;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  select coalesce(config->>'tipo', 'normal') into v_tipo from salas where id = p_sala;
  if v_tipo <> 'permanente' then
    raise exception 'Solo se pueden añadir bebidas concretas en una sala permanente';
  end if;

  v_nombre := trim(coalesce(p_nombre, ''));
  if v_nombre = '' then
    raise exception 'Ponle un nombre a la bebida';
  end if;

  if not exists (
    select 1 from bebidas_tipo where id = p_categoria_id and (sala_id is null or sala_id = p_sala)
  ) then
    raise exception 'Categoría no válida para esta sala';
  end if;

  select * into v_fila from bebidas_catalogo
  where coalesce(sala_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_sala, '00000000-0000-0000-0000-000000000000'::uuid)
    and lower(nombre) = lower(v_nombre)
  limit 1;
  if found then
    return v_fila;
  end if;

  select * into v_fila from bebidas_catalogo
  where sala_id is null and lower(nombre) = lower(v_nombre)
  limit 1;
  if found then
    return v_fila;
  end if;

  insert into bebidas_catalogo (sala_id, categoria_id, nombre, rareza, creado_por)
  values (p_sala, p_categoria_id, v_nombre, 'comun', auth.uid())
  returning * into v_fila;

  return v_fila;
end;
$function$;

-- Catálogo global ampliado. Idéntico patrón que el seed inicial: idempotente
-- (no duplica lo que ya exista) y con rareza orientativa. Kalimotxo y Shot
-- especial ya existían como categorías (bebidas_tipo) sin bebidas concretas
-- en el catálogo global; aquí se les añaden las suyas.
insert into bebidas_catalogo (sala_id, categoria_id, nombre, rareza)
select null, bt.id, v.nombre, v.rareza
from (values
  -- Cerveza (categoria_id 1)
  ('Cerveza', '1906', 'comun'),
  ('Cerveza', 'Alhambra Reserva 1925', 'comun'),
  ('Cerveza', 'Amstel Radler', 'comun'),
  ('Cerveza', 'Cruzcampo 1900', 'comun'),
  ('Cerveza', 'Cruzcampo Gran Reserva', 'comun'),
  ('Cerveza', 'Estrella Damm', 'comun'),
  ('Cerveza', 'Free Damm', 'comun'),
  ('Cerveza', 'Keler', 'comun'),
  ('Cerveza', 'Mahou Cinco Estrellas', 'comun'),
  ('Cerveza', 'Mahou Clásica', 'comun'),
  ('Cerveza', 'Skol', 'comun'),
  ('Cerveza', 'Turia', 'comun'),
  ('Cerveza', 'Voll-Damm', 'comun'),
  ('Cerveza', 'Xibeca', 'comun'),
  ('Cerveza', 'Erdinger', 'rara'),
  ('Cerveza', 'Franziskaner', 'rara'),
  ('Cerveza', 'Grimbergen', 'rara'),
  ('Cerveza', 'Hoegaarden', 'rara'),
  ('Cerveza', 'Leffe', 'rara'),
  ('Cerveza', 'Modelo', 'rara'),
  ('Cerveza', 'Peroni', 'rara'),
  ('Cerveza', 'Pilsner Urquell', 'rara'),
  ('Cerveza', 'Sol', 'rara'),
  ('Cerveza', 'Stella Artois', 'rara'),
  ('Cerveza', 'BrewDog Punk IPA', 'epica'),
  ('Cerveza', 'Chimay', 'epica'),
  ('Cerveza', 'Delirium Tremens', 'epica'),
  ('Cerveza', 'La Chouffe', 'epica'),
  ('Cerveza', 'Mikkeller', 'epica'),
  ('Cerveza', 'Westmalle', 'epica'),
  ('Cerveza', 'Cantillon', 'legendaria'),
  ('Cerveza', 'Pliny the Elder', 'legendaria'),
  ('Cerveza', 'Westvleteren 12', 'legendaria'),
  -- Chupito (categoria_id 3)
  ('Chupito', 'Amaretto', 'comun'),
  ('Chupito', 'Cazalla', 'comun'),
  ('Chupito', 'Ginebra (chupito)', 'comun'),
  ('Chupito', 'Orujo', 'comun'),
  ('Chupito', 'Pacharán', 'comun'),
  ('Chupito', 'Ron Miel', 'comun'),
  ('Chupito', 'Southern Comfort', 'comun'),
  ('Chupito', 'Vodka (chupito)', 'comun'),
  ('Chupito', 'Chartreuse Verde', 'rara'),
  ('Chupito', 'Galliano', 'rara'),
  ('Chupito', 'Jägermeister Manzana', 'rara'),
  ('Chupito', 'Malibu (chupito)', 'rara'),
  ('Chupito', 'Underberg', 'rara'),
  ('Chupito', 'Absenta', 'epica'),
  ('Chupito', 'Becherovka', 'epica'),
  ('Chupito', 'Chartreuse Amarillo', 'epica'),
  ('Chupito', 'Mezcal', 'epica'),
  ('Chupito', 'Chartreuse V.E.P.', 'legendaria'),
  -- Cubata (categoria_id 4)
  ('Cubata', 'Absolut con naranja', 'comun'),
  ('Cubata', 'Bacardi con Coca-Cola', 'comun'),
  ('Cubata', 'Ballantine''s con Coca-Cola', 'comun'),
  ('Cubata', 'Beefeater con tónica', 'comun'),
  ('Cubata', 'Cacique con Coca-Cola', 'comun'),
  ('Cubata', 'Havana Club con Coca-Cola', 'comun'),
  ('Cubata', 'Larios con limón', 'comun'),
  ('Cubata', 'Malibu con piña', 'comun'),
  ('Cubata', 'Ron Negrita con Coca-Cola', 'comun'),
  ('Cubata', 'Smirnoff con limón', 'comun'),
  ('Cubata', 'Bloody Mary', 'rara'),
  ('Cubata', 'Caipirinha', 'rara'),
  ('Cubata', 'Cosmopolitan', 'rara'),
  ('Cubata', 'Margarita', 'rara'),
  ('Cubata', 'Piña Colada', 'rara'),
  ('Cubata', 'Tom Collins', 'rara'),
  ('Cubata', 'Dry Martini', 'epica'),
  ('Cubata', 'Espresso Martini', 'epica'),
  ('Cubata', 'Manhattan', 'epica'),
  ('Cubata', 'Negroni', 'epica'),
  ('Cubata', 'Old Fashioned', 'epica'),
  ('Cubata', 'Aviation', 'legendaria'),
  ('Cubata', 'Sazerac', 'legendaria'),
  -- Vino (categoria_id 5)
  ('Vino', 'Albariño', 'comun'),
  ('Vino', 'Mencía', 'comun'),
  ('Vino', 'Rueda', 'comun'),
  ('Vino', 'Tempranillo', 'comun'),
  ('Vino', 'Verdejo', 'comun'),
  ('Vino', 'Vino blanco de mesa', 'comun'),
  ('Vino', 'Vino tinto joven', 'comun'),
  ('Vino', 'Godello', 'rara'),
  ('Vino', 'Jerez fino', 'rara'),
  ('Vino', 'Priorato', 'rara'),
  ('Vino', 'Somontano', 'rara'),
  ('Vino', 'Pedro Ximénez añejo', 'epica'),
  ('Vino', 'Pingus', 'epica'),
  ('Vino', 'Vega Sicilia', 'epica'),
  ('Vino', 'Château Pétrus', 'legendaria'),
  ('Vino', 'Romanée-Conti', 'legendaria'),
  -- Kalimotxo (categoria_id 6)
  ('Kalimotxo', 'Kalimotxo', 'comun'),
  ('Kalimotxo', 'Kalimotxo con limón', 'comun'),
  ('Kalimotxo', 'Rabioso', 'rara'),
  -- Shot especial (categoria_id 7)
  ('Shot especial', 'B-52', 'comun'),
  ('Shot especial', 'Chupito de gominola', 'comun'),
  ('Shot especial', 'Alabama Slammer', 'rara'),
  ('Shot especial', 'Kamikaze', 'rara'),
  ('Shot especial', 'Chupito de fuego', 'epica'),
  ('Shot especial', 'Mind Eraser', 'epica')
) as v(categoria, nombre, rareza)
join bebidas_tipo bt on bt.nombre = v.categoria and bt.sala_id is null
where not exists (
  select 1 from bebidas_catalogo bc
  where bc.sala_id is null and lower(bc.nombre) = lower(v.nombre)
);
