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
