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
Las skins normales se compran o salen en cofres, siempre con el personaje
desbloqueado. Los momentos históricos solo salen en cofres y son `legendaria`
por defecto.

## Colección actual
Cada personaje secreto tiene 5 skins normales: 2 comunes, 2 épicas y
1 legendaria. Todas tienen retrato cuadrado y arte de cuerpo completo.
Las variantes de 2026-09-28 proceden de `scripts/prepare-character-skins.mjs`,
que prepara ambos formatos desde cada ilustración original.

Comprueba archivos y catálogo con `npm run skins:arte`. Las futuras skins
marcadas como `pendiente` seguirán ocultas hasta tener ambas imágenes.

## Precio y obtención
- **Skins normales:** se pueden comprar en la tienda (común 100 · épica 300 · legendaria 600 chapas) y también salen en cofres. Solo con el personaje ya desbloqueado.
- **Momentos históricos:** no se compran, solo salen en cofres.
