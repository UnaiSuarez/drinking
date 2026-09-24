import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcularRacha } from "@/lib/racha";

const COLORES = ["bg-ambar", "bg-cian", "bg-rosa", "bg-lima", "bg-oro"] as const;

function BarraLista({
  filas,
}: {
  filas: { clave: string; etiqueta: string; valor: number }[];
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="space-y-3">
      {filas.map((f, i) => (
        <li key={f.clave}>
          <div className="mb-1 flex items-center justify-between text-sm text-texto">
            <span>{f.etiqueta}</span>
            <span className="font-titulo text-texto2">{f.valor}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-fondo">
            <div
              className={`h-full rounded-full ${COLORES[i % COLORES.length]} transition-all`}
              style={{ width: `${(f.valor / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

type Rango = "semana" | "mes" | "temporada" | "total" | "fechas";

type RegistroEstadistica = {
  usuario_id: string;
  bebida_tipo_id: number;
  bebida_catalogo_id: string | null;
  ts: string;
  noche_id: string | null;
};

function fechaMadrid(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(fecha);
  const campo = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

function horaMadrid(fecha: Date) {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23",
  }).format(fecha));
}

const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: "semana", etiqueta: "7 días" },
  { valor: "mes", etiqueta: "30 días" },
  { valor: "temporada", etiqueta: "Temporada" },
  { valor: "total", etiqueta: "Total" },
];

/** Agrupa timestamps en como mucho ~12 barras: por día, semana o mes según
 * cuánto abarque el rango elegido, para que la gráfica siempre sea legible. */
function evolucion(fechas: Date[], desde: Date, hasta: Date) {
  const spanDias = Math.max(1, (hasta.getTime() - desde.getTime()) / 86400000);
  const modo: "dia" | "semana" | "mes" =
    spanDias <= 14 ? "dia" : spanDias <= 90 ? "semana" : "mes";

  function claveDe(d: Date): { clave: string; etiqueta: string; orden: number } {
    if (modo === "dia") {
      const clave = d.toISOString().slice(0, 10);
      return {
        clave,
        etiqueta: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
        orden: d.getTime(),
      };
    }
    if (modo === "semana") {
      const lunes = new Date(d);
      const diaSemana = (lunes.getUTCDay() + 6) % 7; // 0 = lunes
      lunes.setUTCDate(lunes.getUTCDate() - diaSemana);
      const clave = lunes.toISOString().slice(0, 10);
      return {
        clave,
        etiqueta: lunes.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
        orden: lunes.getTime(),
      };
    }
    const clave = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    return {
      clave,
      etiqueta: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      orden: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).getTime(),
    };
  }

  const conteo = new Map<string, { etiqueta: string; orden: number; valor: number }>();
  for (const f of fechas) {
    const { clave, etiqueta, orden } = claveDe(f);
    const actual = conteo.get(clave);
    if (actual) actual.valor++;
    else conteo.set(clave, { etiqueta, orden, valor: 1 });
  }

  return [...conteo.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .slice(-12)
    .map(([clave, v]) => ({ clave, etiqueta: v.etiqueta, valor: v.valor }));
}

export default async function EstadisticasSalaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string; jugador?: string }>;
}) {
  const { id } = await params;
  const { rango: rangoParam, desde: desdeParam, hasta: hastaParam, jugador: jugadorParam } = await searchParams;
  const rango: Rango = (["semana", "mes", "temporada", "total", "fechas"] as const).includes(
    rangoParam as Rango
  )
    ? (rangoParam as Rango)
    : "total";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre, config")
    .eq("id", id)
    .is("archivada_at", null)
    .single();
  if (!sala) notFound();

  const esPermanente = (sala.config as Record<string, unknown> | null)?.tipo === "permanente";

  const { data: temporada } = await supabase
    .from("temporadas")
    .select("id, nombre, inicio")
    .eq("sala_id", id)
    .eq("estado", "activa")
    .maybeSingle();

  const { data: bebidasTipo } = await supabase
    .from("bebidas_tipo")
    .select("id, nombre, icono")
    .or(`sala_id.is.null,sala_id.eq.${id}`);

  const { data: catalogo } = esPermanente
    ? await supabase
        .from("bebidas_catalogo")
        .select("id, nombre, rareza")
        .or(`sala_id.is.null,sala_id.eq.${id}`)
    : { data: null };

  const { data: miembros } = await supabase
    .from("sala_miembros")
    .select("usuario_id, perfiles(nombre)")
    .eq("sala_id", id);

  const registrosTodos: RegistroEstadistica[] = [];
  for (let desdeFila = 0; ; desdeFila += 1000) {
    const { data, error } = await supabase
      .from("registros_sala")
      .select("usuario_id, bebida_tipo_id, bebida_catalogo_id, ts, noche_id")
      .eq("sala_id", id)
      .eq("anulado", false)
      .order("ts", { ascending: true })
      .range(desdeFila, desdeFila + 999);
    if (error) throw new Error(`No se pudieron cargar las estadísticas: ${error.message}`);
    registrosTodos.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }

  const bebidasMap = new Map(
    (bebidasTipo ?? []).map((b) => [b.id, { nombre: b.nombre, icono: b.icono }])
  );
  const RAREZA_ETIQUETA: Record<string, string> = {
    comun: "",
    rara: " 🔷",
    epica: " 💗",
    legendaria: " 👑",
  };
  const catalogoMap = new Map(
    (catalogo ?? []).map((c) => [
      c.id,
      `${c.nombre}${RAREZA_ETIQUETA[c.rareza] ?? ""}`,
    ])
  );
  const nombreMap = new Map(
    (miembros ?? []).map((m) => {
      const p = m.perfiles as unknown as { nombre: string } | null;
      return [m.usuario_id, p?.nombre ?? "???"];
    })
  );

  const jugadorSeleccionado = (miembros ?? []).some((m) => m.usuario_id === jugadorParam)
    ? jugadorParam
    : null;
  const todos = jugadorSeleccionado
    ? registrosTodos.filter((r) => r.usuario_id === jugadorSeleccionado)
    : registrosTodos;
  const desdeInput = /^\d{4}-\d{2}-\d{2}$/.test(desdeParam ?? "") ? desdeParam! : "";
  const hastaInput = /^\d{4}-\d{2}-\d{2}$/.test(hastaParam ?? "") ? hastaParam! : "";
  const fechasValidas = rango === "fechas" && desdeInput && hastaInput && desdeInput <= hastaInput;

  // Racha: siempre sobre el historial completo del usuario, no del filtro.
  const racha = calcularRacha(
    todos.filter((r) => r.usuario_id === user!.id).map((r) => r.ts)
  );

  const ahora = new Date();
  let desde: Date | null = null;
  if (rango === "semana") desde = new Date(ahora.getTime() - 7 * 86400000);
  else if (rango === "mes") desde = new Date(ahora.getTime() - 30 * 86400000);
  else if (rango === "temporada" && temporada) desde = new Date(temporada.inicio);

  const regs = todos.filter((r) => {
    if (fechasValidas) {
      const dia = fechaMadrid(new Date(r.ts));
      return dia >= desdeInput && dia <= hastaInput;
    }
    return !desde || new Date(r.ts) >= desde;
  });

  const sojasPropias: { ts: string }[] = [];
  if (!jugadorSeleccionado || jugadorSeleccionado === user!.id) {
    for (let desdeFila = 0; ; desdeFila += 1000) {
      const { data, error } = await supabase
        .from("sojas_registros")
        .select("ts")
        .eq("sala_id", id)
        .eq("usuario_id", user!.id)
        .order("ts", { ascending: true })
        .range(desdeFila, desdeFila + 999);
      if (error) throw new Error(`No se pudieron cargar las SOJAS: ${error.message}`);
      sojasPropias.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  const sojasEnRango = sojasPropias.filter((r) => {
    if (fechasValidas) {
      const dia = fechaMadrid(new Date(r.ts));
      return dia >= desdeInput && dia <= hastaInput;
    }
    return !desde || new Date(r.ts) >= desde;
  }).length;

  const total = regs.length;
  const enNoches = regs.filter((r) => r.noche_id !== null).length;
  const sueltas = total - enNoches;

  const porTipo = new Map<number, number>();
  const porCatalogo = new Map<string, number>();
  const porUsuarioTotal = new Map<string, number>();
  const porUsuarioTipos = new Map<string, Set<number>>();
  const porDia = [0, 0, 0, 0, 0, 0, 0]; // domingo..sábado
  const porHora = Array.from({ length: 24 }, () => 0);
  const porNoche = new Map<string, { fecha: string; total: number }>();

  for (const r of regs) {
    porTipo.set(r.bebida_tipo_id, (porTipo.get(r.bebida_tipo_id) ?? 0) + 1);
    if (r.bebida_catalogo_id) {
      porCatalogo.set(
        r.bebida_catalogo_id,
        (porCatalogo.get(r.bebida_catalogo_id) ?? 0) + 1
      );
    }
    porUsuarioTotal.set(r.usuario_id, (porUsuarioTotal.get(r.usuario_id) ?? 0) + 1);
    if (!porUsuarioTipos.has(r.usuario_id)) porUsuarioTipos.set(r.usuario_id, new Set());
    porUsuarioTipos.get(r.usuario_id)!.add(r.bebida_tipo_id);
    const fecha = new Date(r.ts);
    porDia[new Date(`${fechaMadrid(fecha)}T12:00:00Z`).getUTCDay()]++;
    porHora[horaMadrid(fecha)]++;
    if (r.noche_id) {
      const anterior = porNoche.get(r.noche_id);
      porNoche.set(r.noche_id, {
        fecha: anterior?.fecha ?? fechaMadrid(fecha),
        total: (anterior?.total ?? 0) + 1,
      });
    }
  }

  const filasNoches = [...porNoche.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([nocheId, info]) => ({
      clave: nocheId,
      etiqueta: new Date(`${info.fecha}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
      valor: info.total,
    }));
  const mediaPorNoche = porNoche.size > 0 ? (enNoches / porNoche.size).toFixed(1).replace(".", ",") : "0";

  const filasTipo = [...porTipo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipoId, valor]) => {
      const info = bebidasMap.get(tipoId);
      return {
        clave: String(tipoId),
        etiqueta: `${info?.icono ?? "🥤"} ${info?.nombre ?? "???"}`,
        valor,
      };
    });

  const filasCatalogo = [...porCatalogo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([catalogoId, valor]) => ({
      clave: catalogoId,
      etiqueta: catalogoMap.get(catalogoId) ?? "???",
      valor,
    }));

  const rankingTotal = [...porUsuarioTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([usuarioId, valor]) => ({
      clave: usuarioId,
      etiqueta: `${nombreMap.get(usuarioId) ?? "???"}${usuarioId === user!.id ? " (tú)" : ""}`,
      valor,
    }));

  const rankingVariedad = [...porUsuarioTipos.entries()]
    .map(([usuarioId, tipos]) => [usuarioId, tipos.size] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([usuarioId, valor]) => ({
      clave: usuarioId,
      etiqueta: `${nombreMap.get(usuarioId) ?? "???"}${usuarioId === user!.id ? " (tú)" : ""}`,
      valor,
    }));

  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const filasDia = DIAS.map((nombre, i) => ({
    clave: String(i),
    etiqueta: nombre,
    valor: porDia[i],
  }));

  const primerRegistro = regs.reduce<Date | null>((min, r) => {
    const d = new Date(r.ts);
    return !min || d < min ? d : min;
  }, null);
  const filasEvolucion =
    total > 0
      ? evolucion(regs.map((r) => new Date(r.ts)), desde ?? primerRegistro!, ahora)
      : [];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${id}`} className="text-sm text-texto2">
        ← {sala.nombre}
      </Link>
      <h1 className="mb-2 mt-2 font-titulo text-3xl text-texto">
        📊 Estadísticas
      </h1>
      <p className="mb-4 text-sm text-texto2">
        {rango === "total"
          ? `De toda la historia de ${sala.nombre}, dentro y fuera de las noches.`
          : `De ${sala.nombre} en el periodo elegido.`}
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {RANGOS.filter((r) => r.valor !== "temporada" || temporada).map((r) => (
          <Link
            key={r.valor}
            href={`/sala/${id}/estadisticas?${new URLSearchParams({
              rango: r.valor,
              ...(jugadorSeleccionado ? { jugador: jugadorSeleccionado } : {}),
            })}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
              rango === r.valor
                ? "border-ambar bg-ambar/10 text-ambar"
                : "border-borde text-texto2"
            }`}
          >
            {r.etiqueta}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-3 border-y border-borde py-4">
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="rango" value={rango} />
          {rango === "fechas" && <><input type="hidden" name="desde" value={desdeInput} /><input type="hidden" name="hasta" value={hastaInput} /></>}
          <label className="min-w-0 flex-1 text-xs text-texto2">
            Jugador
            <select name="jugador" defaultValue={jugadorSeleccionado ?? ""} className="mt-1 w-full rounded-lg border border-borde bg-tarjeta px-2 py-2 text-sm text-texto">
              <option value="">Toda la sala</option>
              {[...(miembros ?? [])].sort((a, b) => (nombreMap.get(a.usuario_id) ?? "").localeCompare(nombreMap.get(b.usuario_id) ?? "", "es")).map((m) => (
                <option key={m.usuario_id} value={m.usuario_id}>{nombreMap.get(m.usuario_id) ?? "???"}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-cian px-3 py-2 text-sm text-cian">Ver</button>
        </form>
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="rango" value="fechas" />
          {jugadorSeleccionado && <input type="hidden" name="jugador" value={jugadorSeleccionado} />}
          <label className="min-w-0 flex-1 text-xs text-texto2">Desde
            <input type="date" name="desde" required defaultValue={desdeInput} className="mt-1 w-full rounded-lg border border-borde bg-tarjeta px-2 py-2 text-sm text-texto" />
          </label>
          <label className="min-w-0 flex-1 text-xs text-texto2">Hasta
            <input type="date" name="hasta" required defaultValue={hastaInput} className="mt-1 w-full rounded-lg border border-borde bg-tarjeta px-2 py-2 text-sm text-texto" />
          </label>
          <button type="submit" className="rounded-lg border border-cian px-3 py-2 text-sm text-cian">Ver</button>
        </form>
        {rango === "fechas" && !fechasValidas && <p className="text-xs text-rosa">Elige un intervalo de fechas válido.</p>}
      </div>

      {esPermanente && (racha.actual > 0 || racha.mejor > 0) && (
        <section className="mb-6 flex items-center justify-center gap-2 rounded-2xl border border-ambar/50 bg-ambar/10 px-4 py-3 text-center text-sm text-texto">
          <span className="text-2xl">🔥</span>
          <span>
            <span className="font-titulo text-ambar">{racha.actual}</span> día
            {racha.actual === 1 ? "" : "s"} de racha actual · récord{" "}
            <span className="font-titulo text-ambar">{racha.mejor}</span>
          </span>
        </section>
      )}

      <section className="mb-8 grid grid-cols-2 gap-4 border-b border-borde pb-6">
        <div><p className="font-titulo text-3xl text-ambar">{total}</p><p className="text-xs text-texto2">bebidas registradas</p></div>
        <div><p className="font-titulo text-3xl text-cian">{sojasEnRango}</p><p className="text-xs text-texto2">tus SOJAS</p></div>
        <div><p className="font-titulo text-2xl text-texto">{porNoche.size}</p><p className="text-xs text-texto2">noches con registros</p></div>
        <div><p className="font-titulo text-2xl text-texto">{mediaPorNoche}</p><p className="text-xs text-texto2">bebidas por noche</p></div>
        {esPermanente && <p className="col-span-2 text-xs text-texto2">{enNoches} en noches · {sueltas} sueltas</p>}
      </section>

      {total === 0 ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          {sojasEnRango > 0 ? "Todavía no hay bebidas del registro clásico en este periodo." : "Aún no hay nada que contar aquí 📖"}
        </p>
      ) : (
        <>
          {filasEvolucion.length > 1 && (
            <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
              <h2 className="mb-4 font-titulo text-xl text-texto">
                📈 Evolución
              </h2>
              <BarraLista filas={filasEvolucion} />
            </section>
          )}

          <section className="mb-8 border-y border-borde py-5">
            <h2 className="mb-4 font-titulo text-lg text-texto">Actividad por hora</h2>
            <div className="grid h-28 grid-cols-[repeat(24,minmax(0,1fr))] items-end gap-0.5" role="img" aria-label="Bebidas registradas por hora del día, de 0 a 23 horas">
              {porHora.map((cantidad, hora) => (
                <div key={hora} title={`${hora}:00 · ${cantidad} bebidas`} className="flex h-full items-end">
                  <span className="block w-full min-h-0.5 bg-cian" style={{ height: `${Math.max(2, cantidad / Math.max(1, ...porHora) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-texto2"><span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>
          </section>

          {filasNoches.length > 0 && (
            <section className="mb-8 border-b border-borde pb-6">
              <h2 className="mb-4 font-titulo text-lg text-texto">Noches con más actividad</h2>
              <BarraLista filas={filasNoches} />
            </section>
          )}

          <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
            <h2 className="mb-4 font-titulo text-xl text-texto">
              🥤 Qué se bebe por aquí
            </h2>
            <BarraLista filas={filasTipo} />
          </section>

          {filasCatalogo.length > 0 && (
            <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
              <h2 className="mb-1 font-titulo text-xl text-texto">
                🏷️ Bebidas concretas
              </h2>
              <p className="mb-4 text-xs text-texto2">
                🔷 rara · 💗 épica · 👑 legendaria
              </p>
              <BarraLista filas={filasCatalogo} />
            </section>
          )}

          <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
            <h2 className="mb-1 font-titulo text-xl text-texto">
              🏅 Más bebidas en total
            </h2>
            <p className="mb-4 text-xs text-texto2">
              Contando todo lo registrado en el periodo elegido.
            </p>
            <BarraLista filas={rankingTotal} />
          </section>

          <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
            <h2 className="mb-1 font-titulo text-xl text-texto">
              🎖️ Mayor variedad
            </h2>
            <p className="mb-4 text-xs text-texto2">
              Cuántos tipos de bebida distintos ha probado cada uno.
            </p>
            <BarraLista filas={rankingVariedad} />
          </section>

          <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
            <h2 className="mb-4 font-titulo text-xl text-texto">
              📅 Por día de la semana
            </h2>
            <BarraLista filas={filasDia} />
          </section>
        </>
      )}
    </main>
  );
}
