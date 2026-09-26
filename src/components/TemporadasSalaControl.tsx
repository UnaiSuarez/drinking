"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type TemporadaSala = {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  estado: string;
  premio: string | null;
};

function aFechaInput(iso: string) {
  return iso.slice(0, 16);
}

export default function TemporadasSalaControl({
  salaId,
  temporadas,
}: {
  salaId: string;
  temporadas: TemporadaSala[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formInicio, setFormInicio] = useState("");
  const [formFin, setFormFin] = useState("");
  const [formPremio, setFormPremio] = useState("");

  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoInicio, setNuevoInicio] = useState("");
  const [nuevoFin, setNuevoFin] = useState("");
  const [nuevoPremio, setNuevoPremio] = useState("");

  function abrirEdicion(t: TemporadaSala) {
    setEditando(t.id);
    setFormNombre(t.nombre);
    setFormInicio(aFechaInput(t.inicio));
    setFormFin(aFechaInput(t.fin));
    setFormPremio(t.premio ?? "");
    setError(null);
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando || guardando) return;
    setGuardando(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("actualizar_temporada", {
      p_temporada_id: editando,
      p_nombre: formNombre.trim(),
      p_inicio: new Date(formInicio).toISOString(),
      p_fin: new Date(formFin).toISOString(),
      p_premio: formPremio.trim(),
    });
    setGuardando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setEditando(null);
    router.refresh();
  }

  async function cerrarAhora(id: string) {
    if (!confirm("¿Cerrar esta temporada ahora? Se reparte el liguero final en la siguiente noche que se cierre.")) return;
    setGuardando(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("cerrar_temporada_manual", {
      p_temporada_id: id,
    });
    setGuardando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  async function crearTemporada(e: React.FormEvent) {
    e.preventDefault();
    if (guardando || !nuevoNombre.trim() || !nuevoInicio || !nuevoFin) return;
    setGuardando(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("crear_temporada_sala", {
      p_sala: salaId,
      p_nombre: nuevoNombre.trim(),
      p_inicio: new Date(nuevoInicio).toISOString(),
      p_fin: new Date(nuevoFin).toISOString(),
      p_premio: nuevoPremio.trim() || null,
    });
    setGuardando(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNuevaAbierta(false);
    setNuevoNombre("");
    setNuevoInicio("");
    setNuevoFin("");
    setNuevoPremio("");
    router.refresh();
  }

  return (
    <section className="mt-8 border-t border-borde pt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-titulo text-xl text-texto">Temporadas de liga</h2>
        <button
          type="button"
          onClick={() => setNuevaAbierta((v) => !v)}
          className="rounded-lg border border-ambar px-3 py-1.5 text-xs text-ambar active:scale-95"
        >
          {nuevaAbierta ? "Cancelar" : "+ Nueva"}
        </button>
      </div>
      <p className="mt-1 text-xs text-texto2">
        Crear una nueva cierra la activa. Al terminar la fecha de fin, la
        siguiente noche que se cierre crea la próxima automáticamente si no
        hay ninguna activa.
      </p>

      {error && <p role="alert" className="mt-2 text-sm text-rosa">{error}</p>}

      {nuevaAbierta && (
        <form onSubmit={(e) => void crearTemporada(e)} className="mt-3 space-y-2 rounded-2xl border border-ambar/50 bg-tarjeta p-4">
          <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre de la temporada" maxLength={60} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-ambar" />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-texto2">
              Inicio
              <input type="datetime-local" value={nuevoInicio} onChange={(e) => setNuevoInicio(e.target.value)} className="mt-1 w-full rounded-lg border border-borde bg-fondo px-2 py-2 text-sm text-texto" />
            </label>
            <label className="flex-1 text-xs text-texto2">
              Fin
              <input type="datetime-local" value={nuevoFin} onChange={(e) => setNuevoFin(e.target.value)} className="mt-1 w-full rounded-lg border border-borde bg-fondo px-2 py-2 text-sm text-texto" />
            </label>
          </div>
          <input value={nuevoPremio} onChange={(e) => setNuevoPremio(e.target.value)} placeholder="Premio al terminar (opcional)" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-ambar" />
          <button type="submit" disabled={guardando} className="w-full rounded-lg bg-ambar py-2 text-sm font-semibold text-fondo disabled:opacity-40">
            {guardando ? "..." : "Crear y activar"}
          </button>
        </form>
      )}

      <ul className="mt-3 space-y-2">
        {temporadas.map((t) => (
          <li key={t.id} className="rounded-2xl border border-borde bg-tarjeta p-4">
            {editando === t.id ? (
              <form onSubmit={(e) => void guardarEdicion(e)} className="space-y-2">
                <input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} maxLength={60} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-ambar" />
                <div className="flex gap-2">
                  <label className="flex-1 text-xs text-texto2">
                    Inicio
                    <input type="datetime-local" value={formInicio} onChange={(e) => setFormInicio(e.target.value)} className="mt-1 w-full rounded-lg border border-borde bg-fondo px-2 py-2 text-sm text-texto" />
                  </label>
                  <label className="flex-1 text-xs text-texto2">
                    Fin
                    <input type="datetime-local" value={formFin} onChange={(e) => setFormFin(e.target.value)} className="mt-1 w-full rounded-lg border border-borde bg-fondo px-2 py-2 text-sm text-texto" />
                  </label>
                </div>
                <input value={formPremio} onChange={(e) => setFormPremio(e.target.value)} placeholder="Premio al terminar" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-ambar" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditando(null)} className="flex-1 rounded-lg border border-borde py-2 text-sm text-texto2">Cancelar</button>
                  <button type="submit" disabled={guardando} className="flex-1 rounded-lg bg-ambar py-2 text-sm font-semibold text-fondo disabled:opacity-40">
                    {guardando ? "..." : "Guardar"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-titulo text-sm text-texto">
                    {t.nombre}
                    {t.estado === "activa" && <span className="ml-2 text-xs text-lima">activa</span>}
                  </p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => abrirEdicion(t)} className="rounded-lg border border-borde px-2.5 py-1.5 text-xs text-texto2 active:scale-95">
                      Editar
                    </button>
                    {t.estado === "activa" && (
                      <button type="button" onClick={() => void cerrarAhora(t.id)} disabled={guardando} className="rounded-lg border border-rosa px-2.5 py-1.5 text-xs text-rosa active:scale-95 disabled:opacity-50">
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-texto2">
                  {new Date(t.inicio).toLocaleDateString("es-ES")} → {new Date(t.fin).toLocaleDateString("es-ES")}
                </p>
                {t.premio && <p className="mt-1 text-xs text-ambar">🏆 {t.premio}</p>}
              </>
            )}
          </li>
        ))}
        {temporadas.length === 0 && (
          <p className="rounded-2xl border border-borde bg-tarjeta p-4 text-center text-sm text-texto2">
            Todavía no hay ninguna temporada.
          </p>
        )}
      </ul>
    </section>
  );
}
