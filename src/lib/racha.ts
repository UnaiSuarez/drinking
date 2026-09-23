/**
 * Racha diaria: días consecutivos con al menos un registro. Se calcula a
 * partir de una lista de timestamps (se agrupan por fecha local del
 * servidor, sin depender de guardar nada aparte).
 */
export function calcularRacha(timestamps: string[]): {
  actual: number;
  mejor: number;
} {
  if (timestamps.length === 0) return { actual: 0, mejor: 0 };

  const dias = [...new Set(timestamps.map((ts) => ts.slice(0, 10)))].sort();

  let mejor = 1;
  let corrida = 1;
  for (let i = 1; i < dias.length; i++) {
    const anterior = new Date(dias[i - 1] + "T00:00:00Z").getTime();
    const actualDia = new Date(dias[i] + "T00:00:00Z").getTime();
    const diff = Math.round((actualDia - anterior) / 86400000);
    corrida = diff === 1 ? corrida + 1 : 1;
    if (corrida > mejor) mejor = corrida;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const ultimoDia = dias[dias.length - 1];

  let actual = 0;
  if (ultimoDia === hoy || ultimoDia === ayer) {
    actual = 1;
    for (let i = dias.length - 1; i > 0; i--) {
      const previo = new Date(dias[i - 1] + "T00:00:00Z").getTime();
      const act = new Date(dias[i] + "T00:00:00Z").getTime();
      if (Math.round((act - previo) / 86400000) === 1) actual++;
      else break;
    }
  }

  return { actual, mejor };
}
