"use client";

import { useMemo, useState } from "react";

type Mes = { mes: string; noches: number; victorias: number; podios: number; bebidas: number; pl: number };
type Tipo = { nombre: string; total: number };
type SalaDetalle = {
  id: string;
  nombre: string;
  archivada: boolean;
  noches: number;
  victorias: number;
  podios: number;
  pl: number;
  bebidasNoche: number;
  bebidasSueltas: number;
  sojas: number;
};
type Noche = { fecha: string; sala: string; posicion: number | null; pl: number; bebidas: number };

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
  medallas: number;
  primeraNoche: string | null;
  ultimaNoche: string | null;
  meses: Mes[];
  tipos: Tipo[];
  dias: { dia: number; total: number }[];
  horas: { hora: number; total: number }[];
  salasDetalle: SalaDetalle[];
  ultimasNoches: Noche[];
};

const METRICAS: { id: keyof Pick<Mes, "bebidas" | "noches" | "victorias" | "pl">; nombre: string; color: string }[] = [
  { id: "bebidas", nombre: "Bebidas", color: "bg-cian" },
  { id: "noches", nombre: "Noches", color: "bg-ambar" },
  { id: "victorias", nombre: "Victorias", color: "bg-lima" },
  { id: "pl", nombre: "PL", color: "bg-rosa" },
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function numero(value: number) {
  return value.toLocaleString("es-ES");
}

function fecha(value: string | null) {
  return value ? new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function porcentaje(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="rounded-lg border border-borde bg-tarjeta px-3 py-4 text-center">
    <p className={`font-titulo text-2xl ${color}`}>{value}</p>
    <p className="mt-1 text-[11px] uppercase text-texto2">{label}</p>
  </div>;
}

function Resumen({ stats }: { stats: PerfilStats }) {
  return <>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Noches" value={numero(stats.noches)} color="text-ambar" />
      <Stat label="Bebidas" value={numero(stats.bebidasNoche + stats.bebidasSueltas)} color="text-cian" />
      <Stat label="Victorias" value={porcentaje(stats.victorias, stats.noches)} color="text-lima" />
      <Stat label="PL históricos" value={numero(stats.pl)} color="text-rosa" />
    </div>
    <div className="grid grid-cols-2 gap-x-5 rounded-lg border border-borde bg-tarjeta px-4 py-2 sm:grid-cols-3">
      {([
        ["Victorias", numero(stats.victorias)],
        ["Podios", numero(stats.podios)],
        ["Bebidas en noches", numero(stats.bebidasNoche)],
        ["Bebidas sueltas", numero(stats.bebidasSueltas)],
        ["Bebidas por noche", stats.noches ? (stats.bebidasNoche / stats.noches).toFixed(1) : "0"],
        ["Récord en una noche", numero(stats.record)],
        ["SOJAS", numero(stats.sojas)],
        ["Medallas", numero(stats.medallas)],
        ["Salas", numero(stats.salas)],
      ] as [string, string][]).map(([label, value]) => <div key={label} className="flex min-w-0 flex-col justify-between gap-1 border-b border-borde/60 py-3 text-sm sm:flex-row">
        <span className="text-texto2">{label}</span><strong className="font-titulo text-texto">{value}</strong>
      </div>)}
    </div>
    <p className="text-xs text-texto2">Primera noche: {fecha(stats.primeraNoche)} · Última noche: {fecha(stats.ultimaNoche)}</p>
  </>;
}

function Tendencia({ meses }: { meses: Mes[] }) {
  const [periodo, setPeriodo] = useState(12);
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]["id"]>("bebidas");
  const visibles = useMemo(() => periodo === 0 ? meses : meses.slice(-periodo), [meses, periodo]);
  const maximo = Math.max(1, ...visibles.map((mes) => mes[metrica]));
  const seleccion = METRICAS.find((item) => item.id === metrica)!;

  return <section className="space-y-4" aria-labelledby="titulo-tendencia">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="titulo-tendencia" className="font-titulo text-lg text-texto">Evolución mensual</h2>
      <div className="inline-flex rounded-lg border border-borde bg-tarjeta p-0.5" aria-label="Período del gráfico">
        {([ [3, "3m"], [6, "6m"], [12, "12m"], [0, "Todo"] ] as [number, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={periodo === value} onClick={() => setPeriodo(value)} className={`min-w-9 rounded-md px-2 py-1.5 text-xs ${periodo === value ? "bg-cian text-fondo" : "text-texto2"}`}>{label}</button>)}
      </div>
    </div>
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-borde bg-tarjeta p-0.5" aria-label="Métrica del gráfico">
      {METRICAS.map((item) => <button key={item.id} type="button" aria-pressed={metrica === item.id} onClick={() => setMetrica(item.id)} className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${metrica === item.id ? "bg-cian text-fondo" : "text-texto2"}`}>{item.nombre}</button>)}
    </div>
    {visibles.length ? <>
      <div className="space-y-2 rounded-lg border border-borde bg-tarjeta p-4" role="img" aria-label={`Gráfico de ${seleccion.nombre.toLowerCase()} por mes`}>
        {visibles.map((mes) => <div key={mes.mes} className="grid grid-cols-[3.6rem_1fr_2.5rem] items-center gap-2 text-xs">
          <span className="text-texto2">{mes.mes.slice(2)}</span>
          <div className="h-4 overflow-hidden rounded-sm bg-fondo"><div className={`h-full ${seleccion.color} transition-[width] duration-200`} style={{ width: `${(mes[metrica] / maximo) * 100}%` }} /></div>
          <strong className="text-right text-texto">{numero(mes[metrica])}</strong>
        </div>)}
      </div>
      <div className="overflow-x-auto rounded-lg border border-borde bg-tarjeta">
        <table className="w-full min-w-[32rem] text-right text-xs">
          <caption className="sr-only">Detalle de resultados por mes</caption>
          <thead className="border-b border-borde text-texto2"><tr><th scope="col" className="px-3 py-3 text-left">Mes</th><th scope="col" className="px-3 py-3">Noches</th><th scope="col" className="px-3 py-3">Victorias</th><th scope="col" className="px-3 py-3">Podios</th><th scope="col" className="px-3 py-3">Bebidas</th><th scope="col" className="px-3 py-3">PL</th></tr></thead>
          <tbody>{[...visibles].reverse().map((mes) => <tr key={mes.mes} className="border-b border-borde/50 last:border-0"><th scope="row" className="px-3 py-2 text-left font-normal text-texto">{mes.mes}</th><td className="px-3 py-2">{mes.noches}</td><td className="px-3 py-2">{mes.victorias}</td><td className="px-3 py-2">{mes.podios}</td><td className="px-3 py-2">{mes.bebidas}</td><td className="px-3 py-2">{mes.pl}</td></tr>)}</tbody>
        </table>
      </div>
    </> : <p className="rounded-lg border border-borde bg-tarjeta p-5 text-sm text-texto2">Todavía no hay noches cerradas.</p>}
  </section>;
}

function Bebidas({ stats }: { stats: PerfilStats }) {
  const maximo = Math.max(1, ...stats.tipos.map((tipo) => tipo.total));
  const total = stats.bebidasNoche + stats.bebidasSueltas;
  return <section className="space-y-3" aria-labelledby="titulo-bebidas">
    <h2 id="titulo-bebidas" className="font-titulo text-lg text-texto">Bebidas registradas</h2>
    <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <div className="mb-3 flex justify-between text-xs"><span className="text-texto2">En noches</span><span className="text-cian">{numero(stats.bebidasNoche)} · {porcentaje(stats.bebidasNoche, total)}</span></div>
      <div className="flex h-2 overflow-hidden rounded-sm bg-fondo"><div className="bg-cian" style={{ width: `${total ? stats.bebidasNoche / total * 100 : 0}%` }} /><div className="bg-ambar" style={{ width: `${total ? stats.bebidasSueltas / total * 100 : 0}%` }} /></div>
      <div className="mt-3 flex justify-between text-xs"><span className="text-texto2">Sueltas</span><span className="text-ambar">{numero(stats.bebidasSueltas)} · {porcentaje(stats.bebidasSueltas, total)}</span></div>
    </div>
    {stats.tipos.length ? <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <h3 className="mb-3 font-titulo text-sm text-texto">Por tipo</h3>
      <ul className="space-y-3">{stats.tipos.map((tipo) => <li key={tipo.nombre} className="text-xs"><div className="mb-1 flex justify-between gap-2"><span className="min-w-0 break-words text-texto2">{tipo.nombre}</span><strong className="shrink-0 text-texto">{numero(tipo.total)} · {porcentaje(tipo.total, total)}</strong></div><div className="h-2 overflow-hidden rounded-sm bg-fondo"><div className="h-full bg-ambar" style={{ width: `${tipo.total / maximo * 100}%` }} /></div></li>)}</ul>
    </div> : <p className="text-sm text-texto2">Sin bebidas registradas.</p>}
  </section>;
}

function Actividad({ stats }: { stats: PerfilStats }) {
  const maxDia = Math.max(1, ...stats.dias.map((item) => item.total));
  const maxHora = Math.max(1, ...stats.horas.map((item) => item.total));
  return <section className="space-y-3" aria-labelledby="titulo-actividad">
    <h2 id="titulo-actividad" className="font-titulo text-lg text-texto">Cuándo registra</h2>
    <p className="text-xs text-texto2">Bebidas por día y hora · horario de Madrid</p>
    <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <h3 className="mb-3 font-titulo text-sm text-texto">Día de la semana</h3>
      <div className="grid grid-cols-7 gap-1.5">{stats.dias.map((item) => <div key={item.dia} className="min-w-0 text-center" title={`${DIAS[item.dia - 1]}: ${item.total}`}><div className="flex h-20 items-end bg-fondo"><div className="w-full bg-cian" style={{ height: `${item.total / maxDia * 100}%` }} /></div><span className="mt-1 block text-[10px] text-texto2">{DIAS[item.dia - 1]}</span><strong className="block text-[10px] text-texto">{item.total}</strong></div>)}</div>
    </div>
    <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <h3 className="mb-3 font-titulo text-sm text-texto">Hora del día</h3>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">{stats.horas.map((item) => <div key={item.hora} className="text-center" title={`${String(item.hora).padStart(2, "0")}:00 · ${item.total} ${item.total === 1 ? "bebida" : "bebidas"}`}><div className="flex aspect-square items-center justify-center rounded-sm text-[10px] font-bold text-texto" style={{ backgroundColor: `rgba(45,226,230,${item.total ? 0.12 + item.total / maxHora * 0.72 : 0.04})` }}>{item.total || ""}</div><span className="text-[9px] text-texto2">{String(item.hora).padStart(2, "0")}</span></div>)}</div>
    </div>
  </section>;
}

function Salas({ stats }: { stats: PerfilStats }) {
  if (!stats.salasDetalle.length) return null;
  return <section className="space-y-3" aria-labelledby="titulo-salas">
    <h2 id="titulo-salas" className="font-titulo text-lg text-texto">Por sala</h2>
    {stats.salasDetalle.length < stats.salas && <p className="text-xs text-texto2">Solo se muestran las salas que compartes con este jugador. Las demás sí cuentan en los totales.</p>}
    <div className="overflow-x-auto rounded-lg border border-borde bg-tarjeta">
      <table className="w-full min-w-[39rem] text-right text-xs">
        <caption className="sr-only">Estadísticas por sala compartida</caption>
        <thead className="border-b border-borde text-texto2"><tr><th scope="col" className="px-3 py-3 text-left">Sala</th><th scope="col" className="px-3 py-3">Noches</th><th scope="col" className="px-3 py-3">Victorias</th><th scope="col" className="px-3 py-3">Podios</th><th scope="col" className="px-3 py-3">Bebidas</th><th scope="col" className="px-3 py-3">Sueltas</th><th scope="col" className="px-3 py-3">SOJAS</th><th scope="col" className="px-3 py-3">PL</th></tr></thead>
        <tbody>{stats.salasDetalle.map((sala) => <tr key={sala.id} className="border-b border-borde/50 last:border-0"><th scope="row" className="px-3 py-3 text-left font-normal text-texto">{sala.nombre}{sala.archivada && <span className="ml-1 text-texto2">(archivada)</span>}</th><td className="px-3 py-3">{sala.noches}</td><td className="px-3 py-3">{sala.victorias}</td><td className="px-3 py-3">{sala.podios}</td><td className="px-3 py-3">{sala.bebidasNoche}</td><td className="px-3 py-3">{sala.bebidasSueltas}</td><td className="px-3 py-3">{sala.sojas}</td><td className="px-3 py-3 font-bold text-lima">{sala.pl}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function Recientes({ stats }: { stats: PerfilStats }) {
  if (!stats.ultimasNoches.length) return null;
  return <section className="space-y-3" aria-labelledby="titulo-recientes">
    <h2 id="titulo-recientes" className="font-titulo text-lg text-texto">Últimas noches</h2>
    <div className="overflow-x-auto rounded-lg border border-borde bg-tarjeta">
      <table className="w-full min-w-[31rem] text-right text-xs">
        <caption className="sr-only">Últimas doce noches en salas compartidas</caption>
        <thead className="border-b border-borde text-texto2"><tr><th scope="col" className="px-3 py-3 text-left">Fecha</th><th scope="col" className="px-3 py-3 text-left">Sala</th><th scope="col" className="px-3 py-3">Puesto</th><th scope="col" className="px-3 py-3">Bebidas</th><th scope="col" className="px-3 py-3">PL</th></tr></thead>
        <tbody>{stats.ultimasNoches.map((noche, index) => <tr key={`${noche.fecha}-${index}`} className="border-b border-borde/50 last:border-0"><td className="px-3 py-3 text-left text-texto">{fecha(noche.fecha)}</td><td className="px-3 py-3 text-left text-texto2">{noche.sala}</td><td className="px-3 py-3">{noche.posicion ? `#${noche.posicion}` : "—"}</td><td className="px-3 py-3">{noche.bebidas}</td><td className="px-3 py-3 text-lima">{noche.pl}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function Comparativa({ perfil, mia }: { perfil: PerfilStats; mia: PerfilStats }) {
  const rows: [string, number, number][] = [
    ["Noches", perfil.noches, mia.noches], ["Victorias", perfil.victorias, mia.victorias],
    ["Podios", perfil.podios, mia.podios], ["Bebidas en noches", perfil.bebidasNoche, mia.bebidasNoche],
    ["Bebidas sueltas", perfil.bebidasSueltas, mia.bebidasSueltas], ["SOJAS", perfil.sojas, mia.sojas],
    ["PL históricos", perfil.pl, mia.pl],
  ];
  return <section className="space-y-3" aria-labelledby="titulo-comparativa">
    <h2 id="titulo-comparativa" className="font-titulo text-lg text-texto">Comparado contigo</h2>
    <div className="overflow-x-auto rounded-lg border border-borde bg-tarjeta">
      <table className="w-full min-w-[18rem] text-right text-sm"><caption className="sr-only">Comparativa de jugadores en esta sala</caption><thead className="border-b border-borde text-xs text-texto2"><tr><th scope="col" className="px-3 py-3 text-left">Dato</th><th scope="col" className="px-3 py-3">Este perfil</th><th scope="col" className="px-3 py-3">Tú</th></tr></thead><tbody>{rows.map(([label, a, b]) => <tr key={label} className="border-b border-borde/50 last:border-0"><th scope="row" className="px-3 py-2 text-left font-normal text-texto2">{label}</th><td className={`px-3 py-2 font-bold ${a > b ? "text-lima" : "text-texto"}`}>{numero(a)}</td><td className={`px-3 py-2 font-bold ${b > a ? "text-cian" : "text-texto"}`}>{numero(b)}</td></tr>)}</tbody></table>
    </div>
  </section>;
}

export default function PerfilEstadisticas({ global, sala, mia, salaNombre, esMiPerfil }: {
  global: PerfilStats | null;
  sala: PerfilStats | null;
  mia: PerfilStats | null;
  salaNombre: string | null;
  esMiPerfil: boolean;
}) {
  const [vista, setVista] = useState<"global" | "sala">("global");
  if (!global) return <p role="alert" className="rounded-lg border border-borde bg-tarjeta p-5 text-sm text-texto2">Las estadísticas no están disponibles ahora mismo.</p>;
  const actual = vista === "sala" && sala ? sala : global;

  return <div className="space-y-8">
    {sala && salaNombre && <div className="inline-flex rounded-lg border border-borde bg-tarjeta p-0.5" aria-label="Ámbito de las estadísticas">
      <button type="button" aria-pressed={vista === "global"} onClick={() => setVista("global")} className={`rounded-md px-3 py-2 text-sm ${vista === "global" ? "bg-cian text-fondo" : "text-texto2"}`}>Todas las salas</button>
      <button type="button" aria-pressed={vista === "sala"} onClick={() => setVista("sala")} className={`max-w-40 truncate rounded-md px-3 py-2 text-sm ${vista === "sala" ? "bg-cian text-fondo" : "text-texto2"}`}>{salaNombre}</button>
    </div>}

    <section className="space-y-4" aria-labelledby="titulo-resumen-stats">
      <div><h2 id="titulo-resumen-stats" className="font-titulo text-lg text-texto">{vista === "sala" && sala ? `Resumen en ${salaNombre}` : "Resumen global"}</h2><p className="text-xs text-texto2">{vista === "sala" && sala ? "Todas las temporadas de esta sala." : "Todas las salas, incluidas las archivadas."}</p></div>
      <Resumen stats={actual} />
    </section>

    {vista === "sala" && sala && mia && !esMiPerfil && <Comparativa perfil={sala} mia={mia} />}
    <Tendencia key={vista} meses={actual.meses} />
    <div className="grid gap-8 md:grid-cols-2 md:items-start"><Bebidas stats={actual} /><Actividad stats={actual} /></div>
    <Salas stats={actual} />
    <Recientes stats={actual} />
  </div>;
}
