import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function BarraLista({
  filas,
}: {
  filas: { clave: string; etiqueta: string; valor: number }[];
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const COLORES = ["bg-ambar", "bg-cian", "bg-rosa", "bg-lima", "bg-oro"] as const;
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
              className={`h-full rounded-full ${COLORES[i % COLORES.length]}`}
              style={{ width: `${(f.valor / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ResumenAnioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string }>;
}) {
  const { id } = await params;
  const { anio: anioParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre")
    .eq("id", id)
    .is("archivada_at", null)
    .single();
  if (!sala) notFound();

  const { data: primeraNoche } = await supabase
    .from("noches")
    .select("inicio")
    .eq("sala_id", id)
    .eq("estado", "cerrada")
    .order("inicio", { ascending: true })
    .limit(1)
    .maybeSingle();

  const anioActual = new Date().getUTCFullYear();
  const primerAnio = primeraNoche
    ? new Date(primeraNoche.inicio).getUTCFullYear()
    : anioActual;
  const anios = Array.from(
    { length: anioActual - primerAnio + 1 },
    (_, i) => anioActual - i
  );
  const anio = Number(anioParam);
  const anioElegido = anios.includes(anio) ? anio : anioActual;

  const desde = `${anioElegido}-01-01T00:00:00Z`;
  const hasta = `${anioElegido + 1}-01-01T00:00:00Z`;

  const { data: noches } = await supabase
    .from("noches")
    .select("id, inicio")
    .eq("sala_id", id)
    .eq("estado", "cerrada")
    .gte("inicio", desde)
    .lt("inicio", hasta);
  const nocheIds = (noches ?? []).map((n) => n.id);

  const [{ data: jugadoresRaw }, { data: registrosRaw }, { data: bebidasTipo }, { data: fotosRaw }] =
    await Promise.all([
      nocheIds.length > 0
        ? supabase
            .from("noche_jugadores")
            .select("usuario_id, posicion_final, pl_ganados, perfiles(nombre)")
            .in("noche_id", nocheIds)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("registros_sala")
        .select("usuario_id, bebida_tipo_id")
        .eq("sala_id", id)
        .eq("anulado", false)
        .gte("ts", desde)
        .lt("ts", hasta),
      supabase.from("bebidas_tipo").select("id, nombre, icono").or(`sala_id.is.null,sala_id.eq.${id}`),
      supabase
        .from("fotos_sala")
        .select("id, storage_path")
        .eq("sala_id", id)
        .gte("creado_en", desde)
        .lt("creado_en", hasta)
        .order("creado_en", { ascending: false })
        .limit(12),
    ]);

  const bebidasMap = new Map((bebidasTipo ?? []).map((b) => [b.id, { nombre: b.nombre, icono: b.icono }]));

  const nombrePorUsuario = new Map(
    (jugadoresRaw ?? []).map((j) => [
      j.usuario_id,
      (j.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???",
    ])
  );

  const victoriasPorUsuario = new Map<string, number>();
  const plPorUsuario = new Map<string, number>();
  for (const j of jugadoresRaw ?? []) {
    if (j.posicion_final === 1) {
      victoriasPorUsuario.set(j.usuario_id, (victoriasPorUsuario.get(j.usuario_id) ?? 0) + 1);
    }
    plPorUsuario.set(j.usuario_id, (plPorUsuario.get(j.usuario_id) ?? 0) + (j.pl_ganados ?? 0));
  }

  const bebidasPorUsuario = new Map<string, number>();
  const bebidasPorTipo = new Map<number, number>();
  for (const r of registrosRaw ?? []) {
    bebidasPorUsuario.set(r.usuario_id, (bebidasPorUsuario.get(r.usuario_id) ?? 0) + 1);
    bebidasPorTipo.set(r.bebida_tipo_id, (bebidasPorTipo.get(r.bebida_tipo_id) ?? 0) + 1);
  }

  const masVictorias = [...victoriasPorUsuario.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const masPl = [...plPorUsuario.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const masBebidas = [...bebidasPorUsuario.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const bebidaFavorita = [...bebidasPorTipo.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const nombresPorUsuario = new Map<string, string>(nombrePorUsuario);
  // Los registros pueden traer usuarios que no jugaron ninguna noche cerrada
  // (bebidas sueltas): completamos sus nombres si hace falta.
  const idsFaltantes = [...bebidasPorUsuario.keys()].filter((id) => !nombresPorUsuario.has(id));
  if (idsFaltantes.length > 0) {
    const { data: perfilesFaltantes } = await supabase
      .from("perfiles")
      .select("id, nombre")
      .in("id", idsFaltantes);
    for (const p of perfilesFaltantes ?? []) nombresPorUsuario.set(p.id, p.nombre);
  }

  let fotosConUrl: { id: string; url: string }[] = [];
  if ((fotosRaw ?? []).length > 0) {
    const { data: firmadas } = await supabase.storage
      .from("momentos")
      .createSignedUrls((fotosRaw ?? []).map((f) => f.storage_path), 3600);
    const urlPorPath = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
    fotosConUrl = (fotosRaw ?? [])
      .map((f) => ({ id: f.id, url: urlPorPath.get(f.storage_path) ?? "" }))
      .filter((f) => f.url);
  }

  const totalBebidas = registrosRaw?.length ?? 0;
  const totalNoches = noches?.length ?? 0;
  const sinDatos = totalNoches === 0 && totalBebidas === 0;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${id}`} className="text-sm text-texto2">
        ← {sala.nombre}
      </Link>
      <h1 className="mb-2 mt-2 font-titulo text-3xl text-ambar">
        🎉 Resumen del año
      </h1>

      {anios.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {anios.map((a) => (
            <Link
              key={a}
              href={`/sala/${id}/resumen?anio=${a}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                a === anioElegido
                  ? "border-ambar bg-ambar/10 text-ambar"
                  : "border-borde text-texto2"
              }`}
            >
              {a}
            </Link>
          ))}
        </div>
      )}

      {sinDatos ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          {sala.nombre} no tiene nada registrado en {anioElegido} 📖
        </p>
      ) : (
        <>
          <section className="mb-8 rounded-3xl border-2 border-ambar bg-tarjeta p-6 text-center">
            <p className="font-titulo text-5xl text-ambar">{anioElegido}</p>
            <p className="mt-1 text-sm text-texto2">
              {totalNoches} noche{totalNoches === 1 ? "" : "s"} · {totalBebidas} bebida
              {totalBebidas === 1 ? "" : "s"} registrada{totalBebidas === 1 ? "" : "s"}
            </p>
          </section>

          {fotosConUrl.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-titulo text-lg text-texto">
                📸 Momentos del año
              </h2>
              <ul className="grid grid-cols-3 gap-2">
                {fotosConUrl.map((f) => (
                  <li key={f.id} className="aspect-square overflow-hidden rounded-xl bg-tarjeta">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mb-8 grid grid-cols-1 gap-3">
            {masVictorias && (
              <div className="rounded-2xl border border-oro/50 bg-tarjeta p-4">
                <p className="text-xs uppercase tracking-wide text-texto2">👑 El más ganador</p>
                <p className="font-titulo text-xl text-oro">
                  {nombresPorUsuario.get(masVictorias[0]) ?? "???"}
                  {masVictorias[0] === user?.id && " (tú)"}
                </p>
                <p className="text-xs text-texto2">
                  {masVictorias[1]} noche{masVictorias[1] === 1 ? "" : "s"} ganada{masVictorias[1] === 1 ? "" : "s"}
                </p>
              </div>
            )}
            {masPl && (
              <div className="rounded-2xl border border-lima/50 bg-tarjeta p-4">
                <p className="text-xs uppercase tracking-wide text-texto2">📈 Más PL del año</p>
                <p className="font-titulo text-xl text-lima">
                  {nombresPorUsuario.get(masPl[0]) ?? "???"}
                  {masPl[0] === user?.id && " (tú)"}
                </p>
                <p className="text-xs text-texto2">+{masPl[1]} PL</p>
              </div>
            )}
            {masBebidas && (
              <div className="rounded-2xl border border-cian/50 bg-tarjeta p-4">
                <p className="text-xs uppercase tracking-wide text-texto2">🍻 El que más bebió</p>
                <p className="font-titulo text-xl text-cian">
                  {nombresPorUsuario.get(masBebidas[0]) ?? "???"}
                  {masBebidas[0] === user?.id && " (tú)"}
                </p>
                <p className="text-xs text-texto2">
                  {masBebidas[1]} bebida{masBebidas[1] === 1 ? "" : "s"}
                </p>
              </div>
            )}
            {bebidaFavorita && (
              <div className="rounded-2xl border border-rosa/50 bg-tarjeta p-4">
                <p className="text-xs uppercase tracking-wide text-texto2">🥤 La bebida del año</p>
                <p className="font-titulo text-xl text-rosa">
                  {bebidasMap.get(bebidaFavorita[0])?.icono ?? "🥤"}{" "}
                  {bebidasMap.get(bebidaFavorita[0])?.nombre ?? "???"}
                </p>
                <p className="text-xs text-texto2">
                  {bebidaFavorita[1] === 1 ? "1 vez" : `${bebidaFavorita[1]} veces`}
                </p>
              </div>
            )}
          </section>

          {bebidasPorUsuario.size > 0 && (
            <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
              <h2 className="mb-4 font-titulo text-xl text-texto">🏅 Ranking de bebidas del año</h2>
              <BarraLista
                filas={[...bebidasPorUsuario.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([uid, valor]) => ({
                    clave: uid,
                    etiqueta: `${nombresPorUsuario.get(uid) ?? "???"}${uid === user?.id ? " (tú)" : ""}`,
                    valor,
                  }))}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}
