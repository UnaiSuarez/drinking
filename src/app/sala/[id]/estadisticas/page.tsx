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

type Rango = "semana" | "mes" | "temporada" | "total";

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
  searchParams: Promise<{ rango?: string }>;
}) {
  const { id } = await params;
  const { rango: rangoParam } = await searchParams;
  const rango: Rango = (["semana", "mes", "temporada", "total"] as const).includes(
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
    .select("usuario_id, perfiles(nombre)");

  const { data: registrosTodos } = await supabase
    .from("registros_sala")
    .select("usuario_id, bebida_tipo_id, bebida_catalogo_id, ts, noche_id")
    .eq("sala_id", id)
    .eq("anulado", false);

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

  const todos = registrosTodos ?? [];

  // Racha: siempre sobre el historial completo del usuario, no del filtro.
  const racha = calcularRacha(
    todos.filter((r) => r.usuario_id === user!.id).map((r) => r.ts)
  );

  const ahora = new Date();
  let desde: Date | null = null;
  if (rango === "semana") desde = new Date(ahora.getTime() - 7 * 86400000);
  else if (rango === "mes") desde = new Date(ahora.getTime() - 30 * 86400000);
  else if (rango === "temporada" && temporada) desde = new Date(temporada.inicio);

  const regs = desde ? todos.filter((r) => new Date(r.ts) >= desde!) : todos;

  const total = regs.length;
  const enNoches = regs.filter((r) => r.noche_id !== null).length;
  const sueltas = total - enNoches;

  const porTipo = new Map<number, number>();
  const porCatalogo = new Map<string, number>();
  const porUsuarioTotal = new Map<string, number>();
  const porUsuarioTipos = new Map<string, Set<number>>();
  const porDia = [0, 0, 0, 0, 0, 0, 0]; // domingo..sábado

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
    porDia[new Date(r.ts).getDay()]++;
  }

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
            href={`/sala/${id}/estadisticas${r.valor === "total" ? "" : `?rango=${r.valor}`}`}
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

      <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6 text-center">
        <p className="font-titulo text-6xl text-ambar">{total}</p>
        <p className="text-sm text-texto2">bebidas registradas</p>
        {esPermanente && total > 0 && (
          <p className="mt-2 text-xs text-texto2">
            {enNoches} en noches · {sueltas} sueltas
          </p>
        )}
      </section>

      {total === 0 ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          Aún no hay nada que contar aquí 📖
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
