import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import AmigosClient, { type Amigo } from "@/components/AmigosClient";
import { createClient } from "@/lib/supabase/server";

export default async function AmigosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: filas } = await supabase.rpc("mis_amigos");

  const amigos: Amigo[] = (
    (filas ?? []) as {
      amigo_id: string;
      nombre: string;
      estado: "pendiente" | "aceptada";
      solicitado_por: string;
    }[]
  ).map((f) => ({
    amigoId: f.amigo_id,
    nombre: f.nombre,
    estado: f.estado,
    solicitadoPorMi: f.solicitado_por === user.id,
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />
      <h1 className="mb-6 font-titulo text-3xl text-texto">👥 Amigos</h1>
      <AmigosClient amigosIniciales={amigos} />
    </main>
  );
}
