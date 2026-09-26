import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import NewPassword from "@/components/NewPassword";

export default async function NuevaPasswordPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6">
    <h1 className="font-titulo text-3xl text-ambar">Enlace no válido</h1>
    <p className="text-texto2">Solicita otro enlace y ábrelo en el mismo navegador desde el que lo pediste.</p>
    <Link href="/auth/recuperar" className="py-3 text-cian underline">Solicitar otro enlace</Link>
  </main>;
  return <NewPassword />;
}
