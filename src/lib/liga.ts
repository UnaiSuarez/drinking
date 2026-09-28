export const DIVISIONES = [
  { id: "bronce", nombre: "Bronce Resacoso", icono: "🪨", color: "text-bronce", pl: 0, marco: "liga-bronce" },
  { id: "plata", nombre: "Plata Tambaleante", icono: "🥂", color: "text-plata", pl: 50, marco: "liga-plata" },
  { id: "oro", nombre: "Oro Litrona", icono: "🍺", color: "text-ambar", pl: 125, marco: "liga-oro" },
  { id: "platino", nombre: "Platino de Barra", icono: "⚜️", color: "text-emerald-300", pl: 170, marco: "liga-platino" },
  { id: "diamante", nombre: "Diamante Etílico", icono: "💎", color: "text-cian", pl: 230, marco: "liga-diamante" },
  { id: "maestro", nombre: "Maestro Cubata", icono: "🔥", color: "text-rosa", pl: 320, marco: "liga-maestro" },
  { id: "gran-maestro", nombre: "Gran Maestro del After", icono: "🌟", color: "text-amber-200", pl: 450, marco: "liga-gran-maestro" },
  { id: "challenger", nombre: "Challenger del Vodka", icono: "👑", color: "text-oro", pl: 600, marco: "liga-challenger" },
] as const;

export type Division = (typeof DIVISIONES)[number];

/** Challenger requires both the points threshold and first place. */
export function calcularDivision(pl: number, esTop1: boolean): Division {
  return [...DIVISIONES].reverse().find((division) =>
    pl >= division.pl && (division.id !== "challenger" || esTop1)
  ) ?? DIVISIONES[0];
}
