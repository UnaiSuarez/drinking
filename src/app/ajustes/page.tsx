import Link from "next/link";
import { redirect } from "next/navigation";
import AjustesClient from "@/components/AjustesClient";
import { createClient } from "@/lib/supabase/server";

export default async function AjustesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, cumpleanos")
    .eq("id", user.id)
    .single();

  return <main className="mx-auto min-h-dvh w-full max-w-xl px-5 pb-20 pt-8">
    <Link href={`/perfil/${user.id}`} className="text-sm text-texto2 hover:text-texto">← Perfil</Link>
    <h1 className="mb-6 mt-5 font-titulo text-3xl text-texto">Ajustes</h1>
    <AjustesClient email={user.email ?? ""} nombreInicial={perfil?.nombre ?? ""} cumpleanosInicial={perfil?.cumpleanos ?? null} />
  </main>;
}
