import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PodioReveal, {
  type ResultadoJugador,
  type ResultadoVotacion,
} from "@/components/PodioReveal";

export default async function PodioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: noche } = await supabase
    .from("noches")
    .select("id, sala_id, estado, inicio, fin_real, votacion_categoria")
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
    .select("usuario_id, posicion_final, pl_ganados, perfiles(nombre)")
    .eq("noche_id", id)
    .order("posicion_final");

  const { data: registros } = await supabase
    .from("registros")
    .select("usuario_id, bebida_tipo_id, bebidas_tipo(nombre, icono, puntos)")
    .eq("noche_id", id)
    .eq("anulado", false)
    .order("ts");

  // Logros persistidos de esta noche (los calculó finalizar_noche en la BD)
  const { data: logrosRaw } = await supabase
    .from("logros_usuario")
    .select("usuario_id, logros(nombre, icono, descripcion, rareza)")
    .eq("noche_id", id);

  // Votación
  const { data: votos } = await supabase
    .from("noche_votos")
    .select("votado_id")
    .eq("noche_id", id);

  type TotalUsuario = {
    bebidas: number;
    puntos: number;
    desglose: Map<number, { nombre: string; icono: string; cantidad: number }>;
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
    };
    t.bebidas += 1;
    t.puntos += bt?.puntos ?? 0;
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

  const logrosPorUsuario = new Map<
    string,
    { icono: string; nombre: string; descripcion: string }[]
  >();
  for (const l of logrosRaw ?? []) {
    const info = l.logros as unknown as {
      nombre: string;
      icono: string;
      descripcion: string;
    } | null;
    if (!info) continue;
    const lista = logrosPorUsuario.get(l.usuario_id) ?? [];
    lista.push(info);
    logrosPorUsuario.set(l.usuario_id, lista);
  }

  const nombrePorUsuario = new Map<string, string>();
  const resultados: ResultadoJugador[] = (jugadoresRaw ?? []).map((j) => {
    const t = totales.get(j.usuario_id);
    const nombre =
      (j.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???";
    nombrePorUsuario.set(j.usuario_id, nombre);
    return {
      id: j.usuario_id,
      nombre,
      posicion: j.posicion_final ?? 99,
      bebidas: t?.bebidas ?? 0,
      puntos: t?.puntos ?? 0,
      pl: j.pl_ganados ?? 0,
      desglose: t
        ? [...t.desglose.values()].sort((a, b) => b.cantidad - a.cantidad)
        : [],
      logros: logrosPorUsuario.get(j.usuario_id) ?? [],
    };
  });

  // Resultado de la votación: el/los más votados
  let votacion: ResultadoVotacion | null = null;
  if (noche.votacion_categoria && (votos ?? []).length > 0) {
    const cuenta = new Map<string, number>();
    for (const v of votos!) {
      cuenta.set(v.votado_id, (cuenta.get(v.votado_id) ?? 0) + 1);
    }
    const max = Math.max(...cuenta.values());
    votacion = {
      categoria: noche.votacion_categoria,
      ganadores: [...cuenta.entries()]
        .filter(([, n]) => n === max)
        .map(([uid, n]) => ({
          nombre: nombrePorUsuario.get(uid) ?? "???",
          votos: n,
        })),
      totalVotos: votos!.length,
    };
  }

  return (
    <PodioReveal
      resultados={resultados}
      salaId={noche.sala_id}
      fecha={noche.inicio}
      vistaHistorica={vistaHistorica}
      votacion={votacion}
    />
  );
}
