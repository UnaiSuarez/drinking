# Arte de personajes, skins y momentos históricos

Para activar arte nuevo basta con copiar los archivos aquí y (solo para skins y
momentos) añadir **una línea** en `SKINS_PERSONAJES` de `src/lib/tienda.ts`.

## Personaje secreto — cuerpo completo
`public/personajes/<personaje-id>/completo.webp`

La ficha (`/personaje/<id>`) detecta el archivo sola: si existe, muestra el
cuerpo completo; si no, el retrato actual entero y sin recorte.

Ids de personaje: `ultimo-ronda` (Antonio), `jefe-after` (Denys),
`narrador-noche` (Ramón), `silencioso-letal` (Alejandro), `guardian-cubata` (Unai).

## Skin normal (tiene rareza, no lleva relato)
- `public/personajes/<personaje-id>/skins/<skin-id>.webp` — avatar cuadrado (el que se equipa en el perfil)
- `public/personajes/<personaje-id>/skins/<skin-id>-completo.webp` — cuerpo completo

```ts
skinNormal({ id: "militar", personajeId: "narrador-noche", nombre: "Militar", rareza: "epica" }),
```

## Momento histórico (día real; la historia la aporta el grupo)
Mismos dos archivos que una skin normal.

```ts
momentoHistorico({
  id: "noche-riga", personajeId: "narrador-noche", nombre: "Noche de Riga",
  fecha: "14 de agosto de 2025",
  historia: "…relato real aportado por el grupo…", // opcional: si falta, la ficha dice "pendiente"
}),
```

## Cómo se consiguen
Solo en cofres y **solo con el personaje ya desbloqueado**. Entran al sorteo
automáticamente en cuanto existan en `SKINS_PERSONAJES`; sin skins el reparto de
los cofres no cambia. Los momentos son `legendaria` por defecto.

## Ranuras reservadas (2 comunes + 2 épicas + 1 legendaria por personaje)
Cada personaje secreto tiene 5 skins normales. La legendaria ya existe; las
otras 4 están reservadas en `SKINS_PERSONAJES` con `pendiente: true`
(ids `<personaje>-comun-1`, `-comun-2`, `-epica-1`, `-epica-2`).

Para activar una:
1. Copia `<skin-id>.webp` y `<skin-id>-completo.webp` en `public/personajes/<personaje-id>/skins/`.
2. En `src/lib/tienda.ts` borra `pendiente: true` de esa línea (y cambia `nombre`; si cambias `id`, usa el mismo en los nombres de archivo).
3. Comprueba con `npm run skins:arte`.

Mientras sea `pendiente` no aparece en cofres, tienda, inventario ni fichas.

## Precio y obtención
- **Skins normales:** se pueden comprar en la tienda (común 100 · épica 300 · legendaria 600 chapas) y también salen en cofres. Solo con el personaje ya desbloqueado.
- **Momentos históricos:** no se compran, solo salen en cofres.
