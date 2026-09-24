export type PerfilStats = {
  noches: number;
  victorias: number;
  podios: number;
  pl: number;
  bebidasNoche: number;
  bebidasSueltas: number;
  sojas: number;
  salas: number;
  record: number;
  primeraNoche: string | null;
  ultimaNoche: string | null;
  meses: { mes: string; noches: number; victorias: number; bebidas: number }[];
  tipos: { nombre: string; total: number }[];
};

function fecha(value: string | null) {
  return value ? new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function porcentaje(n: number, total: number) {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
}

function fila(label: string, value: number | string) {
  return <li key={label} className="flex justify-between gap-3 border-b border-borde/60 py-2 text-sm last:border-0"><span className="text-texto2">{label}</span><strong className="text-right font-titulo text-texto">{value}</strong></li>;
}

export default function PerfilEstadisticas({
  global,
  sala,
  mia,
  salaNombre,
  esMiPerfil,
}: {
  global: PerfilStats | null;
  sala: PerfilStats | null;
  mia: PerfilStats | null;
  salaNombre: string | null;
  esMiPerfil: boolean;
}) {
  if (!global) return <p className="mb-8 text-sm text-texto2">Las estadísticas no están disponibles ahora mismo.</p>;
  const meses = global.meses.slice(-12);
  const maxBebidas = Math.max(1, ...meses.map((mes) => mes.bebidas));
  const maxTipo = Math.max(1, ...global.tipos.slice(0, 6).map((tipo) => tipo.total));

  return <section className="mb-8 space-y-6" aria-labelledby="titulo-estadisticas-perfil">
    <div>
      <h2 id="titulo-estadisticas-perfil" className="font-titulo text-xl text-texto">Estadísticas de todas las salas</h2>
      <p className="text-xs text-texto2">Historial acumulado, incluidas salas archivadas y bebidas sueltas.</p>
    </div>

    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg border border-borde bg-tarjeta p-3"><p className="font-titulo text-2xl text-ambar">{global.noches}</p><p className="text-[10px] uppercase text-texto2">Noches</p></div>
      <div className="rounded-lg border border-borde bg-tarjeta p-3"><p className="font-titulo text-2xl text-cian">{porcentaje(global.victorias, global.noches)}</p><p className="text-[10px] uppercase text-texto2">Victorias</p></div>
      <div className="rounded-lg border border-borde bg-tarjeta p-3"><p className="font-titulo text-2xl text-lima">{global.pl}</p><p className="text-[10px] uppercase text-texto2">PL históricos</p></div>
    </div>

    <div className="rounded-lg border border-borde bg-tarjeta px-4 py-2">
      <ul>
        {fila("Salas", global.salas)}
        {fila("Victorias", global.victorias)}
        {fila("Podios", global.podios)}
        {fila("Bebidas en noches", global.bebidasNoche)}
        {fila("Bebidas sueltas", global.bebidasSueltas)}
        {fila("Bebidas por noche", global.noches ? (global.bebidasNoche / global.noches).toFixed(1) : "0")}
        {fila("Récord en una noche", global.record)}
        {fila("SOJAS", global.sojas)}
        {fila("Primera noche", fecha(global.primeraNoche))}
        {fila("Última noche", fecha(global.ultimaNoche))}
      </ul>
    </div>

    {meses.length > 0 && <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <h3 className="mb-3 font-titulo text-base text-texto">Bebidas en noches por mes</h3>
      <ul className="space-y-2">
        {meses.map((mes) => <li key={mes.mes} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-xs text-texto2">
          <span>{mes.mes}</span><div className="h-3 overflow-hidden rounded-sm bg-fondo"><div className="h-full bg-cian" style={{ width: `${Math.max(2, mes.bebidas / maxBebidas * 100)}%` }} /></div><strong className="text-right text-texto">{mes.bebidas}</strong>
        </li>)}
      </ul>
    </div>}

    {global.tipos.length > 0 && <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <h3 className="mb-3 font-titulo text-base text-texto">Bebidas más registradas</h3>
      <ul className="space-y-2">
        {global.tipos.slice(0, 6).map((tipo) => <li key={tipo.nombre} className="text-xs text-texto2"><div className="mb-1 flex justify-between gap-2"><span>{tipo.nombre}</span><strong className="text-texto">{tipo.total}</strong></div><div className="h-1.5 rounded-sm bg-fondo"><div className="h-full rounded-sm bg-ambar" style={{ width: `${tipo.total / maxTipo * 100}%` }} /></div></li>)}
      </ul>
    </div>}

    {sala && salaNombre && <div className="rounded-lg border border-cian/50 bg-tarjeta p-4">
      <h3 className="font-titulo text-lg text-cian">En {salaNombre}</h3>
      <p className="mb-3 text-xs text-texto2">Historial de esta sala, incluidas temporadas anteriores.</p>
      <ul>
        {fila("Noches", sala.noches)}
        {fila("Victorias", sala.victorias)}
        {fila("Podios", sala.podios)}
        {fila("Bebidas en noches", sala.bebidasNoche)}
        {fila("Bebidas sueltas", sala.bebidasSueltas)}
        {fila("PL históricos", sala.pl)}
        {fila("SOJAS", sala.sojas)}
      </ul>
      {!esMiPerfil && mia && <div className="mt-5 border-t border-borde pt-4">
        <h4 className="mb-2 font-titulo text-sm text-texto">Comparado contigo</h4>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-xs text-texto2">
          <span /> <strong className="text-texto">Este perfil</strong><strong className="text-cian">Tú</strong>
          {([ ["Noches", sala.noches, mia.noches], ["Victorias", sala.victorias, mia.victorias], ["Podios", sala.podios, mia.podios], ["Bebidas", sala.bebidasNoche, mia.bebidasNoche], ["PL", sala.pl, mia.pl], ["SOJAS", sala.sojas, mia.sojas] ] as [string, number, number][]).map(([label, a, b]) => <div key={label} className="col-span-3 grid grid-cols-subgrid border-t border-borde/40 pt-2"><span>{label}</span><strong className="text-right text-texto">{a}</strong><strong className="text-right text-cian">{b}</strong></div>)}
        </div>
      </div>}
    </div>}
  </section>;
}
