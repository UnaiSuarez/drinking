/**
 * Ventanas de calendario (independientes de las "temporadas" de liga de
 * cada sala) con 3 niveles cada una: común (participar), épico (varios
 * días) y legendario (ganar una noche). Cada nivel da un banner y un marco
 * exclusivos; el legendario además desbloquea la skin de evento de los 5
 * personajes ocultos (una vez conseguida, ya vale para cualquier evento).
 * Mismo cálculo en cliente (para mostrar "activo ahora") y en la función
 * SQL otorgar_recompensas_temporada (fuente de la verdad para conceder).
 */
export type TemporadaCosmetica = "halloween" | "navidad" | "anio-nuevo" | "verano";
export type NivelEvento = "comun" | "epico" | "legendario";

export const EVENTOS_COSMETICOS: {
  id: TemporadaCosmetica;
  nombre: string;
  desde: [number, number];
  hasta: [number, number];
}[] = [
  { id: "halloween", nombre: "Halloween", desde: [10, 20], hasta: [11, 2] },
  { id: "navidad", nombre: "Navidad", desde: [12, 15], hasta: [12, 30] },
  { id: "anio-nuevo", nombre: "Año Nuevo", desde: [12, 31], hasta: [1, 2] },
  { id: "verano", nombre: "Verano", desde: [6, 21], hasta: [9, 21] },
];

/** Banner y marco (mismo id) por evento y nivel. */
export const RECOMPENSA_POR_NIVEL: Record<TemporadaCosmetica, Record<NivelEvento, string>> = {
  halloween: { comun: "noche-de-brujas", epico: "halloween-epico", legendario: "halloween-legendario" },
  navidad: { comun: "luces-de-navidad", epico: "navidad-epico", legendario: "navidad-legendario" },
  "anio-nuevo": { comun: "anio-nuevo-comun", epico: "anio-nuevo-epico", legendario: "anio-nuevo-legendario" },
  verano: { comun: "chiringuito-de-verano", epico: "verano-epico", legendario: "verano-legendario" },
};

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
  for (const v of EVENTOS_COSMETICOS) {
    if (enVentana(mes, dia, v.desde, v.hasta)) return v.id;
  }
  return null;
}
