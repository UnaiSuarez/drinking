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
| `20260924120000` | `registrar_bebida_suelta_compatible` | **Aplicada el 24/09/2026 (12:27 UTC).** Respuesta compatible con clientes anteriores y posteriores al PR #15. |
| `20260924120100` | `otorgar_logros_lifetime_correccion` | **Aplicada el 24/09/2026 (12:27 UTC).** Corrige el fallo que hacía fallar todo registro de bebida suelta, retira el permiso a los roles de la API y serializa por usuario. |
| `20260924120200` | `avisos_push_verificados` | **Aplicada el 24/09/2026 (12:28 UTC).** Tabla `avisos_push` y las funciones que verifican y reclaman los avisos push. |
| `20260924130000` | `cron_cierre_noches_tablas_temporales` | **Aplicada el 24/09/2026 (16:34 UTC).** Corrige el cierre automático de noches; ver «Cierre automático de noches» más abajo. |

Las siete primeras conservan en el historial de Supabase la versión de su fichero y el
contenido idéntico byte a byte (mismo md5). Las tres últimas se aplicaron con
`apply_migration`, que registra la hora de aplicación como versión
(`20260924122703`, `…122732`, `…122759`); se renombraron esas tres filas del
historial a la versión de su fichero para que `supabase migration list` las
reconozca. No se editan una vez aplicadas: el historial es lo que ocurrió; las
correcciones van en migraciones nuevas.

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

## Avisos push: un solo intento

`reclamar_aviso_logro` y `reclamar_aviso_noche_activada` **reclaman** el aviso
(fila en `avisos_push`, clave única) antes de que el servidor intente enviar el
push: es un mecanismo *como máximo una vez*. Si el aviso se reclama y el envío
falla (VAPID sin configurar, suscripción caducada, error del servicio push,
caída del servidor entre la reclamación y el envío), **no hay reintento**: la
fila ya existe, cualquier llamada posterior recibe 0 filas y no se vuelve a
enviar. Es deliberado, para no duplicar avisos, y hay una segunda limitación:
las funciones solo aceptan hechos recientes (logros de menos de 5 minutos,
activación de menos de 10), así que un aviso perdido tampoco se puede recuperar
pasada esa ventana.

Reintentar exigiría guardar el estado de entrega (por ejemplo `enviado_at` e
intentos) y reclamar en dos fases: reservar, enviar y confirmar, liberando la
reserva si el envío falla. No forma parte de este arreglo.

## Cierre automático de noches

El trabajo `cerrar-noches-24h` (pg_cron, cada 10 minutos) ejecuta
`cron_forzar_cierre_noches()`: borra pendientes de más de 24 h, pasa a
«cerrando» las activas vencidas y finaliza las que llevan 24 h en «cerrando».

Desde el 10/07/2026 08:20 UTC falló en **todas** las ejecuciones con
`relation "tmp_cartas_activas" already exists`, porque `finalizar_noche` crea
tablas temporales `on commit drop` y el cron la llamaba varias veces en la misma
transacción. El error deshacía la ejecución entera, así que ninguna noche se
cerraba sola (ni se borraban pendientes viejas ni pasaban a «cerrando» las
activas vencidas). El cierre manual desde la app (una llamada a
`finalizar_noche` por transacción) no debería verse afectado, y consta al menos
una noche cerrada después de esa fecha (29/08). La migración `20260924130000`
lo corrige sin tocar `finalizar_noche`: antes de finalizar cada noche elimina,
por nombre, las cinco tablas temporales que esa función crea
(`tmp_cartas_activas`, `tmp_personaje_equipado`, `tmp_registro_puntos`,
`tmp_bono_cartas_flat`, `tmp_liga_antes`). Si `finalizar_noche` cambia y crea otra
tabla temporal, hay que añadirla a esa lista. `tests/cron_cierre_noches.sql` lo
prueba.

**Los fallos siguen siendo visibles:** si `finalizar_noche` falla por otra causa,
el error se propaga y la ejecución queda en `failed` en `cron.job_run_details`.
Limitación conocida: no hay aislamiento por noche, así que una noche defectuosa
vuelve a bloquear el cierre de las demás mientras no se corrija. Aislarlas
exigiría un registro persistente y observable de los fallos individuales (no
basta con capturar el error y dejar un WARNING, porque el trabajo pasaría a
`succeeded` y el fallo quedaría oculto); queda como mejora posterior.

Para detectar noches atascadas o vencidas sin cerrar:

```sql
select id, estado, fin_gracia, fin_programado from noches
where (estado = 'cerrando' and fin_gracia <= now() - interval '25 hours')
   or (estado = 'activa' and fin_programado <= now() - interval '25 hours');
```

**Aplicada y verificada el 24/09/2026 16:34 UTC.** Tras aplicar la migración se
invocó `cron_forzar_cierre_noches()` una vez de forma manual (no hacía falta
esperar a la siguiente pasada de pg_cron) para limpiar el atasco acumulado
desde julio, en la sala de pruebas «Prueba»: las 3 noches en «cerrando» desde
el 07/07 pasaron a `cerrada` (sin efecto, 0 jugadores); la «activa» del 10/07
pasó a `cerrando` con `fin_gracia` = 24/09 16:40 UTC y se finalizará sola 24h
después de esa hora. La consulta de arriba devuelve 0 filas justo después.

## Pruebas SQL

`supabase/tests/*.sql` son pruebas que se pegan en el editor SQL. Cada una
termina siempre con un error `RESULTADO_VERIFICACION {...}`, de modo que se
deshace por completo y no deja datos. No forman parte de las migraciones.
La del cron se aísla de las noches reales con una copia temporal de `noches`
(ver su cabecera), así que no actualiza ni bloquea ninguna fila real.

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
