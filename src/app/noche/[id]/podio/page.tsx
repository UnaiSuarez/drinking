import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PodioReveal, { type ResultadoJugador } from "@/components/PodioReveal";

export default async function PodioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: noche } = await supabase
    .from("noches")
    .select("id, sala_id, estado, inicio")
    .eq("id", id)
    .single();

  if (!noche) notFound();
  if (noche.estado !== "cerrada") redirect(`/noche/${id}`);

  const { data: jugadoresRaw } = await supabase
    .from("noche_jugadores")
    .select("usuario_id, posicion_final, perfiles(nombre)")
    .eq("noche_id", id)
    .order("posicion_final");

  const { data: registros } = await supabase
    .from("registros")
    .select("usuario_id, bebida_tipo_id, bebidas_tipo(puntos)")
    .eq("noche_id", id)
    .eq("anulado", false);

  const totales = new Map<string, { bebidas: number; puntos: number }>();
  for (const r of registros ?? []) {
    const t = totales.get(r.usuario_id) ?? { bebidas: 0, puntos: 0 };
    t.bebidas += 1;
    t.puntos +=
      (r.bebidas_tipo as unknown as { puntos: number } | null)?.puntos ?? 0;
    totales.set(r.usuario_id, t);
  }

  const resultados: ResultadoJugador[] = (jugadoresRaw ?? []).map((j) => ({
    id: j.usuario_id,
    nombre:
      (j.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???",
    posicion: j.posicion_final ?? 99,
    bebidas: totales.get(j.usuario_id)?.bebidas ?? 0,
    puntos: totales.get(j.usuario_id)?.puntos ?? 0,
  }));

  return (
    <PodioReveal
      resultados={resultados}
      salaId={noche.sala_id}
      fecha={noche.inicio}
    />
  );
}
