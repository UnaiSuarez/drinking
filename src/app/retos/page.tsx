import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import RetosPageClient from "@/components/RetosPageClient";

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
        <h1 className="font-titulo text-3xl text-ambar">🎯 Retos</h1>
      </header>
      <RetosPageClient estadoSemanal={estado} />
    </main>
  );
}
