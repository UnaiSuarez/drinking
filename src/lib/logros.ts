export type LogroNoche = { icono: string; nombre: string; rareza: string };

/** Logros que son "estables" durante la noche: una vez conseguidos, la
 * condición no puede dejar de cumplirse. Son los únicos que mostramos como
 * popup en directo — el resto (Ganador, El Fantasma, Sobrio Designado)
 * dependen del resultado final y solo se muestran en el podio. */
export const LOGROS_EN_VIVO = [
  "Kamikaze",
  "Degustador",
  "Búho",
  "Madrugador",
  "Sprint",
];

export const LOGRO_DESCRIPCIONES: Record<string, string> = {
  "Ganador de la noche": "Terminar 1º en puntos de bebida esa noche.",
  "El Fantasma": "Unirte a la noche y no registrar ni una sola bebida.",
  "Sobrio Designado":
    "Registrar solo bebidas sin alcohol (agua o refresco) toda la noche.",
  Kamikaze: "Registrar 10 o más bebidas en una sola noche.",
  Degustador: "Probar 5 tipos de bebida distintos en una misma noche.",
  Búho: "Registrar una bebida entre las 00:00 y las 06:00.",
  Madrugador: "Ser quien abre la noche con el primer registro, antes de las 20:00.",
  Sprint: "Registrar 3 bebidas en menos de 30 minutos.",
};

/**
 * Cálculo ligero de logros de una noche a partir de los registros ya cargados.
 * Es un subconjunto simple del catálogo completo de DISEÑO.md — pensado para
 * dar feedback visible en el podio sin necesitar todavía el motor de logros
 * persistente (con rareza, repetibles, etc.) de la v0.2.
 */
export function calcularLogrosNoche(params: {
  esGanador: boolean;
  bebidas: number;
  puntos: number;
  tiposDistintos: number;
  timestamps: number[]; // ms, de los registros de este jugador
  esPrimerRegistroDeLaNocheAntesDe20h: boolean;
}): LogroNoche[] {
  const {
    esGanador,
    bebidas,
    puntos,
    tiposDistintos,
    timestamps,
    esPrimerRegistroDeLaNocheAntesDe20h,
  } = params;
  const logros: LogroNoche[] = [];

  if (esGanador && bebidas > 0) {
    logros.push({ icono: "🥇", nombre: "Ganador de la noche", rareza: "rara" });
  }
  if (bebidas === 0) {
    logros.push({ icono: "👻", nombre: "El Fantasma", rareza: "rara" });
  }
  if (bebidas > 0 && puntos === 0) {
    logros.push({ icono: "🧊", nombre: "Sobrio Designado", rareza: "rara" });
  }
  if (bebidas >= 10) {
    logros.push({ icono: "💀", nombre: "Kamikaze", rareza: "epica" });
  }
  if (tiposDistintos >= 5) {
    logros.push({ icono: "🌈", nombre: "Degustador", rareza: "rara" });
  }
  if (timestamps.some((t) => new Date(t).getHours() < 6)) {
    logros.push({ icono: "🦉", nombre: "Búho", rareza: "comun" });
  }
  if (esPrimerRegistroDeLaNocheAntesDe20h) {
    logros.push({ icono: "🕐", nombre: "Madrugador", rareza: "comun" });
  }
  if (tieneRachaSprint(timestamps)) {
    logros.push({ icono: "⚡", nombre: "Sprint", rareza: "rara" });
  }

  return logros;
}

/** 3 bebidas del mismo jugador en una ventana de 30 minutos. */
function tieneRachaSprint(timestampsMs: number[]): boolean {
  const ordenados = [...timestampsMs].sort((a, b) => a - b);
  for (let i = 0; i + 2 < ordenados.length; i++) {
    if (ordenados[i + 2] - ordenados[i] <= 30 * 60 * 1000) return true;
  }
  return false;
}
