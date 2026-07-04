import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import RetosClient from "@/components/RetosClient";

export default async function RetosPage() {
  const supabase = await createClient();
  const { data: estadoRaw } = await supabase.rpc("estado_retos_semana");

  const estado = (estadoRaw ?? []) as {
    slug: string;
    actual: number;
    umbral: number;
    reclamado: boolean;
  }[];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-16 pt-6">
      <BackButton />
      <header className="mb-6">
        <p className="font-titulo text-3xl text-ambar">🎯 Retos semanales</p>
        <p className="mt-2 text-sm text-texto2">
          Se reinician cada semana. Complétalos y reclama la recompensa antes
          de que empiece la siguiente.
        </p>
      </header>
      <RetosClient estadoInicial={estado} />
    </main>
  );
}
