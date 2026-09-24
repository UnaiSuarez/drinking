import { createClient } from "@/lib/supabase/server";
import SalasHome from "@/components/SalasHome";

type SalaResumen = {
  id: string;
  nombre: string;
  codigo: string;
  rol: string;
  nocheActivaId: string | null;
  archivadaAt: string | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre")
    .eq("id", user!.id)
    .single();

  const { data: membresias } = await supabase
    .from("sala_miembros")
    .select("rol, salas(id, nombre, codigo, archivada_at)")
    .eq("usuario_id", user!.id);

  const salaIds = (membresias ?? []).flatMap((m) => {
    const sala = m.salas as unknown as { id: string; archivada_at: string | null } | null;
    return sala && !sala.archivada_at ? [sala.id] : [];
  });

  const { data: nochesActivas } =
    salaIds.length > 0
      ? await supabase
          .from("noches")
          .select("id, sala_id")
          .in("sala_id", salaIds)
          .in("estado", ["activa", "cerrando"])
      : { data: [] };

  const nocheActivaPorSala = new Map(
    (nochesActivas ?? []).map((n) => [n.sala_id, n.id])
  );

  const salas: SalaResumen[] = (membresias ?? []).flatMap((m) => {
    const sala = m.salas as unknown as {
      id: string;
      nombre: string;
      codigo: string;
      archivada_at: string | null;
    } | null;
    if (!sala) return [];
    return [{
      id: sala.id,
      nombre: sala.nombre,
      codigo: sala.codigo,
      rol: m.rol,
      nocheActivaId: nocheActivaPorSala.get(sala.id) ?? null,
      archivadaAt: sala.archivada_at,
    }];
  });

  return (
    <SalasHome nombreUsuario={perfil?.nombre ?? "Anónimo"} salas={salas} />
  );
}
