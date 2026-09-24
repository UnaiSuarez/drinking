
-- Catálogo global inicial: cervezas, chupitos/licores, cubatas y vinos
-- habituales, con una rareza orientativa (fácil de encontrar = común, poco
-- habitual o de importación = rara/épica). Los admins de cada sala pueden
-- ampliar esto con sus propias bebidas desde la sala permanente.
insert into bebidas_catalogo (sala_id, categoria_id, nombre, rareza)
select null, bt.id, v.nombre, v.rareza
from (values
  -- Cerveza (categoria_id 1)
  ('Cerveza', 'Mahou', 'comun'),
  ('Cerveza', 'Estrella Galicia', 'comun'),
  ('Cerveza', 'Cruzcampo', 'comun'),
  ('Cerveza', 'San Miguel', 'comun'),
  ('Cerveza', 'Ámbar', 'comun'),
  ('Cerveza', 'Alhambra', 'comun'),
  ('Cerveza', 'Amstel', 'comun'),
  ('Cerveza', 'Heineken', 'comun'),
  ('Cerveza', 'Águila', 'comun'),
  ('Cerveza', 'Budweiser', 'rara'),
  ('Cerveza', 'Corona', 'rara'),
  ('Cerveza', 'Guinness', 'rara'),
  ('Cerveza', 'Desperados', 'rara'),
  ('Cerveza', 'Paulaner', 'epica'),
  ('Cerveza', 'Duvel', 'epica'),
  -- Chupito (categoria_id 3)
  ('Chupito', 'Jägermeister', 'comun'),
  ('Chupito', 'Tequila', 'comun'),
  ('Chupito', 'Licor 43', 'comun'),
  ('Chupito', 'Baileys', 'comun'),
  ('Chupito', 'Sambuca', 'rara'),
  ('Chupito', 'Fernet Branca', 'epica'),
  -- Cubata (categoria_id 4)
  ('Cubata', 'Ron con Coca-Cola', 'comun'),
  ('Cubata', 'Gin Tonic', 'comun'),
  ('Cubata', 'Whisky con Coca-Cola', 'comun'),
  ('Cubata', 'Vodka con naranja', 'comun'),
  ('Cubata', 'Jack Daniels', 'comun'),
  ('Cubata', 'Brugal con Coca-Cola', 'comun'),
  ('Cubata', 'Barceló con Coca-Cola', 'comun'),
  ('Cubata', 'Mojito', 'rara'),
  ('Cubata', 'Daiquiri', 'rara'),
  -- Vino (categoria_id 5)
  ('Vino', 'Tinto de verano', 'comun'),
  ('Vino', 'Rioja', 'comun'),
  ('Vino', 'Ribera del Duero', 'comun'),
  ('Vino', 'Cava', 'comun'),
  ('Vino', 'Champagne', 'epica')
) as v(categoria, nombre, rareza)
join bebidas_tipo bt on bt.nombre = v.categoria and bt.sala_id is null
where not exists (
  select 1 from bebidas_catalogo bc
  where bc.sala_id is null and lower(bc.nombre) = lower(v.nombre)
);
