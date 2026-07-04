import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalaView, {
  type EntradaLiga,
  type Miembro,
  type NocheResumen,
} from "@/components/SalaView";
import { parseAvatarConfig } from "@/lib/avatar";

export default async function SalaPage({
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
    .select("id, nombre, codigo, config")
    .eq("id", id)
    .single();

  if (!sala) notFound();

  const configSala = (sala.config ?? {}) as Record<string, unknown>;
  const esTemporada = configSala.tipo === "temporada";

  const { data: miembrosRaw } = await supabase
    .from("sala_miembros")
    .select("rol, usuario_id, perfiles(nombre, avatar_config)")
    .eq("sala_id", id)
    .order("joined_at");

  const miembros: Miembro[] = (miembrosRaw ?? []).map((m) => {
    const p = m.perfiles as unknown as {
      nombre: string;
      avatar_config: unknown;
    } | null;
    return {
      id: m.usuario_id,
      rol: m.rol,
      nombre: p?.nombre ?? "???",
      avatarConfig: parseAvatarConfig(p?.avatar_config),
    };
  });

  const miRol = miembros.find((m) => m.id === user!.id)?.rol ?? "miembro";

  const { data: nocheActiva } = await supabase
    .from("noches")
    .select("id, inicio, fin_programado")
    .eq("sala_id", id)
    .in("estado", ["activa", "cerrando"])
    .maybeSingle();

  const { data: nochesCerradasRaw } = await supabase
    .from("noches")
    .select("id, inicio, noche_jugadores(usuario_id, posicion_final)")
    .eq("sala_id", id)
    .eq("estado", "cerrada")
    .order("inicio", { ascending: false })
    .limit(10);

  const nochesCerradas: NocheResumen[] = (nochesCerradasRaw ?? []).map((n) => {
    const jugadores = (n.noche_jugadores ?? []) as {
      usuario_id: string;
      posicion_final: number | null;
    }[];
    const ganadorId = jugadores.find((j) => j.posicion_final === 1)?.usuario_id;
    return {
      id: n.id,
      inicio: n.inicio,
      ganador: miembros.find((m) => m.id === ganadorId)?.nombre ?? null,
      jugadores: jugadores.length,
    };
  });

  // Liga de la temporada activa
  const { data: temporada } = await supabase
    .from("temporadas")
    .select("id, nombre, fin")
    .eq("sala_id", id)
    .eq("estado", "activa")
    .gt("fin", new Date().toISOString())
    .maybeSingle();

  let liga: EntradaLiga[] = [];
  if (temporada) {
    const { data: ligaRaw } = await supabase
      .from("liga")
      .select("usuario_id, pl")
      .eq("temporada_id", temporada.id)
      .order("pl", { ascending: false });
    liga = (ligaRaw ?? []).map((e) => {
      const miembro = miembros.find((m) => m.id === e.usuario_id);
      return {
        usuarioId: e.usuario_id,
        nombre: miembro?.nombre ?? "???",
        avatarConfig: miembro?.avatarConfig ?? parseAvatarConfig(null),
        pl: e.pl,
      };
    });
  }

  return (
    <SalaView
      sala={sala}
      esTemporada={esTemporada}
      miembros={miembros}
      miRol={miRol}
      userId={user!.id}
      nocheActiva={nocheActiva}
      nochesCerradas={nochesCerradas}
      temporada={temporada}
      liga={liga}
    />
  );
}
