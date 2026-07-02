import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NocheLive, {
  type Bebida,
  type Jugador,
  type Registro,
} from "@/components/NocheLive";

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
    .select("id, sala_id, estado, inicio, fin_programado")
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
    .select("usuario_id, perfiles(nombre)")
    .eq("noche_id", id);

  const jugadores: Jugador[] = (jugadoresRaw ?? []).map((j) => ({
    id: j.usuario_id,
    nombre:
      (j.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???",
  }));

  const { data: registros } = await supabase
    .from("registros")
    .select("id, usuario_id, bebida_tipo_id, ts")
    .eq("noche_id", id)
    .eq("anulado", false)
    .order("ts");

  return (
    <NocheLive
      noche={noche}
      salaNombre={sala?.nombre ?? ""}
      bebidas={(bebidas ?? []) as Bebida[]}
      jugadoresIniciales={jugadores}
      registrosIniciales={(registros ?? []) as Registro[]}
      userId={user!.id}
      esAdmin={esAdmin}
    />
  );
}
