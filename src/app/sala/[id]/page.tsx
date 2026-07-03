import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalaView, {
  type EntradaLiga,
  type Miembro,
  type NocheResumen,
} from "@/components/SalaView";

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
    .select("id, nombre, codigo")
    .eq("id", id)
    .single();

  if (!sala) notFound();

  const { data: miembrosRaw } = await supabase
    .from("sala_miembros")
    .select("rol, usuario_id, perfiles(nombre)")
    .eq("sala_id", id)
    .order("joined_at");

  const miembros: Miembro[] = (miembrosRaw ?? []).map((m) => ({
    id: m.usuario_id,
    rol: m.rol,
    nombre:
      (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???",
  }));

  const miRol = miembros.find((m) => m.id === user!.id)?.rol ?? "miembro";

  const { data: nocheActiva } = await supabase
    .from("noches")
    .select("id, inicio, fin_programado")
    .eq("sala_id", id)
    .eq("estado", "activa")
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
    liga = (ligaRaw ?? []).map((e) => ({
      usuarioId: e.usuario_id,
      nombre: miembros.find((m) => m.id === e.usuario_id)?.nombre ?? "???",
      pl: e.pl,
    }));
  }

  return (
    <SalaView
      sala={sala}
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
