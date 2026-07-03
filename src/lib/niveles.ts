/**
 * Curva de niveles (DISEÑO §5): llegar al nivel N requiere 100 × N^1.4 XP
 * totales. Nivel 10 asequible el primer mes, nivel 50 de veterano.
 */
export function xpTotalParaNivel(n: number): number {
  if (n <= 1) return 0;
  return Math.round(100 * Math.pow(n, 1.4));
}

export function progresoNivel(xp: number): {
  nivel: number;
  actual: number;
  necesario: number;
} {
  let nivel = 1;
  while (xpTotalParaNivel(nivel + 1) <= xp) nivel++;
  const base = xpTotalParaNivel(nivel);
  const siguiente = xpTotalParaNivel(nivel + 1);
  return { nivel, actual: xp - base, necesario: siguiente - base };
}
