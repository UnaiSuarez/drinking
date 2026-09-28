/**
 * Ventanas de calendario (independientes de las "temporadas" de liga de
 * cada sala) que dan derecho a un banner exclusivo gratis con solo
 * participar durante esas fechas. Mismo cálculo en cliente (para mostrar
 * "activa ahora") y en la función SQL otorgar_banner_temporada (fuente de
 * la verdad para conceder de verdad).
 */
export type TemporadaCosmetica = "halloween" | "navidad" | "verano";

export const BANNER_POR_TEMPORADA: Record<TemporadaCosmetica, string> = {
  halloween: "noche-de-brujas",
  navidad: "luces-de-navidad",
  verano: "chiringuito-de-verano",
};

const VENTANAS: {
  id: TemporadaCosmetica;
  desde: [number, number];
  hasta: [number, number];
}[] = [
  { id: "halloween", desde: [10, 20], hasta: [11, 2] },
  { id: "navidad", desde: [12, 15], hasta: [1, 6] },
  { id: "verano", desde: [6, 21], hasta: [9, 21] },
];

function enVentana(
  mes: number,
  dia: number,
  desde: [number, number],
  hasta: [number, number]
): boolean {
  const actual = mes * 100 + dia;
  const ini = desde[0] * 100 + desde[1];
  const fin = hasta[0] * 100 + hasta[1];
  if (ini <= fin) return actual >= ini && actual <= fin;
  // La ventana cruza el fin de año (p. ej. Navidad: 15 dic → 6 ene).
  return actual >= ini || actual <= fin;
}

/** Fecha en UTC, igual que el resto de "día de hoy" de la app (racha,
 * cumpleaños): así el cliente y la función SQL nunca se desincronizan por
 * zona horaria. */
export function temporadaCosmeticaActiva(fecha = new Date()): TemporadaCosmetica | null {
  const mes = fecha.getUTCMonth() + 1;
  const dia = fecha.getUTCDate();
  for (const v of VENTANAS) {
    if (enVentana(mes, dia, v.desde, v.hasta)) return v.id;
  }
  return null;
}
