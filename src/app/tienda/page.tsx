import BackButton from "@/components/BackButton";
import TiendaClient from "@/components/TiendaClient";
import { createClient } from "@/lib/supabase/server";

export default async function TiendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, avatar_config, xp")
    .eq("id", user!.id)
    .single();

  const { data: participaciones } = await supabase
    .from("noche_jugadores")
    .select("pl_ganados")
    .eq("usuario_id", user!.id);

  const plHistoricos = (participaciones ?? []).reduce(
    (total, participacion) => total + (participacion.pl_ganados ?? 0),
    0
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />
      <TiendaClient
        userId={user!.id}
        nombre={perfil?.nombre ?? "tu perfil"}
        avatarConfigRaw={perfil?.avatar_config ?? null}
        xp={perfil?.xp ?? 0}
        plHistoricos={plHistoricos}
      />
    </main>
  );
}
