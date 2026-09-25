"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export default function ArchivarSalaControl({ salaId, nombre, nocheEnCurso }: {
  salaId: string;
  nombre: string;
  nocheEnCurso: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [archivando, setArchivando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useModalScrollLock(abierto);

  async function archivar(e: React.FormEvent) {
    e.preventDefault();
    if (confirmacion !== nombre || archivando || nocheEnCurso) return;
    setArchivando(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("archivar_sala", { p_sala: salaId });
    setArchivando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setAbierto(false);
    router.push("/");
    router.refresh();
  }

  return (
    <section className="mt-10 border-t border-borde pt-6">
      <h2 className="font-titulo text-xl text-rosa">Archivar sala</h2>
      <p className="mt-2 text-sm text-texto2">
        La sala desaparecerá para los miembros, pero conservará sus noches y estadísticas.
      </p>
      <button type="button" onClick={() => { setConfirmacion(""); setError(null); setAbierto(true); }} disabled={nocheEnCurso} className="mt-4 rounded-lg border border-rosa/50 px-3 py-2 text-sm text-rosa disabled:opacity-40">
        Archivar sala
      </button>
      {nocheEnCurso && <p className="mt-2 text-xs text-texto2">Cierra la noche antes de archivar.</p>}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <form onSubmit={(e) => void archivar(e)} role="dialog" aria-modal="true" aria-labelledby="titulo-archivar-sala" className="w-full max-w-sm rounded-lg border border-borde bg-tarjeta p-5">
            <h2 id="titulo-archivar-sala" className="font-titulo text-xl text-texto">Archivar {nombre}</h2>
            <p className="mt-2 text-sm text-texto2">Podrás restaurarla desde Tus salas.</p>
            <label htmlFor="nombre-archivar-sala" className="mt-5 block text-sm text-texto">Escribe {nombre} para confirmar</label>
            <input id="nombre-archivar-sala" autoFocus value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className="mt-2 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-texto outline-none focus:border-rosa" />
            {error && <p role="alert" className="mt-3 text-sm text-rosa">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-borde px-3 py-2 text-sm text-texto2">Cancelar</button>
              <button type="submit" disabled={confirmacion !== nombre || archivando} className="rounded-lg bg-rosa px-3 py-2 text-sm font-semibold text-fondo disabled:opacity-40">
                {archivando ? "Archivando..." : "Archivar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
