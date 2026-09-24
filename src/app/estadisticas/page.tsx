import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";

export default async function EstadisticasGlobalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membresias } = await supabase
    .from("sala_miembros")
    .select("salas(id, nombre, archivada_at)")
    .eq("usuario_id", user!.id);

  const salas = (membresias ?? []).flatMap((m) => {
    const s = m.salas as unknown as { id: string; nombre: string; archivada_at: string | null } | null;
    return s && !s.archivada_at ? [s] : [];
  });
  const salaIds = salas.map((s) => s.id);

  const { data: registros } =
    salaIds.length > 0
      ? await supabase
          .from("registros_sala")
          .select("sala_id, noche_id, ts")
          .in("sala_id", salaIds)
          .eq("usuario_id", user!.id)
          .eq("anulado", false)
      : { data: [] };

  const porSala = new Map<
    string,
    { total: number; noches: Set<string>; ultima: string }
  >();
  for (const r of registros ?? []) {
    if (!r.sala_id) continue;
    const actual = porSala.get(r.sala_id) ?? {
      total: 0,
      noches: new Set<string>(),
      ultima: r.ts,
    };
    actual.total++;
    if (r.noche_id) actual.noches.add(r.noche_id);
    if (r.ts > actual.ultima) actual.ultima = r.ts;
    porSala.set(r.sala_id, actual);
  }

  const filas = salas
    .map((s) => {
      const info = porSala.get(s.id);
      return {
        id: s.id,
        nombre: s.nombre,
        total: info?.total ?? 0,
        noches: info?.noches.size ?? 0,
        ultima: info?.ultima ?? null,
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalGeneral = filas.reduce((acc, f) => acc + f.total, 0);
  const max = Math.max(1, ...filas.map((f) => f.total));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton>Tus salas</BackButton>

      <h1 className="mb-2 mt-2 font-titulo text-3xl text-texto">
        📊 Tu actividad
      </h1>
      <p className="mb-6 text-sm text-texto2">
        Comparativa de tus bebidas registradas (sueltas y en noches) en cada
        una de tus salas.
      </p>

      <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6 text-center">
        <p className="font-titulo text-6xl text-ambar">{totalGeneral}</p>
        <p className="text-sm text-texto2">
          bebidas tuyas registradas en {filas.length} sala
          {filas.length === 1 ? "" : "s"}
        </p>
      </section>

      {filas.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          Todavía no hay nada que comparar 📖
        </p>
      ) : (
        <ul className="space-y-3">
          {filas.map((f, i) => (
            <li key={f.id}>
              <Link
                href={`/sala/${f.id}/estadisticas`}
                className={`block rounded-2xl border bg-tarjeta p-4 transition active:scale-[0.98] ${
                  i === 0 && f.total > 0 ? "border-oro" : "border-borde"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-sm text-texto">
                  <span className="flex items-center gap-1.5">
                    {i === 0 && f.total > 0 && <span>👑</span>}
                    {f.nombre}
                  </span>
                  <span className="font-titulo text-texto2">{f.total}</span>
                </div>
                <div className="mb-1 h-3 overflow-hidden rounded-full bg-fondo">
                  <div
                    className="h-full rounded-full bg-ambar transition-all"
                    style={{ width: `${(f.total / max) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-texto2">
                  {f.noches} noche{f.noches === 1 ? "" : "s"} jugada
                  {f.noches === 1 ? "" : "s"}
                  {f.ultima &&
                    ` · última vez ${new Date(f.ultima).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
