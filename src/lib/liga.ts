export type Division = {
  nombre: string;
  icono: string;
  /** Clase de color Tailwind para el texto */
  color: string;
};

/**
 * Divisiones con umbrales fijos calibrados para el "peor caso" (~5 noches
 * buenas completan la escalera). Ver DISEÑO.md §4.1. Challenger es único:
 * el nº1 en PL de la sala, siempre que tenga 300+.
 */
export function calcularDivision(pl: number, esTop1: boolean): Division {
  if (pl >= 300 && esTop1)
    return { nombre: "Challenger del Vodka", icono: "👑", color: "text-oro" };
  if (pl >= 300)
    return { nombre: "Maestro Cubata", icono: "🔥", color: "text-rosa" };
  if (pl >= 210)
    return { nombre: "Diamante Etílico", icono: "💎", color: "text-cian" };
  if (pl >= 125)
    return { nombre: "Oro Litrona", icono: "🍺", color: "text-ambar" };
  if (pl >= 50)
    return { nombre: "Plata Tambaleante", icono: "🥂", color: "text-plata" };
  return { nombre: "Bronce Resacoso", icono: "🪨", color: "text-bronce" };
}
