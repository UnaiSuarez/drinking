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
| `20260924164806` | `amplia_catalogo_bebidas_global` | **Aplicada el 24/09/2026 (16:48 UTC).** Amplía el catálogo global de bebidas concretas de 35 a 134 entradas y retira la rareza elegible al crear una bebida nueva; ver «Catálogo ampliado y rareza fija al añadir» más abajo. |
| `20260924173746` | `documenta_finalizar_noche` | **Aplicada el 24/09/2026 (17:43 UTC).** Trae `finalizar_noche` al repositorio por primera vez, sin cambiar su comportamiento; ver «Cuatro cartas que ya funcionaban sin estar documentadas» más abajo. |
| `20260924215656` | `nombre_usuario_unico` | **Aplicada el 24/09/2026 (21:58 UTC).** `perfiles.nombre` pasa a ser único (case-insensitive) y editable; ver «Nombre de usuario único» más abajo. |
| `20260924221823` | `sistema_amigos` | **Aplicada el 24/09/2026 (22:19 UTC).** Tabla `amistades` y las funciones para buscar usuarios, enviar/responder solicitudes y listar amigos; ver «Sistema de amigos» más abajo. |
| `20260924224400` | `mapa_de_sitios` | **Aplicada el 24/09/2026 (22:44 UTC).** Tabla `sitios` y `registros.sitio_id`, solo para sala permanente; ver «Mapa de sitios» más abajo. |
| `20260924224811` | `hotfix_trigger_sala_archivada` | **Aplicada el 24/09/2026 (22:48 UTC).** Corrige `rechazar_escritura_sala_archivada` (PR #21), que rompía crear una sala y crear una noche en toda la producción; ver «Hotfix: crear sala y crear noche rotos» más abajo. |
| `20260924232000` | `borrar_registro_bebida_suelta` | **Aplicada el 24/09/2026 (23:09 UTC).** Nueva RPC para borrar un registro de bebida suelta (propio, o de cualquiera si eres admin/fundador), sin el límite de 30s de `anular_bebida_suelta`; ver «Bebidas de la sala: listado y borrado» más abajo. |
| `20260924233500` | `sitios_icono_y_borrado` | **Aplicada el 24/09/2026 (23:11 UTC).** `sitios.icono`, `crear_sitio` acepta icono, `eliminar_sitio` (solo quien lo descubrió) y `mis_sitios_mapa` expone icono y descubridor; ver «Mapa de sitios» más abajo. |
| `20260924235000` | `ranking_bebidas_sala` | **Aplicada el 24/09/2026 (23:32 UTC).** Nueva RPC para el ranking de `/sala/[id]/registros`, que deja de tener que cargar todo el historial solo para sumarlo; ver «Bebidas de la sala: listado y borrado» más abajo. |

Las siete primeras conservan en el historial de Supabase la versión de su fichero y el
contenido idéntico byte a byte (mismo md5). El resto se aplicaron con
`apply_migration`, que registra la hora de aplicación como versión propia;
todas menos `20260924173746` se renombraron en el historial a la versión de
su fichero para que `supabase migration list` las reconozca —
`20260924164806` ya coincidía, sin necesidad de renombrar. `20260924173746`
es la excepción: su `CREATE OR REPLACE FUNCTION` no coincide al carácter con
lo que ya había en producción (algún detalle de espaciado o codificación al
transcribirla desde `pg_get_functiondef`, ver más abajo), así que no es una
copia byte a byte como las siete primeras, aunque sí se verificó que el
comportamiento no cambia. No se editan una vez aplicadas: el historial es lo
que ocurrió; las correcciones van en migraciones nuevas.

Nota sobre el historial de producción y este repositorio: el PR #21
(`codex/perfil-vistas`) se fusionó con sus migraciones ya como ficheros
(`20260924173254_sojas_registros_y_medallas`, `20260924203603_archivar_salas`,
`20260924205749_sojas_no_fantasma`, `20260924215901_perfil_estadisticas_y_borrado_salas`,
`20260924222312_estadisticas_perfil_detalladas`). Entre `20260924222312` y
`20260924224400` se aplicó en producción, desde la otra sesión, una
corrección de este mismo trigger (`corrige_trigger_salas_archivadas`) que
nunca llegó a convertirse en fichero de este repositorio: `20260924224811`
la sustituye por completo (mismo problema, arreglo independiente) y es la
que queda vigente. El historial de Supabase conserva esa versión intermedia
aunque no tenga fichero — es lo que ocurrió, no se borra.

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

## Catálogo ampliado y rareza fija al añadir

`20260924164806` amplía el catálogo global de bebidas concretas (`bebidas_catalogo`
con `sala_id` nulo) de 35 a 134 entradas, en las mismas categorías que ya
existían (Cerveza, Chupito, Cubata, Vino) y en dos que ya existían como
`bebidas_tipo` pero sin bebidas concretas en el catálogo global (Kalimotxo,
Shot especial). Es idempotente igual que el seed inicial: `insert ... where
not exists`, no duplica nada si se reaplica.

La misma migración cambia la firma de `crear_bebida_catalogo`: pasa de
`(p_sala, p_nombre, p_categoria_id, p_rareza)` a `(p_sala, p_nombre,
p_categoria_id)`. Un jugador puede seguir añadiendo una bebida que no esté en
el catálogo desde la sala permanente, pero ya no elige su rareza: la función
siempre crea la fila con `rareza = 'comun'`. Las rarezas superiores quedan
reservadas al catálogo global seleccionado a mano. Se retira explícitamente
la sobrecarga vieja de 4 argumentos (`drop function if exists ...(uuid, text,
integer, text)`) antes de crear la de 3, para no dejar las dos coexistiendo
(mismo fallo de sobrecargas ambiguas que ya pasó con
`registrar_bebida_suelta`, corregido en `20260924113054`).

El buscador del catálogo (input de texto que filtra por nombre, en la vista
«Bebida concreta» de la sala permanente) ya existía desde antes de esta
migración; sigue funcionando igual con las 134 entradas.

## Cuatro cartas que ya funcionaban sin estar documentadas

Un PR en curso (#21, rama `codex/perfil-vistas`) bloqueó provisionalmente en
el cliente cuatro cartas (`trono-del-campeon`, `dado-maldito`,
`brindis-prohibido`, `caliz-final-boss`), con el motivo «tienen arte y
descripción, pero todavía no tienen resolución en el cliente ni en las
migraciones versionadas». Es cierto que no estaban en las migraciones
versionadas — pero sí tienen resolución completa, en `finalizar_noche`, desde
antes de que existieran migraciones versionadas. Se resuelven con el mismo
mecanismo genérico que el resto de cartas de cierre: `usarCartaEnNoche`
(`src/lib/inventario.ts`) escribe una entrada en
`avatar_config.inventario.cartasActivas`; `finalizar_noche` la lee al cerrar
la noche y aplica el efecto. No hacía falta ningún caso especial en el
cliente para estas cuatro, igual que no lo hay para `sombra-del-after` o
`coronacion-secreta`.

- **Trono del Campeón** (personal): +1 cofre épico si acabas 1º.
- **Cáliz Final Boss** (personal): tu última bebida antes del cierre cuenta
  x5 si acabas en el podio (top 3).
- **Brindis Prohibido** (objetivo): durante la ventana de la carta, caster y
  objetivo acaban con el mismo total de puntos (el combinado de ambos
  repartido a medias).
- **Dado Maldito** (global, oculta): resultado aleatorio de tres posibles —
  +3 PL a toda la sala, -2 PL a toda la sala, o +10 PL a un jugador al azar.

`supabase/tests/cartas_pendientes.sql` lo verifica con un control-vs-prueba
para cada una de las cuatro (mismos registros, con y sin la carta activa, y
se compara el `pl_ganados` resultante). El bloqueo de PR #21 se puede retirar
sin más trabajo de backend.

## Nombre de usuario único

Hasta `20260924215656`, `perfiles.nombre` se generaba en el alta
(`handle_new_user`) a partir del correo (la parte antes de la `@`) y no había
ni forma de cambiarlo ni garantía de que fuera único. El login solo pide
correo + contraseña (se retiró el enlace mágico de `src/app/login/page.tsx`:
seguía funcionando pero confundía sobre qué era el "nombre" del usuario), así
que seguimos sin pedir un username en el alta — lo que cambia es que ahora:

- `perfiles.nombre` tiene un índice único case-insensitive
  (`perfiles_nombre_lower_key` sobre `lower(nombre)`).
- `handle_new_user` sigue generando el nombre a partir del correo, pero si
  colisiona con uno ya existente le añade un sufijo numérico (`juan`,
  `juan2`, `juan3`…) en vez de fallar el alta.
- Nueva RPC `cambiar_nombre_usuario(p_nombre text)`: valida longitud (3-24),
  charset (`[[:alnum:]_. -]`) y unicidad (excluyendo el propio perfil, para
  poder cambiar solo mayúsculas/minúsculas del nombre propio), y actualiza
  `perfiles.nombre`. Nuevo componente `src/components/NombreEditor.tsx` en el
  perfil propio para usarla.
- Se resolvió el único duplicado que había en producción antes de crear el
  índice (`tualemandeconfianza`, dos perfiles de prueba; el segundo pasó a
  `tualemandeconfianza3`, ya que `…2` también estaba en uso).

Este nombre único es el que hace falta para poder buscar/añadir amigos por
nombre. `supabase/tests/nombre_usuario_unico.sql` verifica la generación sin
colisión y las tres validaciones de la RPC.

## Sistema de amigos

`20260924221823` añade la tabla `amistades`: una fila por par de usuarios
(orden canónico `usuario_a < usuario_b` para no duplicar en ninguna
dirección), con `estado` (`pendiente`/`aceptada`) y `solicitado_por`. Solo
tiene política de lectura (`usuario_a = auth.uid() or usuario_b = auth.uid()`);
todas las mutaciones pasan por RPCs `security definer`, igual que el resto de
la app:

- `buscar_usuarios_por_nombre(p_query)`: subcadena case-insensitive sobre
  `perfiles.nombre`, excluyendo al propio usuario, máximo 10 resultados.
- `mis_amigos()`: todas las filas propias (pendientes y aceptadas, en ambas
  direcciones), con el "otro" usuario ya resuelto.
- `enviar_solicitud_amistad(p_destino_id)`: crea la solicitud pendiente. Si
  el destino ya te había enviado una a ti, la acepta directamente en vez de
  dejar dos solicitudes cruzadas.
- `responder_solicitud_amistad(p_solicitante_id, p_aceptar)`: acepta (pasa a
  `aceptada`) o rechaza (borra la fila) una solicitud recibida.
- `eliminar_amigo(p_otro_id)`: borra la relación, sea cual sea su estado
  (sirve tanto para cancelar una solicitud propia como para eliminar una
  amistad ya aceptada).

Página `/amigos` (`src/app/amigos/page.tsx` + `src/components/AmigosClient.tsx`),
enlazada desde la cabecera (`src/components/AppHeader.tsx`). `supabase/tests/sistema_amigos.sql`
verifica búsqueda, solicitud, duplicado, rechazo, aceptación, el caso de
solicitudes cruzadas y eliminar.

## Hotfix: crear sala y crear noche rotos

El PR #21 añadió `rechazar_escritura_sala_archivada()` como trigger `BEFORE
INSERT` en cuatro tablas (`noches`, `registros`, `sojas_registros`,
`sala_miembros`) para impedir escribir en una sala archivada. Su cuerpo
declaraba `v_sala uuid := new.sala_id` (columna que sí existe en las cuatro,
sin problema) pero luego comprobaba `new.noche_id` sin condicionar antes el
acceso a la tabla — y `noche_id` **no existe** en `noches` ni en
`sala_miembros`. PL/pgSQL compila el cuerpo entero de la función una sola
vez por cada tipo de fila con el que se invoca; una referencia a un campo
que no existe en ese tipo de fila falla en la compilación, no en tiempo de
ejecución, así que daba igual que esa rama nunca se fuera a ejecutar para
esas dos tablas — el simple hecho de referenciarla rompía la función entera
para ellas. Resultado: desde que se fusionó el PR #21, **crear una sala y
crear una noche fallaban siempre**, en cualquier sala, con
`record "new" has no field "noche_id"`. Registrar una bebida seguía
funcionando (esa tabla sí tiene `noche_id`).

`20260924224811` lo corrige leyendo `noche_id` con
`to_jsonb(new) ->> 'noche_id'` en vez de `new.noche_id`: el acceso a una
clave de un jsonb no exige que exista en el tipo de fila en tiempo de
compilación (da `null` si falta), así que la misma función vale para las
cuatro tablas sin más cambios. Se verificó con `crear_sala`, `unirse_sala`,
crear una noche, y que el rechazo por sala archivada sigue funcionando en
ambas tablas.

## Mapa de sitios

`20260924224400` añade `sitios` (catálogo compartido: nombre, lat/lng, quién
lo creó — igual de público que `bebidas_catalogo`, para no duplicar el mismo
bar) y `registros.sitio_id` (opcional). Quién ha bebido dónde no se guarda
en una tabla aparte: se calcula agregando `registros` al vuelo, filtrado a
uno mismo y a los amigos aceptados.

Solo aplica a la sala permanente, nunca a una noche: `registros.sala_id` (no
`noche_id`) solo se rellena en un registro de bebida suelta —
`registrar_bebida_suelta` ya exige que la sala sea de tipo `permanente` — así
que basta con exigir `sala_id is not null` en la RPC que marca el sitio para
excluir cualquier bebida de una noche, sin tener que repetir la comprobación
del tipo de sala.

- `sitios_cercanos(p_lat, p_lng, p_radio_metros)`: los 5 sitios más cercanos
  dentro del radio (haversine; no hace falta PostGIS a esta escala).
- `crear_sitio(p_nombre, p_lat, p_lng, p_icono)`: da de alta un sitio nuevo.
- `marcar_sitio_de_registro(p_registro_id, p_sitio_id)`: asocia un registro
  ya existente (tiene que ser tuyo, de sala permanente, no anulado) a un
  sitio.
- `mis_sitios_mapa()`: los sitios visibles en el mapa de perfil — tuyos, de
  amigos aceptados, o `'ambos'` si coinciden — con su tipo ya resuelto.
- `detalle_sitio(p_sitio_id)`: desglose de bebidas por persona en ese sitio,
  limitado a ti mismo y tus amigos aceptados (nunca un desconocido, aunque
  haya marcado el mismo sitio).

`supabase/tests/mapa_de_sitios.sql` verifica todo lo anterior, incluido que
marcar el sitio de un registro de una noche se rechaza explícitamente.

`20260924233500` amplía esto con lo que se echó en falta al probarlo:

- `sitios.icono` (por defecto 📍): `crear_sitio` ahora acepta un cuarto
  parámetro `p_icono` opcional (si viene vacío o no se manda, cae al valor
  por defecto). El frontend (`SitioPicker.tsx`) deja elegir entre un puñado
  de emojis fijos al crear un sitio nuevo.
- Al crear un sitio nuevo ya no se manda directamente la coordenada del
  GPS: el frontend muestra un mapa pequeño centrado ahí, con un marcador
  arrastrable, para poder ajustar el punto exacto antes de confirmar (el
  GPS de un móvil no siempre acierta el portal exacto). Ese marcador salía
  invisible (un recuadro transparente): el icono por defecto de Leaflet
  depende de rutas de imagen que el bundler de Next no resuelve — el mismo
  problema que `MapaSitiosClient.tsx` ya evitaba con un `divIcon` propio;
  se corrigió dándole uno también al marcador arrastrable, con el emoji
  elegido pintado en vivo según se cambia de icono.
- `eliminar_sitio(p_sitio_id)`: solo quien lo descubrió (`sitios.creado_por`)
  puede borrarlo. Al borrarlo, los registros que lo tenían marcado se
  quedan con `sitio_id` a `null` (la columna ya era `on delete set null`),
  nunca se borra el registro de la bebida en sí.
- `mis_sitios_mapa()` cambió de tipo de retorno (se recreó con `drop
  function` + `create function`, no con `create or replace`, porque
  Postgres no deja cambiar las columnas de una función que devuelve una
  tabla): ahora también devuelve `icono`, `creado_por` y
  `descubridor_nombre`, para pintar el icono real en el mapa y mostrar
  "descubierto por" con el botón de borrar si el sitio es tuyo.

`supabase/tests/sitios_icono_y_borrado.sql` verifica el icono elegido y el
que cae al valor por defecto, que `mis_sitios_mapa` expone icono/descubridor,
que solo el descubridor puede borrar un sitio (otro miembro lo tiene
prohibido) y que borrar un sitio no se lleva por delante el registro que lo
tenía marcado.

## Bebidas de la sala: listado y borrado

`20260924232000` añade `borrar_registro_bebida_suelta(p_registro_id)`: la
política de lectura de `registros` ya dejaba ver a cualquier miembro todos
los registros de su sala (`registros_select`, `es_miembro(sala_id)`), así que
no hacía falta una RPC nueva para listarlos — solo para poder borrar uno más
allá de los 30 segundos que permite `anular_bebida_suelta` (pensada para el
"deshacer" inmediato, no para corregir un error que se nota más tarde).

Puede borrar su propio registro cualquier miembro; el de otra persona, solo
un admin o el fundador de la sala. Igual que el mapa de sitios, solo aplica a
bebida suelta (`sala_id is not null`): nunca se puede borrar con esta función
un registro de una noche, para no tocar nada que ya haya contado para la
liga o el podio.

Nueva página `/sala/[id]/registros` (`src/app/sala/[id]/registros/page.tsx` +
`src/components/RegistrosSalaClient.tsx`), enlazada desde `/sala/[id]` junto
al botón de Estadísticas, solo en sala permanente. Muestra un ranking de
quién lleva más y el historial con quién bebió qué y cuándo, con botón de
borrar donde corresponda.

`supabase/tests/borrar_registro_bebida_suelta.sql` verifica que el propio
autor puede borrar su registro (con el descuento de XP correspondiente) más
allá de los 30s, que un miembro cualquiera no puede borrar el de otro, que un
admin sí, y que un registro de una noche se rechaza siempre.

Al probarlo con datos reales, una sala con mucha actividad cargaba TODO el
historial de golpe (la página original traía todos los registros en tandas
de 1000 solo para poder sumar el ranking), lo que resultaba en una lista
interminable e incómoda de recorrer. `20260924235000` añade
`ranking_bebidas_sala(p_sala)`: agrupa y cuenta en el propio Postgres (rápido
con el índice de `sala_id`), así que el ranking ya no depende de traerse el
historial completo. El historial en sí ahora se pagina: la página del
servidor solo carga los últimos 20 registros, y `RegistrosSalaClient` tiene
un botón "Ver más" que pide la siguiente tanda de 20 directamente a
`registros` (la política de lectura ya lo permite) según hace falta.

`supabase/tests/ranking_bebidas_sala.sql` verifica que suma bien por
usuario, que ordena de mayor a menor, que un registro de una noche no cuenta,
y que alguien que no es miembro de la sala no ve nada al llamarla.

## Pruebas SQL

`supabase/tests/*.sql` son pruebas que se pegan en el editor SQL. Cada una
termina siempre con un error `RESULTADO_VERIFICACION {...}`, de modo que se
deshace por completo y no deja datos. No forman parte de las migraciones.
La del cron se aísla de las noches reales con una copia temporal de `noches`
(ver su cabecera), así que no actualiza ni bloquea ninguna fila real. La de
cartas usa usuarios exclusivos por escenario (nunca reutilizados) para que
los logros de racha/veterano, que comprueban across todas las noches del
usuario, no contaminen la comparación control-vs-prueba (ver su cabecera).

## Lo que todavía no está en el repositorio

Todo lo anterior a `20260924112236` (esquema base, ligas, logros, salas
permanentes…) sigue existiendo solo en el historial de Supabase, con la
excepción de `finalizar_noche` (`20260924173746`). Para poder reconstruir la
base desde cero hace falta volcar el resto de ese historial a esta carpeta
(`supabase db pull` o exportar las sentencias de
`supabase_migrations.schema_migrations`).

## Retirada de la compatibilidad con clientes anteriores al PR #15

`registrar_bebida_suelta` devuelve las columnas de la fila de `registros` en el
primer nivel (`id`, `ts`, …) **y** dentro de `registro`. La parte de primer
nivel solo existe para los clientes anteriores al PR #15 (pestañas ya abiertas,
PWA con el bundle antiguo en caché). Cuando ya no queden, se retira con una
migración que sustituya `to_jsonb(v_registro) || jsonb_build_object(...)` por
`jsonb_build_object(...)`.
