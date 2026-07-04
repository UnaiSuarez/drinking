import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NocheLive, {
  type Bebida,
  type Jugador,
  type Penalizacion,
  type PenalizacionTipo,
  type Registro,
  type Voto,
} from "@/components/NocheLive";
import { parseAvatarConfig } from "@/lib/avatar";

export default async function NochePage({
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
    .select(
      "id, sala_id, estado, inicio, fin_programado, fin_gracia, votacion_categoria"
    )
    .eq("id", id)
    .single();

  if (!noche) notFound();
  if (noche.estado === "cerrada") redirect(`/noche/${id}/podio`);

  const { data: sala } = await supabase
    .from("salas")
    .select("nombre")
    .eq("id", noche.sala_id)
    .single();

  const { data: miembro } = await supabase
    .from("sala_miembros")
    .select("rol")
    .eq("sala_id", noche.sala_id)
    .eq("usuario_id", user!.id)
    .single();

  if (!miembro) notFound();
  const esAdmin = miembro.rol === "fundador" || miembro.rol === "admin";

  const { data: bebidas } = await supabase
    .from("bebidas_tipo")
    .select("id, nombre, icono, puntos")
    .or(`sala_id.is.null,sala_id.eq.${noche.sala_id}`)
    .order("orden");

  const { data: jugadoresRaw } = await supabase
    .from("noche_jugadores")
    .select("usuario_id, perfiles(nombre, avatar_config)")
    .eq("noche_id", id);

  const jugadores: Jugador[] = (jugadoresRaw ?? []).map((j) => {
    const p = j.perfiles as unknown as {
      nombre: string;
      avatar_config: unknown;
    } | null;
    return {
      id: j.usuario_id,
      nombre: p?.nombre ?? "???",
      avatarConfig: parseAvatarConfig(p?.avatar_config),
      avatarConfigRaw: p?.avatar_config ?? null,
    };
  });

  const { data: registros } = await supabase
    .from("registros")
    .select("id, usuario_id, bebida_tipo_id, ts, retroactivo")
    .eq("noche_id", id)
    .eq("anulado", false)
    .order("ts");

  const { data: votos } = await supabase
    .from("noche_votos")
    .select("votante_id, votado_id")
    .eq("noche_id", id);

  const { data: confirmaciones } = await supabase
    .from("noche_confirmaciones")
    .select("usuario_id")
    .eq("noche_id", id);

  const { data: penalizacionesTipo } = await supabase
    .from("penalizaciones_tipo")
    .select("id, slug, nombre, icono, pl")
    .order("id");

  const { data: penalizaciones } = await supabase
    .from("noche_penalizaciones")
    .select("id, usuario_id, penalizacion_id, otorgada_por")
    .eq("noche_id", id);

  const { data: logrosNocheRaw } = await supabase
    .from("logros_usuario")
    .select("logros(nombre)")
    .eq("usuario_id", user!.id)
    .eq("noche_id", id);

  const logrosVistosIniciales = (logrosNocheRaw ?? [])
    .map((l) => (l.logros as unknown as { nombre: string } | null)?.nombre)
    .filter((nombre): nombre is string => !!nombre);

  return (
    <NocheLive
      noche={{
        ...noche,
        estado: noche.estado as "activa" | "cerrando" | "cerrada",
      }}
      salaNombre={sala?.nombre ?? ""}
      bebidas={(bebidas ?? []) as Bebida[]}
      jugadoresIniciales={jugadores}
      registrosIniciales={(registros ?? []) as Registro[]}
      votosIniciales={(votos ?? []) as Voto[]}
      confirmacionesIniciales={(confirmaciones ?? []).map((c) => c.usuario_id)}
      penalizacionesTipo={(penalizacionesTipo ?? []) as PenalizacionTipo[]}
      penalizacionesIniciales={(penalizaciones ?? []) as Penalizacion[]}
      logrosVistosIniciales={logrosVistosIniciales}
      userId={user!.id}
      esAdmin={esAdmin}
    />
  );
}
