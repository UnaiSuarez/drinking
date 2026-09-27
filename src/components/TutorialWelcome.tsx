"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { savedAnimationMode, subscribeAnimations } from "@/lib/animationSettings";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export default function TutorialWelcome({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const animationChoice = useSyncExternalStore(subscribeAnimations, savedAnimationMode, () => null);
  const excluded = pathname === "/tutorial" || pathname === "/guia" || pathname === "/login" || pathname.startsWith("/auth");
  const open = pending && animationChoice !== null && !excluded;
  useModalScrollLock(open);

  useEffect(() => {
    if (excluded) return;
    let active = true;
    void createClient().from("tutorial_progreso").select("usuario_id").eq("usuario_id", userId).maybeSingle()
      .then(({ data, error }) => { if (active && !error) setPending(!data); });
    return () => { active = false; };
  }, [userId, excluded]);

  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) node.showModal();
    if (!open && node?.open) node.close();
  }, [open]);

  async function choose(start: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // A second tab must not overwrite progress already saved by the first.
      const { error } = await createClient().from("tutorial_progreso").upsert({
        usuario_id: userId, estado: start ? "en_curso" : "pausado",
      }, { onConflict: "usuario_id", ignoreDuplicates: true });
      if (error) throw error;
      setPending(false);
      if (start) router.push("/tutorial");
    } catch {
      setError("No se pudo guardar tu elección. Comprueba la conexión y vuelve a intentarlo.");
    } finally { setBusy(false); }
  }

  return <dialog ref={dialog} aria-labelledby="tutorial-welcome-title" onCancel={(event) => {
    event.preventDefault();
    void choose(false);
  }} className="m-auto max-h-[90svh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-lg border border-borde bg-tarjeta p-5 text-texto backdrop:bg-black/70">
    <BookOpen size={28} className="mb-4 text-cian" aria-hidden="true" />
    <h2 id="tutorial-welcome-title" className="font-titulo text-2xl">Te enseñamos El Ranking</h2>
      <p className="mt-3 text-sm leading-relaxed text-texto2">Aprende con los controles de una sala de entrenamiento: registros, ubicaciones, XP y liga, una noche y una carta prestada. Sin gastar ni cambiar tus datos reales.</p>
    <p className="mt-3 text-sm text-texto2">Puedes pausarla y retomarla desde Ajustes. Esta invitación solo aparece una vez por cuenta, también si ya usabas la app.</p>
    {error && <p role="alert" className="mt-3 text-sm text-rosa">{error}</p>}
    <button onClick={() => void choose(true)} disabled={busy} className="mt-5 min-h-11 w-full rounded-lg bg-cian px-4 py-3 font-titulo text-fondo disabled:opacity-50">{busy ? "Guardando…" : "Empezar tutorial"}</button>
    <button onClick={() => void choose(false)} disabled={busy} className="mt-2 min-h-11 w-full rounded-lg border border-borde px-4 py-2 text-sm disabled:opacity-50">Ahora no, lo veré en Ajustes</button>
  </dialog>;
}
