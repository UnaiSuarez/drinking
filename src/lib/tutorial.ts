export type TutorialStep = {
  id: string;
  chapter: string;
  title: string;
  intro: string;
  steps: string[];
  detail: string;
  note?: string;
  destination: "home" | "profile" | "settings" | "inventory" | "shop" | "levels" | "challenges" | "friends" | "map" | "medals";
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "bienvenida", chapter: "Primeros pasos", title: "Tu grupo, tus recuerdos y tu colección",
    intro: "El Ranking reúne las salas de tu grupo, sus noches, estadísticas y una colección de personajes, cartas y medallas. Esta guía te acompaña desde la primera sala hasta el prestigio.",
    steps: ["Lee un paso y pulsa Siguiente. Puedes volver atrás o elegir un tema en el índice.", "Cuando quieras probar algo, pulsa Abrir pantalla. La guía guarda tu posición antes de salir.", "Para continuar, entra en Ajustes → Tutorial. También puedes repetir los capítulos aunque hayas terminado."],
    detail: "Nada de esta guía compra objetos, inicia noches ni registra bebidas por ti. Puedes leerla entera sin modificar tus estadísticas. Tu progreso se guarda en tu cuenta, no solo en este móvil.",
    note: "Participar no exige beber alcohol. Registra solo lo que haya ocurrido; las SOJAS también permiten participar en varias actividades y retos. Los puntos no son una recomendación de consumo.", destination: "home",
  },
  {
    id: "navegacion", chapter: "Primeros pasos", title: "Encuentra cada sección",
    intro: "La cabecera te acompaña por la aplicación y el inicio reúne tus salas.",
    steps: ["Pulsa El Ranking en la cabecera para volver al inicio y ver tus salas y retos.", "El icono de tienda abre el catálogo; Amigos muestra tus contactos y solicitudes; el engranaje abre Ajustes.", "Pulsa tu avatar para abrir tu perfil. Allí encontrarás Inventario, Estadísticas, Mapa de sitios, medallas y personalización."],
    detail: "El nivel y las chapas de la cabecera pertenecen a tu cuenta. La clasificación y los PL que ves dentro de una sala pertenecen a su liga. No son el mismo contador. Algunas herramientas solo aparecen para el fundador o administradores.", destination: "profile",
  },
  {
    id: "cuenta", chapter: "Primeros pasos", title: "Prepara tu cuenta y tu móvil",
    intro: "Antes de empezar, comprueba tu nombre, el correo de acceso y el modo de animaciones.",
    steps: ["En Ajustes puedes cambiar tu nombre de usuario y guardar tu cumpleaños. El nombre debe estar disponible.", "Elige Mínimo, Equilibrado o Completo en Animaciones y rendimiento. Puedes cambiarlo cuando quieras.", "Guarda un correo real y accesible para recuperar tu contraseña. En el inicio de sesión está He olvidado mi contraseña."],
    detail: "Mínimo mantiene las acciones esenciales, como abrir cofres y girar cartas, sin efectos decorativos. Equilibrado usa efectos ligeros. Completo activa los efectos más elaborados y consume más batería. Esta preferencia se guarda por dispositivo.", destination: "settings",
  },
  {
    id: "salas", chapter: "Tu grupo", title: "Crea una sala o únete con un código",
    intro: "Una sala es el espacio compartido de un grupo. Tu cuenta puede pertenecer a varias.",
    steps: ["En el inicio, elige Crear sala si organizas el grupo, o Unirse si alguien ya la ha creado.", "Para crearla, escribe el nombre y revisa el tipo antes de confirmar. Para unirte, introduce el código que te pase el grupo.", "Dentro de la sala, pulsa el código para compartirlo. Encontrarás miembros, liga y últimas noches más abajo."],
    detail: "Normal, de temporada y permanente ofrecen distintos contextos para el grupo. Las salas permanentes permiten registrar actividad fuera de una noche. La configuración de la sala determina las opciones disponibles; no hace falta crear otra sala para cada noche.", destination: "home",
  },
  {
    id: "gestion-sala", chapter: "Tu grupo", title: "Ajustes y permisos de la sala",
    intro: "Los ajustes de la sala y los ajustes de tu cuenta son dos pantallas diferentes.",
    steps: ["Abre una sala y pulsa su botón Ajustes, junto a su nombre.", "Si tienes permisos, puedes renombrarla, gestionar miembros y revisar temporadas y balance de puntos.", "Archivar sala también está aquí. Consulta las salas archivadas desde el inicio para restaurar las que administras."],
    detail: "No todos los miembros pueden administrar. El fundador y los administradores tienen controles adicionales. Archivar y eliminar no son lo mismo: archivar conserva la sala; eliminar definitivamente borra datos y requiere confirmación. No uses estas acciones para salir simplemente de una pantalla.", destination: "home",
  },
  {
    id: "bebidas", chapter: "Registros y SOJAS", title: "Registra una bebida sin iniciar una noche",
    intro: "En una sala permanente, Registrar una bebida permite anotar actividad en cualquier momento.",
    steps: ["Entra en la sala y elige Rápido para una categoría general, o Bebida concreta para buscar en el catálogo.", "Comprueba lo que has seleccionado antes de registrar. Una pulsación confirmada crea un registro; no repitas si ya aparece guardado.", "Si se ofrece elegir un sitio después de registrar, puedes vincularlo a ese lugar para verlo en el mapa."],
    detail: "Estas bebidas suman XP y pueden contribuir a logros, retos y estadísticas, pero no dan PL de liga por sí solas. Para competir en una noche hay que entrar en esa noche y registrar allí. El catálogo concreto también alimenta tu colección de bebidas probadas.", destination: "home",
  },
  {
    id: "sojas", chapter: "Registros y SOJAS", title: "Las SOJAS también cuentan",
    intro: "SOJAS es el apartado separado para la actividad sin alcohol. No tienes que añadir una bebida alcohólica para dejar constancia de tu participación.",
    steps: ["Abre SOJAS dentro de la sala o de la noche donde estés participando.", "Selecciona la opción correspondiente y comprueba que el registro aparezca.", "Consulta su apartado en los listados y estadísticas. En los retos diarios y en Constancia semanal, las SOJAS también cuentan como actividad."],
    detail: "SOJAS y bebidas con alcohol se desglosan por separado. No des por hecho que tienen los mismos puntos o que cumplen todos los logros: cada reto y medalla tiene su propia condición. Lee siempre su descripción.", destination: "home",
  },
  {
    id: "corregir", chapter: "Registros y SOJAS", title: "Consulta y corrige tus registros",
    intro: "Un error al registrar se corrige en el historial, no añadiendo otra bebida para compensarlo.",
    steps: ["Desde la sala, abre Bebidas de la sala para consultar el desglose y el historial fuera de las noches.", "Busca tu bebida o SOJA en el historial y usa su acción de borrado si te equivocaste. Los resúmenes no son botones de borrar.", "En una noche, consulta su propio listado: los permisos de edición dependen del estado de esa noche."],
    detail: "Retirar una bebida revierte la XP de ese registro y puede bajar tu nivel. La XP de una medalla ya conseguida se conserva. Bajar y recuperar el mismo nivel no vuelve a entregar su cofre dentro del mismo ciclo de prestigio.", destination: "home",
  },
  {
    id: "iniciar-noche", chapter: "Una noche, paso a paso", title: "Prepara la noche y únete",
    intro: "Una noche agrupa una sesión concreta del grupo. No basta con estar en la sala: hay que figurar entre sus participantes.",
    steps: ["En la sala, pulsa Iniciar noche y elige la duración o el momento de finalización que permita el formulario.", "Si aparece la sala de espera, únete y espera al resto. La pantalla indica los participantes necesarios para empezar.", "Si ya hay una noche abierta, entra en ella en lugar de intentar crear otra. Comprueba que apareces como participante."],
    detail: "La noche puede estar pendiente, activa, cerrando o cerrada. Cada estado habilita acciones distintas. Los controles para cancelar, extender o cerrar dependen de tus permisos y del estado de la sesión.", destination: "home",
  },
  {
    id: "noche-activa", chapter: "Una noche, paso a paso", title: "Registra dentro de la noche",
    intro: "La pantalla de la noche muestra participantes, registros, tiempo restante y acciones disponibles.",
    steps: ["Anota desde esa pantalla lo que realmente se haya tomado durante la sesión. No lo registres también como bebida suelta.", "Añade un comentario cuando quieras conservar una anécdota o cuando una carta lo requiera.", "Revisa el historial y la clasificación en directo. Los cambios del grupo se actualizan automáticamente."],
    detail: "La clasificación provisional no garantiza el resultado final: al cerrar se aplican logros, votos, cartas, habilidades y ajustes. No necesitas aumentar tu consumo para seguir usando la aplicación.", destination: "home",
  },
  {
    id: "cartas", chapter: "Una noche, paso a paso", title: "Lee una carta antes de usarla",
    intro: "Las cartas de juego son consumibles del inventario que pueden afectar a una noche.",
    steps: ["Abre Cartas de noche. La lista muestra las que puedes utilizar y cuántas tienes.", "Lee el efecto, las condiciones y el objetivo. Si pide elegir a otra persona, selecciónala antes de confirmar.", "Pulsa Usar carta solo si estás seguro. Algunas actúan al instante y otras se resuelven al finalizar la noche."],
    detail: "Una carta usada se gasta. Algunas tienen límites de hora, fase o situación; un botón desactivado no siempre es un error. Por ejemplo, Sombra del After tiene una ventana horaria. Las cartas se diferencian de las skins y marcos: estos últimos personalizan tu aspecto, no son acciones consumibles.", destination: "inventory",
  },
  {
    id: "cierre", chapter: "Una noche, paso a paso", title: "Revisa, vota y confirma el cierre",
    intro: "Cerrar una noche tiene una fase de revisión antes de revelar el podio.",
    steps: ["Cuando empiece el cierre, revisa el temporizador y tus registros. La gracia normal es de cinco minutos.", "Participa en la votación disponible: no puedes votarte a ti mismo. Usa cualquier corrección o penalización con honestidad.", "Si aparece la fase extra, añade únicamente consumiciones olvidadas de la sesión y confirma Ya no tengo más bebidas que añadir cuando hayas terminado."],
    detail: "Tras la gracia, el podio puede quedar esperando las confirmaciones o la intervención de un administrador. Los registros retroactivos no se tratan igual que los registrados a tiempo. No vuelvas a consumir para completar una fase de cierre.", destination: "home",
  },
  {
    id: "podio", chapter: "Una noche, paso a paso", title: "Entiende el resultado y las recompensas",
    intro: "El podio presenta el resultado cerrado y después sus recompensas y desgloses.",
    steps: ["Abre la noche cerrada desde Últimas noches si no estás ya en su podio.", "Avanza por las pantallas de resultado: puesto, recompensa, XP, logros y evolución de la liga, cuando correspondan.", "Consulta el desglose de PL para distinguir posición, votos, logros y efectos adicionales. Busca los cofres obtenidos en Inventario."],
    detail: "Las animaciones presentan el resultado; no hace falta repetirlas para cobrarlo. Volver a abrir el podio no vuelve a conceder las mismas recompensas. La XP sube tu nivel personal; los PL se usan en la clasificación de la sala.", destination: "home",
  },
  {
    id: "liga", chapter: "Progreso y premios", title: "Liga, temporadas y divisiones",
    intro: "La liga compara la puntuación de los participantes dentro de una sala y una temporada.",
    steps: ["En la sala, mira el nombre y las fechas de la temporada activa junto a Liga.", "Consulta tu puesto y tus PL. Pulsa Ver niveles para revisar también los hitos de divisiones cuando vienes desde una sala.", "En Estadísticas cambia el periodo o el jugador para entender los resultados más allá de la clasificación."],
    detail: "Las temporadas, premios y reglas pueden variar según la configuración de la sala. Un reinicio de temporada no equivale a perder tu inventario o tu nivel personal. Los PL históricos tampoco son necesariamente los PL de la temporada actual.", destination: "levels",
  },
  {
    id: "xp", chapter: "Progreso y premios", title: "XP, niveles y cofres de nivel",
    intro: "Tu nivel personal acompaña a tu cuenta, independientemente de la sala que estés mirando.",
    steps: ["En tu perfil consulta tu nivel y la barra de XP hacia el siguiente.", "Al alcanzar un nivel nuevo recibes un cofre común; en los múltiplos de cinco, uno épico; en los de diez, uno legendario.", "Cada diez niveles, hasta el 50, desbloqueas un marco de nivel. Ve a Inventario para equiparlo: no sustituye automáticamente al que llevas."],
    detail: "Los cofres de nivel no se acumulan por categorías: en el nivel 10 recibes solo el legendario, no uno de cada tipo. Cada recompensa de nivel se entrega una vez por ciclo. No necesitas iniciar una noche para progresar mediante otras actividades que den XP.", destination: "levels",
  },
  {
    id: "medallas", chapter: "Progreso y premios", title: "Medallas, títulos y vitrina",
    intro: "Las medallas reconocen condiciones concretas. Algunas son acumulables y otras se consiguen una vez.",
    steps: ["Abre el catálogo de medallas y lee su requisito, rareza y si es repetible. En una sala puedes consultar Avance de medallas.", "En tu perfil abre Título y vitrina: elige un título entre los que has desbloqueado.", "Selecciona hasta tres medallas independientes para la vitrina y guarda. Se muestran debajo del título, con nombre y cantidad cuando son acumulables."],
    detail: "Los títulos de medallas usan su nombre; prestigio añade títulos propios. Las medallas conceden cofres según su rareza: común → común, rara o épica → épico, legendaria → legendario. La vitrina es una selección para mostrar, no una forma de gastar medallas.", destination: "medals",
  },
  {
    id: "retos", chapter: "Progreso y premios", title: "Retos diarios y semanales",
    intro: "Los retos tienen su propio progreso y plazo. Revisa los requisitos en la pantalla Retos.",
    steps: ["Para el diario, entra en la aplicación y registra actividad real ese día; una SOJA también sirve.", "En Retos → Diarios, cuando estén completos los dos pasos, pulsa Reclamar cofre común. Se reinicia a medianoche, hora de Madrid.", "Para los semanales, cambia a la pestaña Semanales, revisa cada contador y pulsa Reclamar premio antes de que empiece la siguiente semana."],
    detail: "Los semanales dan XP y chapas. Constancia semanal pide actividad en tres días distintos, admite SOJAS y añade un cofre común. No todos los retos semanales dan un cofre. Un contador pendiente indica qué requisito falta, no que debas beber más.", destination: "challenges",
  },
  {
    id: "inventario", chapter: "Tu colección", title: "Chapas, tienda e inventario",
    intro: "La tienda muestra lo que puedes conseguir; el inventario reúne lo que ya tienes.",
    steps: ["Consulta tus chapas en la cabecera o en Inventario. Son la moneda del juego que se usa en las compras de la aplicación.", "En Tienda revisa el precio y la descripción de un objeto antes de comprarlo.", "En Inventario equipa tus personajes y marcos, consulta cartas disponibles y encuentra los cofres pendientes."],
    detail: "Comprar y equipar son acciones distintas. Equipar no vuelve a comprar ni gasta una copia de un personaje. Las listas de marcos tienen un control de animaciones; su vista ampliada respeta el modo general que elegiste en Ajustes.", destination: "inventory",
  },
  {
    id: "cofres", chapter: "Tu colección", title: "Abre un cofre y descubre su contenido",
    intro: "Los cofres pendientes se guardan en tu inventario hasta que los abres.",
    steps: ["En Mis cofres elige uno que tengas disponible. Común, épico y legendario son categorías diferentes.", "Pulsa abrir y espera la respuesta. Gira las cartas del resultado para descubrir los objetos.", "Al terminar, vuelve al inventario y comprueba las cantidades y los nuevos objetos. No todos los premios tienen por qué ser nuevos."],
    detail: "Abrir consume un cofre. La rareza influye en el contenido, pero no puedes elegir un premio concreto. En modo Mínimo la presentación es sencilla; cambiar las animaciones no cambia las recompensas.", destination: "inventory",
  },
  {
    id: "personajes", chapter: "Tu colección", title: "Personajes y habilidades",
    intro: "El personaje es tu identidad visual. Hay opciones gratuitas, de tienda y personajes secretos que se desbloquean.",
    steps: ["En Mis personajes puedes elegir entre los que ya tienes, incluidas las opciones gratuitas.", "Abre la ficha de un personaje para ver su imagen completa, descripción y habilidad si tiene una.", "Pulsa Equipar para usarlo. El avatar pequeño puede llevar además el marco que hayas elegido por separado."],
    detail: "Los personajes secretos tienen habilidades específicas: lee las condiciones de su ficha, porque no todas actúan igual ni en todas las situaciones. La animación del personaje se reserva para su presentación completa; el marco tiene sus propios efectos.", destination: "inventory",
  },
  {
    id: "skins", chapter: "Tu colección", title: "Skins y momentos históricos",
    intro: "Una skin cambia la apariencia de un personaje sin convertirlo en otro personaje.",
    steps: ["Entra en la ficha del personaje y elige una skin disponible para verla en la imagen principal.", "Si no la tienes y admite compra, el botón de compra abre su confirmación. Necesitas desbloquear primero el personaje correspondiente.", "Si ya la tienes, selecciónala y equípala desde la ficha. Su retrato se usa también como avatar."],
    detail: "Las skins normales son variantes temáticas. Los momentos históricos están reservados para escenas reales con su propia historia e imágenes; pueden no tener contenido todavía. No son lo mismo que una skin temática. Las skins disponibles también pueden aparecer en cofres después de desbloquear su personaje.", destination: "inventory",
  },
  {
    id: "prestigio", chapter: "Progreso avanzado", title: "Prestigio: volver a empezar sin perder la colección",
    intro: "Desde el nivel 50 puedes ascender voluntariamente a prestigio. No sucede automáticamente.",
    steps: ["En tu perfil o en Niveles consulta el panel de Prestigio y la siguiente recompensa.", "Lee la confirmación: empiezas en nivel 1 con 0 XP, pero conservas inventario, chapas, medallas, estadísticas y liga.", "Confirma solo cuando quieras iniciar otro ciclo. No se permite mientras participas en una noche sin cerrar."],
    detail: "Cada ciclo permite volver a ganar los cofres de sus niveles. Recibes un emblema y título de prestigio; los primeros cinco prestigios desbloquean los marcos que antes estaban por encima del nivel 50. El ascenso no se puede deshacer desde la interfaz.", destination: "levels",
  },
  {
    id: "amigos", chapter: "Amigos y recuerdos", title: "Amigos y privacidad de los perfiles",
    intro: "Compartir una sala y ser amigos son relaciones diferentes.",
    steps: ["En Amigos busca a la persona por su nombre y envía una solicitud.", "Revisa las solicitudes recibidas: puedes aceptar o rechazar. La amistad no se activa hasta aceptarla.", "Abre el perfil de un amigo para consultar las secciones compartidas contigo; desde Amigos también puedes gestionar la relación."],
    detail: "Un perfil ajeno puede mostrar solo datos básicos, título y vitrina cuando no existe una amistad aceptada. Las estadísticas privadas y la colección detallada no deben interpretarse como vacías si no tienes acceso. No necesitas compartir contraseñas para conectar con alguien.", destination: "friends",
  },
  {
    id: "mapa", chapter: "Amigos y recuerdos", title: "Sitios y mapa",
    intro: "El mapa organiza los lugares que has vinculado a tus registros.",
    steps: ["Después de registrar, usa el selector de sitio cuando esté disponible. Elige un lugar existente o crea uno si corresponde.", "Abre Mapa de sitios desde tu perfil para consultar tus lugares y su detalle.", "Desde un perfil amigo puedes abrir sus sitios cuando tengas acceso. Los controles del mapa permiten cambiar de vista y consultar registros."],
    detail: "La ubicación depende del permiso del navegador. Si la rechazas, otras funciones de la app siguen disponibles. No vincules un registro a un lugar inventado solo para que aparezca en el mapa; comprueba el nombre y la posición antes de guardar.", destination: "map",
  },
  {
    id: "estadisticas", chapter: "Amigos y recuerdos", title: "Lee tus estadísticas con contexto",
    intro: "Hay estadísticas de tu cuenta, de cada sala y del conjunto de tus salas.",
    steps: ["Desde el perfil abre Estadísticas para ver el historial personal, tablas, evolución y desgloses disponibles.", "Desde una sala abre Estadísticas para filtrar por jugador o periodo. Bebidas de la sala es otro listado, centrado en los registros sueltos.", "Revisa siempre el ámbito y las fechas antes de comparar: una temporada no equivale a todo el historial."],
    detail: "En móvil las tablas anchas pueden desplazarse dentro de su propio contenedor. Los registros con alcohol, las SOJAS, bebidas sueltas y noches pueden aparecer separados. Un cero en una sección no implica que no haya actividad en las demás.", destination: "profile",
  },
  {
    id: "notificaciones", chapter: "Ajustes y ayuda", title: "Avisos, conexión y seguridad",
    intro: "Configura la aplicación para enterarte de lo importante sin gastar recursos innecesarios.",
    steps: ["En Ajustes activa las notificaciones en este dispositivo y acepta el permiso del navegador si las quieres. Usa Enviar prueba para comprobarlo.", "Desde Seguridad puedes cambiar tu contraseña con la actual. Si la olvidaste, sal al acceso y usa la recuperación por correo.", "Si no hay conexión, espera a recuperarla antes de registrar o comprar. No repitas una operación sin comprobar primero su resultado."],
    detail: "Los permisos de notificaciones son por dispositivo. Eliminar cuenta es una acción diferente de Cerrar sesión y borra tus datos; las salas con otros miembros se conservan con otro fundador. Si no te funciona una pantalla, anota qué estabas haciendo y evita compartir tu contraseña al pedir ayuda.", destination: "settings",
  },
  {
    id: "final", chapter: "Ajustes y ayuda", title: "Todo listo para seguir a tu ritmo",
    intro: "Ya tienes el recorrido completo. No necesitas probar todas las funciones hoy.",
    steps: ["Empieza por tu perfil y una sala de tu grupo. Revisa los registros antes de añadir nada.", "Consulta Retos e Inventario para conocer tus objetivos y recompensas, sin necesidad de forzar ninguna actividad.", "Cuando quieras repasar algo, vuelve a Ajustes → Tutorial y usa el índice. La bienvenida no volverá a aparecer automáticamente."],
    detail: "Tu colección y tus recuerdos se construyen con el uso normal de la app. La guía puede cerrarse en cualquier momento; terminarla no concede premios ni cambia el progreso del juego.", destination: "home",
  },
];

export const TUTORIAL_CHAPTERS = [...new Set(TUTORIAL_STEPS.map((step) => step.chapter))];
export type TutorialProgress = { paso: string; vistos: string[]; estado: "en_curso" | "pausado" | "completado" };
export function normalizeTutorialProgress(value: Partial<TutorialProgress> | null): TutorialProgress {
  const ids = new Set(TUTORIAL_STEPS.map((step) => step.id));
  return {
    paso: value?.paso && ids.has(value.paso) ? value.paso : TUTORIAL_STEPS[0].id,
    vistos: Array.isArray(value?.vistos) ? [...new Set(value.vistos.filter((id) => ids.has(id)))] : [],
    estado: value?.estado === "completado" || value?.estado === "pausado" ? value.estado : "en_curso",
  };
}
