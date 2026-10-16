import type { CartaActiva } from "@/lib/inventario";

/** Fila de `sueltas_en_vivo`: bono ya resuelto por el servidor para una carta
 * que no cuelga de un registro (Salpicón, Dado Maldito, Confeti...). `filas`
 * en el contexto son solo las de ESTA activación de la carta. */
export type FilaSuelta = { cartaId: string; usuarioId: string; pl: number };

export type ContextoTexto = {
  filas?: FilaSuelta[];
  nombres?: Map<string, string>;
  /** Chapas ya concedidas (Jackpot Siete / Lluvia de Chapas). */
  chapas?: number;
  /** Nombre de la carta robada / duplicada / sorteada, si procede. */
  cartaNombre?: string;
};

function fmtPl(n: number) {
  return `${n > 0 ? "+" : ""}${n} PL`;
}

function hasta(activa: CartaActiva) {
  if (!activa.expiraEn) return "";
  const hora = new Date(activa.expiraEn).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return ` (hasta las ${hora})`;
}

/**
 * Qué hace EXACTAMENTE una carta de noche ya lanzada, con la misma lógica que
 * aplica finalizar_noche: ventanas, cifras y condiciones. Si el resultado
 * depende de un sorteo del servidor (Salpicón, Dado Maldito, Meteorito...) se
 * muestra el resultado real a partir de las filas de `sueltas_en_vivo`.
 */
