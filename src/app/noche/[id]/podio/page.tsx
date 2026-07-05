import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PodioReveal, {
  type ResultadoJugador,
  type ResultadoVotacion,
} from "@/components/PodioReveal";
import { parseAvatarConfig } from "@/lib/avatar";
import { cofrePorPodio } from "@/lib/cofresDesign";
import { parseInventarioState } from "@/lib/inventario";

const XP_POR_RAREZA: Record<string, number> = {
  comun: 25,
  rara: 75,
  epica: 200,
  legendaria: 500,
};

export default async function PodioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: noche } = await supabase
    .from("noches")
    .select("id, sala_id, estado, inicio, fin_real, votacion_categoria, temporada_id")
    .eq("id", id)
    .single();

  if (!noche) notFound();
  if (noche.estado !== "cerrada") redirect(`/noche/${id}`);

  let esAdmin = false;
  if (user) {
    const { data: miembro } = await supabase
      .from("sala_miembros")
      .select("rol")
      .eq("sala_id", noche.sala_id)
      .eq("usuario_id", user.id)
      .maybeSingle();
    esAdmin = miembro?.rol === "fundador" || miembro?.rol === "admin";
  }

  // Si hace más de un par de minutos que se cerró, asumimos que es una
  // visita al historial: mostramos el resultado directamente, sin repetir
  // la cuenta atrás ni el revelado dramático cada vez que se vuelve a mirar.
  const vistaHistorica = noche.fin_real
    ? new Date().getTime() - new Date(noche.fin_real).getTime() > 2 * 60 * 1000
    : false;

  const { data: jugadoresRaw } = await supabase
    .from("noche_jugadores")
    .select("usuario_id, posicion_final, pl_ganados, perfiles(nombre, avatar_config, xp)")
    .eq("noche_id", id)
    .order("posicion_final");

  const jugadorActual = (jugadoresRaw ?? []).find(
    (jugador) => jugador.usuario_id === user?.id
  );
  const perfilActual = jugadorActual?.perfiles as unknown as {
    avatar_config: unknown;
    xp: number;
  } | null;
  const cofrePodio = cofrePorPodio(jugadorActual?.posicion_final ?? 99);
  const inventarioActual = parseInventarioState(perfilActual?.avatar_config);
  const premioPodio =
    user && jugadorActual && cofrePodio && !inventarioActual.podiosPremiados.includes(id)
      ? {
          nocheId: id,
          cofreId: cofrePodio,
          posicion: jugadorActual.posicion_final ?? 99,
          avatarConfigRaw: perfilActual?.avatar_config ?? null,
        }
      : null;

  const { data: registros } = await supabase
    .from("registros")
    .select("usuario_id, bebida_tipo_id, retroactivo, bebidas_tipo(nombre, icono, puntos)")
    .eq("noche_id", id)
    .eq("anulado", false)
    .order("ts");

  // Logros persistidos de esta noche (los calculó finalizar_noche en la BD)
  const { data: logrosRaw } = await supabase
    .from("logros_usuario")
    .select("usuario_id, logros(nombre, icono, descripcion, rareza)")
    .eq("noche_id", id);

  // Penalizaciones marcadas al cierre (ha vomitado, KO, etc.)
  const { data: penalizacionesRaw } = await supabase
    .from("noche_penalizaciones")
    .select("usuario_id, penalizaciones_tipo(nombre, icono, pl)")
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
    const puntosBase = bt?.puntos ?? 0;
    t.puntos += r.retroactivo ? Math.min(puntosBase, 1) : puntosBase;
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

  // Agrupamos por logro con contador: los repetibles por tramos pueden
  // conseguirse varias veces la misma noche (ej. "Media Docena ×2")
  const logrosPorUsuario = new Map<
    string,
    Map<
      string,
      {
        icono: string;
        nombre: string;
        descripcion: string;
        rareza: string;
        n: number;
      }
    >
  >();
  for (const l of logrosRaw ?? []) {
    const info = l.logros as unknown as {
      nombre: string;
      icono: string;
      descripcion: string;
      rareza: string;
    } | null;
    if (!info) continue;
    const porNombre = logrosPorUsuario.get(l.usuario_id) ?? new Map();
    const existente = porNombre.get(info.nombre) ?? { ...info, n: 0 };
    existente.n += 1;
    porNombre.set(info.nombre, existente);
    logrosPorUsuario.set(l.usuario_id, porNombre);
  }

  const penalizacionesPorUsuario = new Map<
    string,
    { icono: string; nombre: string; pl: number }[]
  >();
  for (const pen of penalizacionesRaw ?? []) {
    const info = pen.penalizaciones_tipo as unknown as {
      nombre: string;
      icono: string;
      pl: number;
    } | null;
    if (!info) continue;
    const lista = penalizacionesPorUsuario.get(pen.usuario_id) ?? [];
    lista.push(info);
    penalizacionesPorUsuario.set(pen.usuario_id, lista);
  }

  const nombrePorUsuario = new Map<string, string>();
  const resultados: ResultadoJugador[] = (jugadoresRaw ?? []).map((j) => {
    const t = totales.get(j.usuario_id);
    const p = j.perfiles as unknown as {
      nombre: string;
      avatar_config: unknown;
    } | null;
    const nombre = p?.nombre ?? "???";
    nombrePorUsuario.set(j.usuario_id, nombre);
    return {
      id: j.usuario_id,
      nombre,
      avatarConfig: parseAvatarConfig(p?.avatar_config),
      posicion: j.posicion_final ?? 99,
      bebidas: t?.bebidas ?? 0,
      puntos: t?.puntos ?? 0,
      pl: j.pl_ganados ?? 0,
      desglose: t
        ? [...t.desglose.values()].sort((a, b) => b.cantidad - a.cantidad)
        : [],
      logros: [...(logrosPorUsuario.get(j.usuario_id)?.values() ?? [])],
      penalizaciones: penalizacionesPorUsuario.get(j.usuario_id) ?? [],
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

  // Desglose de XP ganada esta noche por el jugador que mira el podio (solo
  // para el propio usuario: es un recap personal, no de todos).
  let miXp: {
    ganada: number;
    antes: number;
    despues: number;
    desglose: { concepto: string; xp: number }[];
  } | null = null;
  if (user && jugadorActual && perfilActual) {
    const misLogros = [...(logrosPorUsuario.get(user.id)?.values() ?? [])];
    const xpLogros = misLogros.reduce(
      (acc, l) => acc + (XP_POR_RAREZA[l.rareza] ?? 0) * l.n,
      0
    );
    const misBebidas = totales.get(user.id)?.bebidas ?? 0;
    const gano = jugadorActual.posicion_final === 1 && misBebidas > 0;
    const desglose = [
      { concepto: "Por participar en la noche", xp: 20 },
      ...(misBebidas > 0
        ? [{ concepto: `${misBebidas} bebida${misBebidas === 1 ? "" : "s"} registrada${misBebidas === 1 ? "" : "s"}`, xp: misBebidas * 5 }]
        : []),
      ...(gano ? [{ concepto: "🥇 Ganaste la noche", xp: 100 }] : []),
      ...(misLogros.length > 0
        ? [{ concepto: `${misLogros.length} logro${misLogros.length === 1 ? "" : "s"} conseguido${misLogros.length === 1 ? "" : "s"}`, xp: xpLogros }]
        : []),
    ];
    const ganada = desglose.reduce((acc, d) => acc + d.xp, 0);
    const despues = perfilActual.xp ?? 0;
    miXp = { ganada, antes: despues - ganada, despues, desglose };
  }

  // Progreso de liga: comparamos el PL actual (ya con el de esta noche
  // sumado) contra el que había antes de cerrarla, incluyendo el cambio de
  // posición/división que eso supone dentro de la clasificación.
  let miLiga: {
    pl: number;
    antes: number;
    despues: number;
    posicionDespues: number;
    totalLiga: number;
    esTop1Antes: boolean;
    esTop1Despues: boolean;
  } | null = null;
  if (user && jugadorActual && noche.temporada_id) {
    const { data: ligaRaw } = await supabase
      .from("liga")
      .select("usuario_id, pl")
      .eq("temporada_id", noche.temporada_id)
      .order("pl", { ascending: false });
    const lista = ligaRaw ?? [];
    const idxDespues = lista.findIndex((e) => e.usuario_id === user.id);
    if (idxDespues !== -1) {
      const plDespues = lista[idxDespues].pl;
      const plGanado = jugadorActual.pl_ganados ?? 0;
      const plAntes = plDespues - plGanado;
      const listaAntes = lista
        .map((e) => (e.usuario_id === user.id ? { ...e, pl: plAntes } : e))
        .sort((a, b) => b.pl - a.pl);
      const idxAntes = listaAntes.findIndex((e) => e.usuario_id === user.id);
      miLiga = {
        pl: plGanado,
        antes: plAntes,
        despues: plDespues,
        posicionDespues: idxDespues + 1,
        totalLiga: lista.length,
        esTop1Antes: idxAntes === 0,
        esTop1Despues: idxDespues === 0,
      };
    }
  }

  return (
    <PodioReveal
      resultados={resultados}
      salaId={noche.sala_id}
      nocheId={noche.id}
      fecha={noche.inicio}
      vistaHistorica={vistaHistorica}
      votacion={votacion}
      premioPodio={premioPodio}
      esAdmin={esAdmin}
      miXp={miXp}
      miLiga={miLiga}
      userId={user?.id ?? null}
    />
  );
}
