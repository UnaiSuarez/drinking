# Ligas y banners

## Implementado

- Ocho divisiones centralizadas en `src/lib/liga.ts`: 0, 50, 125, 170, 230,
  320, 450 y 600 PL. Challenger exige lider unico, sin empate.
- Dos marcos CSS nuevos: Platino y Gran Maestro.
- Premios por ascenso, una vez por usuario/division/temporada. Los PL
  existentes establecen el punto de partida, sin pagos retroactivos.
- Plata: comun; Oro: comun +30; Platino: epico; Diamante: epico +60;
  Maestro: legendario; Gran Maestro: legendario +100 y titulo Leyenda del After.
- Al cerrar: un cofre por el mayor tramo de PL alcanzado. Exige temporada
  de siete dias y noches en cuatro fechas distintas. No acumula tramos inferiores.
- Podio adicional con tres participantes, y dos noches por premiado:
  primero legendario +150, segundo epico +75, tercero epico +40.
- Campeon unico: banner exclusivo. Los empates comparten puesto/premio,
  pero no desbloquean el banner exclusivo.
- Historial privado o accesible a miembros de la sala; almacena nombres de
  sala y temporada, puesto, PL, maximo PL y noches al cierre.
- Catalogo de 20 banners: tres gratis, tres comunes ilustrados (30), tres
  raros (90), cinco epicos (220), cuatro legendarios (500) y dos exclusivos.
- Cumbre del After se entrega con un nuevo ascenso a Gran Maestro,
  sin pagos retroactivos. Galeria con filtro por rareza.
- `/banners`: previsualizacion, compra y equipamiento mediante RPC atomica.
  `/liga/historial`: temporadas y premios entregados. Enlaces en perfil,
  tienda, inventario y niveles.
- Galeria estatica. Animacion CSS en perfil/previsualizacion segun preferencias,
  pausada fuera de viewport/pestana y desactivada con movimiento reducido.

## Base de datos

Migracion `20260927205503_liga_banners_recompensas.sql`, aplicada y verificada
en proyecto `qzwooagxilzohyjgdpjg` con autorizacion del usuario.
No cierra temporadas ni reinicia cuentas. Sin premios retroactivos.
Tambien aplicada `20260927214537_banners_ilustrados.sql`: ocho banners
adicionales y desbloqueo exclusivo vinculado al premio de Gran Maestro.
Los triggers de cierre cubren las RPC actuales (manual, nueva temporada y
rotacion en finalizar_noche); no se ha cambiado su calendario de ejecucion.

Tablas con RLS y permisos de lectura explicitos. Solo `elegir_banner` es
invocable por authenticated; comprueba auth.uid, saldo, propiedad y exclusividad.
Los helpers de premios no tienen permisos de ejecucion para clientes.
El aviso del asesor sobre la RPC SECURITY DEFINER autenticada es intencional;
no se da acceso anonimo. El resto de avisos ya existia antes de la migracion.

## Pruebas

`scripts/test-liga-banners.mjs` utiliza PostgreSQL desechable mediante PGlite
0.3.14, instalado fuera del proyecto. Ejecutar con la ruta absoluta a
`@electric-sql/pglite/dist/index.js` como argumento.

Comprueba migracion completa, base sin pagos, ascensos, no duplicacion,
compra repetida, saldo insuficiente, bloqueo de exclusivo, cierre repetido y RLS.
En produccion se probaron ascensos y descenso/reascenso dentro de una
transaccion con ROLLBACK. Verificado despues: 20 perfiles, seis temporadas
activas, cero premios reales y cero cierres provocados por la migracion.

## Arte

Once imagenes generadas para este trabajo; el script `prepare-banner-art.mjs`
documenta los originales y genera WebP 1200x400. Total: 1020290 bytes.
Los ocho nuevos son Barra clasica, Azotea al atardecer, Una partida mas,
Biblioteca arcana, Templo glacial, Forja solar, Viaje estelar y Cumbre del After.

Verificacion final: build de produccion correcto, pruebas de divisiones y
PostgreSQL desechable superadas, filtros y previsualizaciones comprobados
en movil sin imagenes rotas ni desbordamiento horizontal. Catalogo de 20
filas confirmado en produccion; trigger exclusivo no ejecutable por clientes.

## Siguiente ampliacion

- Banners como botin de cofres: no se ha modificado la apertura actual, que
  calcula recompensas en cliente y reemplaza avatar_config. Para integrarlos
  con la propiedad server-side hay que trasladar esa entrega a una operacion
  atomica; no entregar mediante un trigger generico al restar cofres (tambien
  se restan desde administracion y reseteos).
- Cartela del campeonato (sala/temporada) seleccionable en el banner; los
  datos ya se conservan en historial, pero no se imprimen sobre el banner.
- La previsualizacion ampliada del avatar sigue centrada en el marco; el
  banner aparece en la cabecera real del perfil.

## Concurrencia

Durante este trabajo aparecieron cambios ajenos en CartasSalaClient,
NocheLive, PersonajePagina y tienda.ts. No se han revertido ni incluido en
un commit propio. El servidor de desarrollo que ya estaba activo usa 3000.
