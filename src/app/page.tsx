import { createClient } from "@/lib/supabase/server";
import SalasHome from "@/components/SalasHome";

type SalaResumen = {
  id: string;
  nombre: string;
  codigo: string;
  rol: string;
  nocheActivaId: string | null;
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
    .select("rol, salas(id, nombre, codigo)")
    .eq("usuario_id", user!.id);

  const salaIds = (membresias ?? []).map((m) => {
    const sala = m.salas as unknown as { id: string };
    return sala.id;
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

  const salas: SalaResumen[] = (membresias ?? []).map((m) => {
    const sala = m.salas as unknown as {
      id: string;
      nombre: string;
      codigo: string;
    };
    return {
      id: sala.id,
      nombre: sala.nombre,
      codigo: sala.codigo,
      rol: m.rol,
      nocheActivaId: nocheActivaPorSala.get(sala.id) ?? null,
    };
  });

  return (
    <SalasHome nombreUsuario={perfil?.nombre ?? "Anónimo"} salas={salas} />
  );
}
