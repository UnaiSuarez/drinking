# Segunda ampliacion de banners

- 14 imagenes nuevas, WebP 1200x400 en `public/banners/`.
- Cuatro comunes (30 chapas): Mesa de billar, Costa serena, Cara B,
  Ruta de montana.
- Tres epicos (220): Jardin lunar, Ciudad abismal, Expreso celeste.
- Dos legendarios (500): Fenix imperial, Reloj de la eternidad.
- Cinco exclusivos, no comprables: Primer juramento (prestigio 1), Guardian
  esmeralda (prestigio 2), Corona de las mareas (prestigio 3), Eclipse real
  (prestigio 4) y Cenit (prestigio 5). Se entregan al ascender de prestigio;
  la migracion tambien contempla los prestigios ya alcanzados.
- Generados con la herramienta integrada de imagenes. Prompts y nombres
  de originales: `scripts/banner-art-collection-2.json`. Conversion
  reproducible: `scripts/prepare-banner-collection-2.mjs <directorio>`.
- Migracion `20260927220758_banners_coleccion_dos.sql` aplicada en produccion.
  Solo amplia catalogo, sin tocar saldos ni recompensas. Total: 34 banners.
- Migracion `20260927224058_banners_prestigio.sql` aplicada en produccion:
  entrega automatica de los cinco banners exclusivos al ascender y concesion
  retroactiva a las cuentas que ya cumplieran el requisito.

## Navegacion

`/banners` muestra propios, gratuitos y exclusivos. Los no exclusivos se
compran en la seccion Banners de `/tienda`, junto a marcos y avatares.
`/tienda/banners` solo redirige a esa seccion para enlaces anteriores.
Usa la misma RPC atomica existente. Tras una compra actualiza el saldo local.
Medallas del perfil y cartas del inventario quedan plegadas inicialmente.
Perfil con un solo avatar y nivel, progreso compacto y prestigio desplegable.
La vitrina continua bajo el titulo y es editable incluso si esta vacia.

## Verificacion

Build, TypeScript y lint de los componentes cambiados correctos. Pruebas
de PostgreSQL desechable: catalogo, compras idempotentes, exclusivos bloqueados,
premios y RLS. Vista movil 390px: desplegables, tienda separada, imagenes sin
roturas y sin desbordamiento horizontal. No se compraron banners reales.
Codigo sin commit ni publicacion en esta entrega.
