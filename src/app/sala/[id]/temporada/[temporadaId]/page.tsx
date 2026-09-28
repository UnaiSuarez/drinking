import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calcularDivision } from "@/lib/liga";

export default async function RecapTemporadaPage({
  params,
}: {
  params: Promise<{ id: string; temporadaId: string }>;
}) {
  const { id, temporadaId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre")
    .eq("id", id)
    .single();
  if (!sala) notFound();

  const { data: temporada } = await supabase
    .from("temporadas")
    .select("id, nombre, inicio, fin, estado, premio")
    .eq("id", temporadaId)
    .eq("sala_id", id)
    .single();
  if (!temporada) notFound();

  const { data: ligaRaw } = await supabase
    .from("liga")
    .select("usuario_id, pl, perfiles(nombre, avatar_config)")
    .eq("temporada_id", temporadaId)
    .order("pl", { ascending: false });

  const clasificacion = (ligaRaw ?? []).map((e, i) => ({
    usuarioId: e.usuario_id,
    nombre: (e.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???",
    pl: e.pl,
    posicion: i + 1,
  }));

  const { data: noches } = await supabase
    .from("noches")
    .select("id, inicio")
    .eq("sala_id", id)
    .eq("estado", "cerrada")
    .gte("inicio", temporada.inicio)
    .lt("inicio", temporada.fin);
  const nocheIds = (noches ?? []).map((n) => n.id);

  const [{ data: registrosRaw }, { data: bebidasTipo }] = await Promise.all([
    nocheIds.length > 0
      ? supabase.from("registros_sala").select("bebida_tipo_id").in("noche_id", nocheIds).eq("anulado", false)
      : Promise.resolve({ data: [] as { bebida_tipo_id: number }[] }),
    supabase.from("bebidas_tipo").select("id, nombre, icono").or(`sala_id.is.null,sala_id.eq.${id}`),
  ]);
  const bebidasMap = new Map((bebidasTipo ?? []).map((b) => [b.id, { nombre: b.nombre, icono: b.icono }]));
  const bebidasPorTipo = new Map<number, number>();
  for (const r of registrosRaw ?? []) {
    bebidasPorTipo.set(r.bebida_tipo_id, (bebidasPorTipo.get(r.bebida_tipo_id) ?? 0) + 1);
  }
  const bebidaFavorita = [...bebidasPorTipo.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const campeon = clasificacion[0] ?? null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${id}`} className="text-sm text-texto2">
        ← {sala.nombre}
      </Link>
      <h1 className="mb-1 mt-2 font-titulo text-3xl text-ambar">
        🏆 {temporada.nombre}
      </h1>
      <p className="mb-6 text-sm text-texto2">
        {temporada.estado === "activa" ? "Temporada en curso" : "Temporada terminada"} ·{" "}
        {new Date(temporada.inicio).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
        {" – "}
        {new Date(temporada.fin).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      {campeon && (
        <section className="mb-8 rounded-3xl border-2 border-oro bg-tarjeta p-6 text-center">
          <p className="text-xs uppercase tracking-wide text-texto2">👑 Campeón de la temporada</p>
          <p className="mt-1 font-titulo text-2xl text-oro">
            {campeon.nombre}
            {campeon.usuarioId === user?.id && " (tú)"}
          </p>
          <p className="text-sm text-texto2">{campeon.pl} PL</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-lg text-texto">📈 Clasificación final</h2>
        {clasificacion.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Nadie llegó a puntuar esta temporada.
          </p>
        ) : (
          <ul className="space-y-2">
            {clasificacion.map((e) => {
              const div = calcularDivision(e.pl, e.posicion === 1);
              return (
                <li
                  key={e.usuarioId}
                  className={`flex items-center justify-between rounded-2xl border bg-tarjeta px-4 py-3 ${
                    e.posicion === 1 ? "border-oro" : "border-borde"
                  }`}
                >
                  <span className="flex items-center gap-2 text-texto">
                    <span className="font-titulo text-texto2">{e.posicion}.</span>
                    {e.nombre}
                    {e.usuarioId === user?.id && <span className="text-xs text-texto2">(tú)</span>}
                    <span className={`text-xs ${div.color}`}>
                      {div.icono} {div.nombre}
                    </span>
                  </span>
                  <span className="font-titulo text-lima">{e.pl} PL</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-borde bg-tarjeta p-4 text-center">
          <p className="font-titulo text-2xl text-ambar">{nocheIds.length}</p>
          <p className="text-xs text-texto2">noches jugadas</p>
        </div>
        {bebidaFavorita && (
          <div className="rounded-2xl border border-borde bg-tarjeta p-4 text-center">
            <p className="font-titulo text-2xl text-rosa">
              {bebidasMap.get(bebidaFavorita[0])?.icono ?? "🥤"}
            </p>
            <p className="text-xs text-texto2">
              {bebidasMap.get(bebidaFavorita[0])?.nombre ?? "???"} · {bebidaFavorita[1]} veces
            </p>
          </div>
        )}
      </section>

      {temporada.premio && (
        <p className="mb-8 rounded-2xl border border-ambar/40 bg-ambar/10 px-4 py-3 text-center text-sm text-texto2">
          🎁 Premio de la temporada: {temporada.premio}
        </p>
      )}
    </main>
  );
}
