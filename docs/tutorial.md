# Tutorial inicial

## Recorrido

`/tutorial`: entrenamiento en tres bloques: sala y registros, noche,
coleccion. Reutiliza SalaView, SojasLogger, BebidaSueltaLogger, SitioPicker
y el resumen de carta compartido con NocheLive. Incluye ubicaciones,
bebidas unicas y diferencia XP/PL. La noche, revision y premios se simulan.
El registro rapido y la bebida concreta se practican por separado. El selector
de sitios mantiene un contenedor estable para no perder el foco interactivo
al desplegar sus opciones; las comprobaciones del navegador usan clics reales.
Driver.js se carga al empezar. Un contexto explicito aisla las acciones
de entrenamiento; los componentes fuera del contexto siguen funcionando igual.
`/guia` mantiene los 27 temas en nueve capitulos como consulta desplegable.
No realiza compras, registros, ascensos ni aperturas de cofres.

La bienvenida se monta para usuarios autenticados desde AppHeader. Espera
a que se haya elegido el modo de animaciones; no aparece en login,
recuperacion de acceso ni dentro de la propia guia. Usa un dialogo nativo
para aislar foco y teclado, y el bloqueo de scroll compartido.

## Persistencia

Migracion `20260927133019_tutorial_progreso.sql`, aplicada en produccion con
autorizacion del usuario. Sin fila = invitacion pendiente, por lo que
tambien llega a las cuentas existentes. Empezar o Ahora no crea una fila.
Ahora no no vuelve a abrir la invitacion: se retoma desde Ajustes.

Paso, acciones completadas y estado se guardan por cuenta. Finalizar marca
completado tras equipar el marco de muestra. Omitir conserva el punto actual.
El progreso del tutorial antiguo vuelve al inicio de la practica. La guia
no concede recompensas ni modifica perfiles/inventario.

La bienvenida usa insert-on-conflict-do-nothing para no pisar el progreso
de otra pestaña. Los cambios de paso esperan confirmacion del servidor y
se bloquean durante el guardado. Si falla, se conserva la vista y se
muestra un error; no se afirma que se haya guardado. Un fallo de lectura
en la guia impide sobrescribir progreso desconocido.

Todas las acciones de entrenamiento pasan por `tutorial/actions.ts`:
autentica, valida el paso esperado y actualiza exclusivamente tutorial_progreso.
La actualizacion compara actualizado_at para evitar carreras entre pestanas.
No acepta ids de usuarios, salas, inventarios, coordenadas ni premios del cliente.
La carta prestada se deriva del paso: una copia antes de usar, cero despues.
Repetir el entrenamiento no entrega ninguna carta real.

En contexto de entrenamiento se suprimen visitas, suscripciones, progreso
de medallas, RPCs de registros y notificaciones. Los ids ficticios no son UUIDs
validos. SitioPicker usa un lugar de ejemplo sin llamar a geolocalizacion.
La actividad real en otras pestanas no se desactiva ni pierde recompensas.

RLS permite a authenticated leer/insertar/actualizar solo su propia fila.
No se permite borrar desde el cliente ni acceder como anon. Patron:
https://supabase.com/docs/guides/database/postgres/row-level-security

## Comprobaciones

- `node scripts/check-tutorial.mjs`: contenido, ids, destinos, normalizacion,
  bloques, orden, duplicados, finalizacion y tablas usadas por el servidor.
- `supabase/tests/tutorial_progreso.sql`: aislamiento y permisos con dos
  usuarios temporales, transaccion revertida al terminar.
- Browser: bienvenida, avanzar, recargar, pausar, retomar desde Ajustes,
  ausencia de segunda bienvenida y anchura movil.

No se generan imagenes. El contenido extenso se carga con la ruta guia,
no con la cabecera de todas las pantallas.
