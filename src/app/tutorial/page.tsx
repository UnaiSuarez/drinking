import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import TutorialTour from "@/components/TutorialTour";
import { normalizeTourProgress } from "@/lib/tutorialTour";

export default async function TutorialPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data, error } = await supabase.from("tutorial_progreso")
    .select("paso, vistos, estado").eq("usuario_id", user.id).maybeSingle();
  return <TutorialTour key={user.id} userId={user.id} initial={normalizeTourProgress(data)} loadError={Boolean(error)} />;
}
