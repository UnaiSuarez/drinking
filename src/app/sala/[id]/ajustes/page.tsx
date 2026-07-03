import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BalanceEditor from "@/components/BalanceEditor";

export default async function AjustesSalaPage({
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
    .select("id, nombre, balance")
    .eq("id", id)
    .single();

  if (!sala) notFound();

  const { data: miembro } = await supabase
    .from("sala_miembros")
    .select("rol")
    .eq("sala_id", id)
    .eq("usuario_id", user!.id)
    .single();

  const esAdmin =
    miembro && (miembro.rol === "fundador" || miembro.rol === "admin");
  if (!esAdmin) redirect(`/sala/${id}`);

  // No se puede tocar el balance con una noche activa o cerrándose
  const { data: nocheEnCurso } = await supabase
    .from("noches")
    .select("id")
    .eq("sala_id", id)
    .in("estado", ["activa", "cerrando"])
    .maybeSingle();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${id}`} className="text-sm text-texto2">
        ← {sala.nombre}
      </Link>
      <h1 className="mb-2 mt-2 font-titulo text-3xl text-texto">
        ⚖️ Balance de liga
      </h1>
      <p className="mb-6 text-sm text-texto2">
        Ajusta cuántos Puntos de Liga da cada cosa en esta sala. Los cambios
        solo afectan a las noches que se cierren a partir de ahora.
      </p>
      {nocheEnCurso ? (
        <div className="rounded-3xl border-2 border-rosa bg-tarjeta p-6 text-center">
          <p className="font-titulo text-lg text-rosa">🔒 Noche en curso</p>
          <p className="mt-1 text-sm text-texto2">
            No se puede cambiar el balance mientras hay una noche activa —
            nada de trampas en caliente 😄
          </p>
        </div>
      ) : (
        <BalanceEditor
          salaId={sala.id}
          balanceActual={(sala.balance ?? null) as Record<string, number> | null}
        />
      )}
    </main>
  );
}
