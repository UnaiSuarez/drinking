import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

export default async function EstadisticasSalaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre, config")
    .eq("id", id)
    .single();
  if (!sala) notFound();

  const esPermanente = (sala.config as Record<string, unknown> | null)?.tipo === "permanente";

  const { data: bebidasTipo } = await supabase
    .from("bebidas_tipo")
    .select("id, nombre, icono")
    .or(`sala_id.is.null,sala_id.eq.${id}`);

  const { data: miembros } = await supabase
    .from("sala_miembros")
    .select("usuario_id, perfiles(nombre)");

  const { data: registros } = await supabase
    .from("registros_sala")
    .select("usuario_id, bebida_tipo_id, ts, noche_id")
    .eq("sala_id", id)
    .eq("anulado", false);

  const bebidasMap = new Map(
    (bebidasTipo ?? []).map((b) => [b.id, { nombre: b.nombre, icono: b.icono }])
  );
  const nombreMap = new Map(
    (miembros ?? []).map((m) => {
      const p = m.perfiles as unknown as { nombre: string } | null;
      return [m.usuario_id, p?.nombre ?? "???"];
    })
  );

  const regs = registros ?? [];
  const total = regs.length;
  const enNoches = regs.filter((r) => r.noche_id !== null).length;
  const sueltas = total - enNoches;

  const porTipo = new Map<number, number>();
  const porUsuarioTotal = new Map<string, number>();
  const porUsuarioTipos = new Map<string, Set<number>>();
  const porDia = [0, 0, 0, 0, 0, 0, 0]; // domingo..sábado

  for (const r of regs) {
    porTipo.set(r.bebida_tipo_id, (porTipo.get(r.bebida_tipo_id) ?? 0) + 1);
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

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${id}`} className="text-sm text-texto2">
        ← {sala.nombre}
      </Link>
      <h1 className="mb-2 mt-2 font-titulo text-3xl text-texto">
        📊 Estadísticas
      </h1>
      <p className="mb-6 text-sm text-texto2">
        De toda la historia de {sala.nombre}, dentro y fuera de las noches.
      </p>

      <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6 text-center">
        <p className="font-titulo text-6xl text-ambar">{total}</p>
        <p className="text-sm text-texto2">bebidas registradas en total</p>
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
          <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
            <h2 className="mb-4 font-titulo text-xl text-texto">
              🥤 Qué se bebe por aquí
            </h2>
            <BarraLista filas={filasTipo} />
          </section>

          <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
            <h2 className="mb-1 font-titulo text-xl text-texto">
              🏅 Más bebidas en total
            </h2>
            <p className="mb-4 text-xs text-texto2">
              Contando todo lo registrado siempre, no solo esta liga.
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
