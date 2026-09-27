"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MARCO_INFO, MARCO_PRESTIGIO_HITOS } from "@/lib/marcos";
import { NIVEL_PRESTIGIO, tituloPrestigio } from "@/lib/prestigio";

export default function PrestigioPanel({ ciclo, nivel }: { ciclo: number; nivel: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completado, setCompletado] = useState<number | null>(null);
  const siguiente = ciclo + 1;
  const marco = MARCO_PRESTIGIO_HITOS.find((hito) => hito.prestigio === siguiente)?.marco;

  async function ascender() {
    if (ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const { data, error: fallo } = await createClient().rpc("ascender_prestigio", { p_ciclo_actual: ciclo });
      if (fallo) throw fallo;
      setCompletado(Number(data.ciclo));
      setConfirmando(false);
      router.refresh();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : (fallo as { message?: string }).message ?? "No se pudo completar el prestigio. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  return <section className="my-5 border-y border-ambar/40 py-4 text-left" aria-label="Prestigio">
    <h2 className="font-titulo text-lg text-ambar">Prestigio {ciclo}</h2>
    {completado !== null && <p role="status" className="my-2 text-sm text-lima">Prestigio {completado} conseguido. Tu inventario sigue contigo.</p>}
    <p className="mt-1 text-sm text-texto">Próxima recompensa: {tituloPrestigio(siguiente)}</p>
    <p className="mt-1 text-xs text-texto2">Emblema y título exclusivos{marco ? ` · ${MARCO_INFO[marco].nombre}` : ""}</p>
    {nivel < NIVEL_PRESTIGIO ? <p className="mt-3 text-xs text-texto2">Disponible al alcanzar el nivel {NIVEL_PRESTIGIO} · Nivel actual {nivel}</p> : !confirmando ?
      <button type="button" className="mt-3 w-full rounded-lg bg-ambar px-4 py-3 font-titulo text-fondo" onClick={() => setConfirmando(true)}>Hacer prestigio</button> :
      <div className="mt-3 space-y-3">
        <p className="text-sm text-texto">Volverás al nivel 1 con 0 XP. Conservas chapas, inventario, medallas, estadísticas y liga. Los cofres de nivel vuelven a estar disponibles en el nuevo ciclo. No se puede deshacer.</p>
        <div className="flex gap-2">
          <button type="button" disabled={ocupado} className="flex-1 rounded-lg border border-borde p-3 text-sm text-texto2 disabled:opacity-50" onClick={() => setConfirmando(false)}>Cancelar</button>
          <button type="button" disabled={ocupado} className="flex-1 rounded-lg bg-ambar p-3 font-titulo text-fondo disabled:opacity-50" onClick={ascender}>{ocupado ? "Ascendiendo…" : "Confirmar prestigio"}</button>
        </div>
      </div>}
    {error && <p role="alert" className="mt-3 text-sm text-rosa">{error}</p>}
  </section>;
}
