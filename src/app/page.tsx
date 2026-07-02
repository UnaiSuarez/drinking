import { createClient } from "@/lib/supabase/server";
import SalasHome from "@/components/SalasHome";

type SalaResumen = { id: string; nombre: string; codigo: string; rol: string };

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

  const salas: SalaResumen[] = (membresias ?? []).map((m) => {
    const sala = m.salas as unknown as {
      id: string;
      nombre: string;
      codigo: string;
    };
    return { id: sala.id, nombre: sala.nombre, codigo: sala.codigo, rol: m.rol };
  });

  return (
    <SalasHome nombreUsuario={perfil?.nombre ?? "Anónimo"} salas={salas} />
  );
}
