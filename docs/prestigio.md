# Prestigio desde nivel 50

## Estado

- Migracion `20260927124224_prestigio_nivel_50.sql` aplicada en produccion el 27 de septiembre de 2026 con autorizacion del usuario.
- Prueba `supabase/tests/prestigio_nivel_50.sql` ejecutada con usuario temporal y rollback. Ninguna cuenta real ascendida.
- Frontend disponible en perfil y `/niveles`. Las skins y reversos exclusivos quedan pendientes: no se han generado imagenes ni prometido recompensas inexistentes en la interfaz.

## Reglas

- Ascenso voluntario desde 23.909 XP (nivel 50); vuelve a nivel 1 y 0 XP.
- Se conserva el objeto completo de inventario, cartas, cofres, personajes, skins, equipamiento, medallas, estadisticas y liga.
- Las chapas derivadas de la XP anterior se trasladan al bonus de tienda para conservar el saldo.
- Primeros cinco prestigios: disco, reliquia, prisma, trono y llamas. Los marcos antiguos permanecen en el inventario. No se equipan automaticamente.
- Todos los prestigios muestran su numero junto al emblema y desbloquean un titulo seleccionable. A partir del sexto no se promete un nuevo marco.
- No se permite ascender con noches pendientes. No se hace prestigio automatico ni se eliminan niveles de jugadores existentes.
- Se conserva la curva de XP y se permite seguir acumulando XP si el usuario prefiere posponer el ascenso.

## Integracion y concurrencia

- `prestigios` es el historial protegido. El cliente solo puede leer ciclo, marco, fecha y usuario; no puede insertar, modificar o borrar ciclos.
- `ascender_prestigio(p_ciclo_actual)` usa `auth.uid()`, bloquea la fila del perfil y rechaza un ciclo obsoleto. No recibe un usuario arbitrario.
- Las referencias de cofres del ciclo cero no cambian. En otros ciclos se usa `p<ciclo>:<nivel>`; recuperar XP perdida no vuelve a entregar el mismo cofre.
- La celebracion de nivel guarda una clave local distinta para cada ciclo.
- El aviso de Supabase sobre la RPC SECURITY DEFINER disponible para usuarios autenticados es intencional: necesita escribir las recompensas protegidas y comprueba identidad, XP y ciclo dentro de la transaccion. No esta disponible para anon.
- No sobrescribir `recompensar_niveles_xp` con una version anterior sin ciclos.
- Coordinar con el reset de administrador de Claude: su migracion ya elimina `prestigios` y `recompensas_cofre` al resetear completamente una cuenta. Eso es distinto al prestigio, que conserva todo.

## Verificacion

- `node scripts/check-prestigio.mjs`: umbral, marcos, claves de celebracion y normalizacion de vitrina.
- SQL: bloqueo antes del 50, preservacion de inventario/saldo, doble solicitud, segundo ciclo, cofres sin duplicados y autenticacion.
- Navegador movil: tres casillas seleccionadas, cuarta bloqueada, sin desbordamiento horizontal; prueba cancelada sin cambiar la vitrina guardada.
- Titulos de medallas contrastados con el commit original: ya usaban los nombres de medalla, no eran un catalogo independiente.
- [Permisos de funciones de Supabase](https://supabase.com/docs/guides/database/functions#function-privileges).
