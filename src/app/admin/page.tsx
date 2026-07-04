import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanel from "@/components/AdminPanel";

const ADMIN_EMAIL = "unaisucar64535@gmail.com";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    redirect("/");
  }

  const { data: logrosRaw } = await supabase
    .from("logros")
    .select("slug, nombre, icono, rareza")
    .order("id");

  return <AdminPanel logros={logrosRaw ?? []} />;
}
