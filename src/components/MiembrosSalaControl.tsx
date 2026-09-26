"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type MiembroSala = {
  usuarioId: string;
  nombre: string;
  rol: string;
};

const ROL_NOMBRE: Record<string, string> = {
  fundador: "Fundador",
  admin: "Admin",
  miembro: "Miembro",
};

export default function MiembrosSalaControl({
  salaId,
  miMiembroId,
  miRol,
  miembros,
}: {
  salaId: string;
  miMiembroId: string;
  miRol: string;
  miembros: MiembroSala[];
}) {
  const router = useRouter();
  const [expulsando, setExpulsando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function expulsar(usuarioId: string, nombre: string) {
    if (!confirm(`¿Expulsar a ${nombre} de la sala?`)) return;
    setExpulsando(usuarioId);
    setError(null);
    const { error: rpcError } = await createClient().rpc("expulsar_miembro_sala", {
      p_sala: salaId,
      p_usuario_id: usuarioId,
    });
    setExpulsando(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-8 border-t border-borde pt-6">
      <h2 className="font-titulo text-xl text-texto">Miembros ({miembros.length})</h2>
      {error && <p role="alert" className="mt-2 text-sm text-rosa">{error}</p>}
      <ul className="mt-3 space-y-1.5">
        {miembros.map((m) => {
          const puedoExpulsar =
            m.usuarioId !== miMiembroId &&
            m.rol !== "fundador" &&
            (miRol === "fundador" || m.rol === "miembro");
          return (
            <li
              key={m.usuarioId}
              className="flex items-center justify-between rounded-xl border border-borde bg-tarjeta px-4 py-2.5"
            >
              <span className="text-sm text-texto">
                {m.nombre}
                {m.usuarioId === miMiembroId && (
                  <span className="ml-1 text-xs text-texto2">(tú)</span>
                )}
                <span className="ml-2 text-xs text-texto2">
                  {ROL_NOMBRE[m.rol] ?? m.rol}
                </span>
              </span>
              {puedoExpulsar && (
                <button
                  onClick={() => void expulsar(m.usuarioId, m.nombre)}
                  disabled={expulsando === m.usuarioId}
                  className="rounded-lg border border-rosa px-3 py-1.5 text-xs text-rosa active:scale-95 disabled:opacity-50"
                >
                  {expulsando === m.usuarioId ? "..." : "Expulsar"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
