"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NombreEditor({ actual }: { actual: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(actual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("cambiar_nombre_usuario", {
      p_nombre: valor,
    });
    setGuardando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <button
        onClick={() => {
          setValor(actual);
          setEditando(true);
        }}
        className="mb-2 text-xs text-texto2 underline"
      >
        Cambiar nombre de usuario
      </button>
    );
  }

  return (
    <div className="mb-3 flex flex-col items-center gap-2">
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        maxLength={24}
        placeholder="Tu nombre de usuario"
        className="w-full max-w-xs rounded-xl border border-borde bg-tarjeta px-4 py-2 text-center text-sm text-texto outline-none focus:border-ambar"
      />
      {error && <p className="text-xs text-rosa">{error}</p>}
      <p className="text-[11px] text-texto2">
        3-24 caracteres, sin duplicados. Con este nombre te podrán encontrar
        tus amigos.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setEditando(false);
            setError(null);
          }}
          className="rounded-lg border border-borde px-3 py-1.5 text-xs text-texto2 active:scale-95"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando || valor.trim() === ""}
          className="rounded-lg bg-ambar px-3 py-1.5 text-xs font-semibold text-fondo active:scale-95 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
