"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InvitarNocheControl({ nocheId }: { nocheId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setAbierto(true);
    if (enlace) return;
    setGenerando(true);
    setError(null);
    const { data, error } = await createClient().rpc("crear_invitacion_noche", {
      p_noche: nocheId,
    });
    setGenerando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnlace(`${window.location.origin}/invitado/${data}`);
  }

  async function compartir() {
    if (!enlace) return;
    const texto = `¡Únete a esta noche en El Ranking, sin cuenta! 🍻 ${enlace}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url: enlace });
        return;
      } catch {
        // cancelado
      }
    } else {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <div className="mb-4">
      {!abierto ? (
        <button
          type="button"
          onClick={() => void generar()}
          className="w-full rounded-2xl border border-cian px-4 py-3 text-sm text-cian active:scale-95"
        >
          👥 Invitar a alguien sin cuenta
        </button>
      ) : (
        <div className="rounded-2xl border border-cian/50 bg-tarjeta p-4 text-center">
          {generando ? (
            <p className="text-sm text-texto2">Generando enlace…</p>
          ) : error ? (
            <p className="text-sm text-rosa">{error}</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-texto2">
                Vale para esta noche. Quien lo abra puede unirse sin crear
                cuenta ni entrar a la sala permanente.
              </p>
              <button
                type="button"
                onClick={() => void compartir()}
                className="w-full break-all rounded-lg bg-cian px-3 py-2 text-sm font-semibold text-fondo active:scale-95"
              >
                {copiado ? "¡Copiado! 📋" : `📤 ${enlace}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
