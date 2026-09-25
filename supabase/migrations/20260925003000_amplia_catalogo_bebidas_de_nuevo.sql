-- Segunda ampliación del catálogo global de bebidas concretas (de 134 a
-- 195 entradas). Se centra sobre todo en "Pinta", la única categoría que
-- se había quedado sin ninguna bebida concreta desde que existe, y refuerza
-- Kalimotxo y Shot especial (las más flojas), además de sumar más variedad
-- en el resto. Mismo criterio de rareza de siempre: fácil de encontrar =
-- común, poco habitual o de importación = rara/épica, casi de broma o muy
-- especial = legendaria.
insert into bebidas_catalogo (sala_id, categoria_id, nombre, rareza)
select null, bt.id, v.nombre, v.rareza
from (values
  -- Pinta (categoria_id 2) — no tenía ninguna bebida concreta todavía
  ('Pinta', 'Pinta rubia', 'comun'),
  ('Pinta', 'Pinta negra', 'comun'),
  ('Pinta', 'Pinta de trigo', 'comun'),
  ('Pinta', 'Pinta de sidra', 'comun'),
  ('Pinta', 'Media pinta', 'comun'),
  ('Pinta', 'Pinta IPA', 'rara'),
  ('Pinta', 'Pinta artesana', 'rara'),
  ('Pinta', 'Pinta Guinness Draught', 'rara'),
  ('Pinta', 'Boilermaker', 'epica'),
  ('Pinta', 'Yard of Ale', 'legendaria'),
  -- Cerveza (categoria_id 1)
  ('Cerveza', 'Estrella Levante', 'comun'),
  ('Cerveza', 'Victoria', 'comun'),
  ('Cerveza', 'Newcastle Brown Ale', 'rara'),
  ('Cerveza', 'Anchor Steam', 'rara'),
  ('Cerveza', 'Schneider Weisse', 'rara'),
  ('Cerveza', 'Fuller''s London Pride', 'rara'),
  ('Cerveza', 'Lagunitas IPA', 'epica'),
  ('Cerveza', 'Founders All Day IPA', 'epica'),
  ('Cerveza', 'Rothaus Tannenzäpfle', 'epica'),
  ('Cerveza', 'Trappistes Rochefort 10', 'legendaria'),
  -- Chupito (categoria_id 3)
  ('Chupito', 'Anís', 'comun'),
  ('Chupito', 'Chinchón', 'comun'),
  ('Chupito', 'Ratafía', 'comun'),
  ('Chupito', 'Grappa', 'rara'),
  ('Chupito', 'Ouzo', 'rara'),
  ('Chupito', 'Herbero', 'rara'),
  ('Chupito', 'Aquavit', 'epica'),
  ('Chupito', 'Slivovitz', 'epica'),
  -- Cubata (categoria_id 4)
  ('Cubata', 'Moscow Mule', 'comun'),
  ('Cubata', 'Paloma', 'comun'),
  ('Cubata', 'White Russian', 'comun'),
  ('Cubata', 'Black Russian', 'comun'),
  ('Cubata', 'Sex on the Beach', 'comun'),
  ('Cubata', 'Aperol Spritz', 'rara'),
  ('Cubata', 'Hugo Spritz', 'rara'),
  ('Cubata', 'Whisky Sour', 'rara'),
  ('Cubata', 'Kir Royal', 'rara'),
  ('Cubata', 'Long Island Iced Tea', 'epica'),
  ('Cubata', 'Mai Tai', 'epica'),
  ('Cubata', 'French 75', 'epica'),
  -- Vino (categoria_id 5)
  ('Vino', 'Garnacha', 'comun'),
  ('Vino', 'Toro', 'comun'),
  ('Vino', 'Jumilla', 'comun'),
  ('Vino', 'Cariñena', 'comun'),
  ('Vino', 'Txakoli', 'rara'),
  ('Vino', 'Sauvignon Blanc', 'rara'),
  ('Vino', 'Malbec', 'rara'),
  ('Vino', 'Syrah', 'rara'),
  -- Kalimotxo (categoria_id 6)
  ('Kalimotxo', 'Kalimotxo con naranja', 'comun'),
  ('Kalimotxo', 'Sangría', 'comun'),
  ('Kalimotxo', 'Rebujito', 'comun'),
  ('Kalimotxo', 'Sangría de cava', 'rara'),
  ('Kalimotxo', 'Zurracapote', 'rara'),
  -- Shot especial (categoria_id 7)
  ('Shot especial', 'Green Tea Shot', 'comun'),
  ('Shot especial', 'Lemon Drop', 'comun'),
  ('Shot especial', 'Tequila Sunrise Shot', 'comun'),
  ('Shot especial', 'Buttery Nipple', 'rara'),
  ('Shot especial', 'Duck Fart', 'rara'),
  ('Shot especial', 'Irish Car Bomb', 'rara'),
  ('Shot especial', 'Surfer on Acid', 'epica'),
  ('Shot especial', 'Flaming Dr Pepper', 'legendaria')
) as v(categoria, nombre, rareza)
join bebidas_tipo bt on bt.nombre = v.categoria and bt.sala_id is null
where not exists (
  select 1 from bebidas_catalogo bc
  where bc.sala_id is null and lower(bc.nombre) = lower(v.nombre)
);
