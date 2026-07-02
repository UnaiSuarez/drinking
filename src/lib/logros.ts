export type LogroNoche = { icono: string; nombre: string };

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
    logros.push({ icono: "🥇", nombre: "Ganador de la noche" });
  }
  if (bebidas === 0) {
    logros.push({ icono: "👻", nombre: "El Fantasma" });
  }
  if (bebidas > 0 && puntos === 0) {
    logros.push({ icono: "🧊", nombre: "Sobrio Designado" });
  }
  if (bebidas >= 10) {
    logros.push({ icono: "💀", nombre: "Kamikaze" });
  }
  if (tiposDistintos >= 5) {
    logros.push({ icono: "🌈", nombre: "Degustador" });
  }
  if (timestamps.some((t) => new Date(t).getHours() < 6)) {
    logros.push({ icono: "🦉", nombre: "Búho" });
  }
  if (esPrimerRegistroDeLaNocheAntesDe20h) {
    logros.push({ icono: "🕐", nombre: "Madrugador" });
  }
  if (tieneRachaSprint(timestamps)) {
    logros.push({ icono: "⚡", nombre: "Sprint" });
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
