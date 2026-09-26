"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RenombrarSalaControl({
  salaId,
  nombreActual,
}: {
  salaId: string;
  nombreActual: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreActual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando || nombre.trim() === nombreActual) return;
    setGuardando(true);
    setError(null);
    setOk(false);
    const { error: rpcError } = await createClient().rpc("renombrar_sala", {
      p_sala: salaId,
      p_nombre: nombre.trim(),
    });
    setGuardando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <section className="mt-8 border-t border-borde pt-6">
      <h2 className="font-titulo text-xl text-texto">Nombre de la sala</h2>
      <form onSubmit={(e) => void guardar(e)} className="mt-3 flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={60}
          className="flex-1 rounded-lg border border-borde bg-fondo px-3 py-2 text-texto outline-none focus:border-ambar"
        />
        <button
          type="submit"
          disabled={guardando || !nombre.trim() || nombre.trim() === nombreActual}
          className="rounded-lg bg-ambar px-4 py-2 text-sm font-semibold text-fondo disabled:opacity-40"
        >
          {guardando ? "..." : "Guardar"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-rosa">{error}</p>}
      {ok && <p className="mt-2 text-sm text-lima">Nombre actualizado.</p>}
    </section>
  );
}
