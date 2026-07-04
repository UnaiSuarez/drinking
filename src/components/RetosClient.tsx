"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RECOMPENSA_RETO, RETOS_SEMANALES } from "@/lib/retos";

type EstadoReto = {
  slug: string;
  actual: number;
  umbral: number;
  reclamado: boolean;
};

export default function RetosClient({
  estadoInicial,
}: {
  estadoInicial: EstadoReto[];
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoInicial);
  const [reclamando, setReclamando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function reclamar(slug: string) {
    setReclamando(slug);
    setMensaje(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("reclamar_reto", { p_slug: slug });
    setReclamando(null);
    if (error) {
      setMensaje(`Error: ${error.message}`);
      return;
    }
    setEstado((prev) =>
      prev.map((e) => (e.slug === slug ? { ...e, reclamado: true } : e))
    );
    setMensaje(
      `✅ Reto completado: +${RECOMPENSA_RETO.chapas} chapas, +${RECOMPENSA_RETO.xp} XP`
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {mensaje && (
        <p className="rounded-2xl bg-tarjeta px-4 py-3 text-center text-sm text-cian">
          {mensaje}
        </p>
      )}
      {RETOS_SEMANALES.map((reto) => {
        const e = estado.find((x) => x.slug === reto.slug);
        const actual = Math.min(e?.actual ?? 0, e?.umbral ?? 1);
        const umbral = e?.umbral ?? 1;
        const completado = actual >= umbral;
        const reclamado = e?.reclamado ?? false;
        return (
          <section
            key={reto.slug}
            className={`rounded-3xl border p-4 ${
              reclamado
                ? "border-lima/50 bg-tarjeta"
                : completado
                  ? "border-ambar bg-tarjeta glow-ambar"
                  : "border-borde bg-tarjeta"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-titulo text-lg text-texto">
                {reto.icono} {reto.nombre}
              </p>
              <span className="rounded-full bg-fondo px-2 py-1 text-xs text-texto2">
                {actual}/{umbral}
              </span>
            </div>
            <p className="mb-3 text-xs text-texto2">{reto.descripcion}</p>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-fondo">
              <div
                className="h-full rounded-full bg-ambar transition-all"
                style={{ width: `${(actual / umbral) * 100}%` }}
              />
            </div>
            {reclamado ? (
              <p className="text-center text-sm text-lima">
                ✓ Reclamado esta semana
              </p>
            ) : completado ? (
              <button
                onClick={() => reclamar(reto.slug)}
                disabled={reclamando === reto.slug}
                className="w-full rounded-2xl bg-ambar py-3 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
              >
                {reclamando === reto.slug
                  ? "Reclamando..."
                  : `Reclamar +${RECOMPENSA_RETO.chapas} chapas / +${RECOMPENSA_RETO.xp} XP`}
              </button>
            ) : (
              <p className="text-center text-xs text-texto2">
                Todavía no completado
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
