"use server";

import { createClient } from "@/lib/supabase/server";
import { completeTourAction, normalizeTourProgress, TOUR_STEPS, type TourProgress } from "@/lib/tutorialTour";

// No game RPCs or game-table writes belong in this action. Training only
// advances its own progress; items and rewards are projections of that state.
export async function trainingAction(action: string): Promise<TourProgress> {
  if (!["start", "pause", "restart", ...TOUR_STEPS.map(s => s.id)].includes(action)) throw new Error("Acción de práctica desconocida.");
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Vuelve a iniciar sesión.");
  const { data: row, error } = await db.from("tutorial_progreso")
    .select("paso, vistos, estado, actualizado_at").eq("usuario_id", user.id).maybeSingle();
  if (error) throw new Error("No se pudo leer la práctica.");
  const current = normalizeTourProgress(row);
  let next: TourProgress;
  if (action === "restart") next = { paso: TOUR_STEPS[0].id, vistos: [], estado: "en_curso" };
  else if (action === "start") next = { ...current, estado: current.estado === "completado" ? "completado" : "en_curso" };
  else if (action === "pause") next = { ...current, estado: current.estado === "completado" ? "completado" : "pausado" };
  else {
    if (row?.estado !== "en_curso") throw new Error("Retoma la práctica antes de continuar.");
    if (current.paso !== action) throw new Error("El paso ha cambiado. Recarga para retomar la práctica.");
    next = completeTourAction(current, action);
  }
  const payload = { ...next, actualizado_at: new Date().toISOString() };
  if (row) {
    const result = await db.from("tutorial_progreso").update(payload)
      .eq("usuario_id", user.id).eq("actualizado_at", row.actualizado_at).select("usuario_id");
    if (result.error || !result.data?.length) throw new Error("La práctica cambió en otra pestaña. Recarga para continuar.");
  } else {
    const result = await db.from("tutorial_progreso").insert({ ...payload, usuario_id: user.id });
    if (result.error) throw new Error("No se pudo preparar la práctica. Recarga e inténtalo de nuevo.");
  }
  return next;
}
