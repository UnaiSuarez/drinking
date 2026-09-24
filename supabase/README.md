# Migraciones de la base de datos (Supabase)

El proyecto de Supabase es `el-ranking`. Hasta el PR #15 **ninguna** migración
estaba en este repositorio: los cambios de esquema se aplicaban directamente
en Supabase y solo quedaban en su historial (`supabase_migrations.schema_migrations`).
Esta carpeta empieza a corregirlo, sin secretos y sin datos personales.

## Qué contiene

| Versión | Fichero | Estado en producción |
|---|---|---|
| `20260924112236` | `bebidas_catalogo_con_rareza` | Ya aplicada. Copia **idéntica byte a byte** (mismo md5) a lo registrado en el historial de Supabase. Tabla `bebidas_catalogo`, columna `registros.bebida_catalogo_id`, vista `registros_sala`, política de lectura y `crear_bebida_catalogo`. |
| `20260924112310` | `logros_lifetime_bebidas_sueltas` | Ya aplicada, idéntica. Logros nuevos y las funciones `otorgar_logros_lifetime`, `registrar_bebida_suelta` y `anular_bebida_suelta`. **Contiene el fallo corregido por `20260924120100`.** |
| `20260924112446` | `seed_bebidas_catalogo_global` | Ya aplicada, idéntica. Catálogo inicial (35 bebidas). Es idempotente: no vuelve a insertar las que ya existen. |
| `20260924113054` | `elimina_overload_viejo_registrar_bebida_suelta` | Ya aplicada, idéntica. |
| `20260924120000` | `registrar_bebida_suelta_compatible` | **Nueva, sin aplicar.** Respuesta compatible con clientes anteriores y posteriores al PR #15. |
| `20260924120100` | `otorgar_logros_lifetime_correccion` | **Nueva, sin aplicar.** Corrige el fallo que hace fallar todo registro de bebida suelta, retira el permiso a los roles de la API y serializa por usuario. |
| `20260924120200` | `avisos_push_verificados` | **Nueva, sin aplicar.** Tabla `avisos_push` y las funciones que verifican y reclaman los avisos push. |

Las cuatro primeras conservan la versión con la que se aplicaron para que
`supabase migration list` las reconozca como ya aplicadas. No se editan: el
historial es lo que ocurrió; las correcciones van en migraciones nuevas.

## Cómo aplicar

Sobre una base en el estado anterior al PR #15 (última migración
`20260829135633_sala_permanente_bebidas_sueltas`), aplicar en orden de versión.
Cada una es idempotente por sí sola (`create ... if not exists`,
`create or replace`, `insert ... where not exists`, `drop ... if exists`), de
modo que repetir la secuencia completa, siempre en orden de versión, deja la
misma base. El catálogo inicial no se duplica al reaplicarlo.
Entre la segunda y la cuarta hay un intervalo en el que coexisten dos
sobrecargas de `registrar_bebida_suelta`; aplicarlas seguidas, sin exponer la
base a clientes entre medias.

## Lo que todavía no está en el repositorio

Todo lo anterior a `20260924112236` (esquema base, ligas, logros, cartas,
salas permanentes…) sigue existiendo solo en el historial de Supabase. Para
poder reconstruir la base desde cero hace falta volcar ese historial a esta
carpeta (`supabase db pull` o exportar las sentencias de
`supabase_migrations.schema_migrations`).

## Retirada de la compatibilidad con clientes anteriores al PR #15

`registrar_bebida_suelta` devuelve las columnas de la fila de `registros` en el
primer nivel (`id`, `ts`, …) **y** dentro de `registro`. La parte de primer
nivel solo existe para los clientes anteriores al PR #15 (pestañas ya abiertas,
PWA con el bundle antiguo en caché). Cuando ya no queden, se retira con una
migración que sustituya `to_jsonb(v_registro) || jsonb_build_object(...)` por
`jsonb_build_object(...)`.
