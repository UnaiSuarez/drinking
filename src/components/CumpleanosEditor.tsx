"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CumpleanosEditor({
  actual,
}: {
  actual: string | null;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(actual ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("perfiles")
        .update({ cumpleanos: valor || null })
        .eq("id", user.id);
    }
    setGuardando(false);
    router.refresh();
  }

  return (
    <div className="mb-6 flex items-center justify-center gap-2 text-xs text-texto2">
      <span>🎂 Tu cumpleaños:</span>
      <input
        type="date"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="rounded-lg border border-borde bg-tarjeta px-2 py-1 text-texto outline-none focus:border-ambar"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="rounded-lg border border-borde px-2 py-1 text-texto2 active:scale-95 disabled:opacity-50"
      >
        {guardando ? "…" : "Guardar"}
      </button>
    </div>
  );
}