export function textoCartaActiva(activa: CartaActiva, ctx: ContextoTexto = {}): string {
  const yo = activa.usuarioNombre;
  const obj = activa.objetivoNombre ?? "el objetivo";
  const v = hasta(activa);
  const mias = ctx.filas ?? [];
  const nombre = (id: string) => ctx.nombres?.get(id) ?? "???";

  switch (activa.cartaId) {
    case "cubata-obligatorio":
      return `${obj} gana +5 PL si su primera bebida${v} es un cubata o combinado. Si es otra cosa, no recibe nada.`;
    case "chupito-castigo":
      return `La primera bebida de ${obj}${v} solo puntúa si es chupito (y además da +3 PL). Cualquier otra vale 0 PL.`;
    case "ronda-relampago":
      return `La primera bebida de cada jugador${v} da +2 PL.`;
    case "escudo-resaca":
      return `${yo} está protegido${v}: las cartas de objetivo que le lancen no tienen efecto.`;
    case "cambio-de-vaso":
      return `${yo} le cambió la carta activa a ${obj}.`;
    case "todos-al-bar":
      return `Todos deben registrar una bebida${v}. Quien no lo haga pierde 3 PL.`;
    case "selfie-obligatoria":
      return `${obj} pierde 2 PL si su primera bebida${v} no lleva comentario.`;
    case "pirata-del-hielo":
      return `La primera bebida de ${yo}${v} que valga 0 PL (agua o refresco) suma +1 PL.`;
    case "ticket-barra-libre":
      return `La primera bebida de ${yo}${v} da +4 PL si es de un tipo distinto a la anterior.`;
    case "ultimo-aviso":
      return `Cada bebida que registre cualquiera${v} da +1 PL extra.`;
    case "salpicon-puntos": {
      const f = mias.length ? mias[0] : null;
      return f
        ? `${yo} ha ganado ${fmtPl(f.pl)} al instante (el sorteo da entre +1 y +5).`
        : `${yo} gana entre +1 y +5 PL al instante.`;
    }
    case "brindis-forzado":
      return `Si ${obj} registra una bebida${v}, ${yo} gana +3 PL.`;
    case "doble-o-nada":
      return `La primera bebida de ${yo}${v} vale el doble.`;
    case "triple-amenaza":
      return `Las 3 primeras bebidas de ${yo}${v} de tipo distinto al anterior dan +3 PL cada una.`;
    case "noche-x10":
      return `Todas las bebidas que se registren${v} valen x10.`;
    case "happy-hour-salvaje":
      return `La primera bebida de cada jugador${v} da +2 PL.`;
    case "candado-de-barra":
      return `${yo} está protegido${v}: las cartas de objetivo contra él no tienen efecto.`;
    case "mano-larga":
      return `${yo} le robó una carta a ${obj}${ctx.cartaNombre ? `: "${ctx.cartaNombre}"` : ""}.`;
    case "copia-de-seguridad":
      return `${yo} duplicó una carta de su inventario${ctx.cartaNombre ? `: "${ctx.cartaNombre}"` : ""}.`;
    case "espejo-borracho":
      return `Las cartas de objetivo que lancen contra ${yo}${v} rebotan a quien las lanzó.`;
    case "remontada-imposible":
      return activa.condicionCumplida
        ? `${yo} iba último: sus 2 primeras bebidas${v} dan +6 PL cada una.`
        : `${yo} no iba último al usarla: la carta no tiene efecto.`;
    case "maldicion-del-lider":
      return `${obj} pierde 1 PL por cada bebida que registre${v}.`;
    case "inmunidad-vip":
      return `${yo} es inmune${v}: las cartas de objetivo no le afectan.`;
    case "trono-del-campeon":
      return `Si ${yo} termina la noche en 1º puesto, gana un cofre épico al cerrar.`;
    case "tormenta-challenger":
      return `Las bebidas${v} de quienes acaben en el top 3 valen x2 (se calcula al cerrar la noche).`;
    case "jackpot-siete":
      return ctx.chapas != null
        ? `${yo} ha ganado ${ctx.chapas} chapas.`
        : `${yo} ha ganado una cantidad aleatoria de chapas (entre 20 y 79).`;
    case "lluvia-de-chapas":
      return ctx.chapas != null
        ? `${yo} ha ganado ${ctx.chapas} chapas según su puesto actual.`
        : `${yo} gana chapas según su puesto: 60 el 1º, 45 el 2º, 30 el 3º y 15 el resto.`;
    case "luna-llena":
      return `Los chupitos${v} dan +4 PL extra.`;
    case "confeti-caos": {
      const n = mias.length;
      return n
        ? `+1 PL para cada uno de los ${n} jugadores de la noche.`
        : `+1 PL para todos los jugadores de la noche.`;
    }
    case "sombra-del-after":
      return activa.condicionCumplida
        ? `${yo} iba por debajo de la mitad: gana +5 PL de madrugada.`
        : `${yo} iba en la mitad alta del ranking: la carta no da nada.`;
    case "dado-maldito": {
      if (!mias.length) return "El dado se ha tirado y afecta a toda la sala.";
      if (mias.every((f) => f.pl === 3)) return "El dado salió bien: +3 PL para todos.";
      if (mias.every((f) => f.pl === -2)) return "El dado salió mal: -2 PL para todos.";
      const afortunado = mias.find((f) => f.pl === 10);
      return afortunado
        ? `Jackpot del dado: +10 PL para ${nombre(afortunado.usuarioId)}.`
        : "El dado se ha tirado y afecta a toda la sala.";
    }
    case "brindis-prohibido":
      return `${yo} y ${obj} comparten destino${v}: los dos acaban con la media de los PL que sumen entre ambos en ese tramo.`;
    case "coronacion-secreta":
      return activa.condicionCumplida
        ? `${yo} estaba fuera del podio: si termina en el podio, gana un cofre legendario al cerrar.`
        : `${yo} ya estaba en el podio al usarla: no da cofre.`;
    case "meteorito-de-caos": {
      const agraciados = mias.filter((f) => f.pl === 5).map((f) => nombre(f.usuarioId));
      return agraciados.length
        ? `Se cancelaron los bonus activos y +5 PL para ${agraciados.join(", ")}.`
        : "Se cancelaron todos los bonus activos y se reparten +5 PL entre 3 jugadores al azar.";
    }
    case "caliz-final-boss":
      return `Si ${yo} acaba en el podio, su última bebida de la noche vale x5 (se calcula al cerrar).`;
    default:
      return "";
  }
}
