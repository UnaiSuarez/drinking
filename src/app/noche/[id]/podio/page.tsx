import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PodioReveal, { type ResultadoJugador } from "@/components/PodioReveal";
import { calcularLogrosNoche } from "@/lib/logros";

export default async function PodioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: noche } = await supabase
    .from("noches")
    .select("id, sala_id, estado, inicio, fin_real")
    .eq("id", id)
    .single();

  if (!noche) notFound();
  if (noche.estado !== "cerrada") redirect(`/noche/${id}`);

  // Si hace más de un par de minutos que se cerró, asumimos que es una
  // visita al historial: mostramos el resultado directamente, sin repetir
  // la cuenta atrás ni el revelado dramático cada vez que se vuelve a mirar.
  const vistaHistorica = noche.fin_real
    ? Date.now() - new Date(noche.fin_real).getTime() > 2 * 60 * 1000
    : false;

  const { data: jugadoresRaw } = await supabase
    .from("noche_jugadores")
    .select("usuario_id, posicion_final, perfiles(nombre)")
    .eq("noche_id", id)
    .order("posicion_final");

  const { data: registros } = await supabase
    .from("registros")
    .select("usuario_id, bebida_tipo_id, ts, bebidas_tipo(nombre, icono, puntos)")
    .eq("noche_id", id)
    .eq("anulado", false)
    .order("ts");

  type TotalUsuario = {
    bebidas: number;
    puntos: number;
    desglose: Map<number, { nombre: string; icono: string; cantidad: number }>;
    timestamps: number[];
  };
  const totales = new Map<string, TotalUsuario>();
  for (const r of registros ?? []) {
    const bt = r.bebidas_tipo as unknown as {
      nombre: string;
      icono: string;
      puntos: number;
    } | null;
    const t: TotalUsuario = totales.get(r.usuario_id) ?? {
      bebidas: 0,
      puntos: 0,
      desglose: new Map(),
      timestamps: [],
    };
    t.bebidas += 1;
    t.puntos += bt?.puntos ?? 0;
    t.timestamps.push(new Date(r.ts).getTime());
    if (bt) {
      const d = t.desglose.get(r.bebida_tipo_id) ?? {
        nombre: bt.nombre,
        icono: bt.icono,
        cantidad: 0,
      };
      d.cantidad += 1;
      t.desglose.set(r.bebida_tipo_id, d);
    }
    totales.set(r.usuario_id, t);
  }

  // Quién hizo el primer registro de la noche, y si fue antes de las 20:00
  const primerRegistro = (registros ?? [])[0];
  const primeroAntesDe20h =
    primerRegistro && new Date(primerRegistro.ts).getHours() < 20
      ? primerRegistro.usuario_id
      : null;

  const resultados: ResultadoJugador[] = (jugadoresRaw ?? []).map((j) => {
    const t = totales.get(j.usuario_id);
    const bebidas = t?.bebidas ?? 0;
    const puntos = t?.puntos ?? 0;
    const desglose = t
      ? [...t.desglose.values()].sort((a, b) => b.cantidad - a.cantidad)
      : [];
    return {
      id: j.usuario_id,
      nombre:
        (j.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???",
      posicion: j.posicion_final ?? 99,
      bebidas,
      puntos,
      desglose,
      logros: calcularLogrosNoche({
        esGanador: j.posicion_final === 1,
        bebidas,
        puntos,
        tiposDistintos: desglose.length,
        timestamps: t?.timestamps ?? [],
        esPrimerRegistroDeLaNocheAntesDe20h: primeroAntesDe20h === j.usuario_id,
      }),
    };
  });

  return (
    <PodioReveal
      resultados={resultados}
      salaId={noche.sala_id}
      fecha={noche.inicio}
      vistaHistorica={vistaHistorica}
    />
  );
}
