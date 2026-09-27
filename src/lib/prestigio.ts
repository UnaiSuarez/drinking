export const NIVEL_PRESTIGIO = 50;

export function tituloPrestigio(ciclo: number): string {
  return ciclo === 1 ? "Primera Ascensión" : `Ascensión ${ciclo}`;
}

export function claveCelebracion(userId: string, ciclo: number): string {
  return ciclo > 0 ? `nivel-visto:${userId}:prestigio:${ciclo}` : `nivel-visto:${userId}`;
}

export function normalizarVitrina(slugs: string[], disponibles: string[]): string[] {
  const validos = new Set(disponibles);
  return [...new Set(slugs)].filter((slug) => validos.has(slug)).slice(0, 3);
}
