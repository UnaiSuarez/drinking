"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type Amigo = {
  amigoId: string;
  nombre: string;
  estado: "pendiente" | "aceptada";
  solicitadoPorMi: boolean;
};

type Resultado = { id: string; nombre: string };

export default function AmigosClient({
  amigosIniciales,
}: {
  amigosIniciales: Amigo[];
}) {
  const supabase = createClient();
  const [amigos, setAmigos] = useState(amigosIniciales);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  const aceptados = amigos.filter((a) => a.estado === "aceptada");
  const recibidas = amigos.filter(
    (a) => a.estado === "pendiente" && !a.solicitadoPorMi
  );
  const enviadas = amigos.filter(
    (a) => a.estado === "pendiente" && a.solicitadoPorMi
  );
  const idsConocidos = new Set(amigos.map((a) => a.amigoId));

  async function buscar(texto: string) {
    setQuery(texto);
    setMensaje(null);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const { data, error } = await supabase.rpc("buscar_usuarios_por_nombre", {
      p_query: texto.trim(),
    });
    setBuscando(false);
    if (!error) setResultados(data ?? []);
  }

  async function enviarSolicitud(destino: Resultado) {
    setCargando(destino.id);
    setMensaje(null);
    const { data, error } = await supabase.rpc("enviar_solicitud_amistad", {
      p_destino_id: destino.id,
    });
    setCargando(null);
    if (error) {
      setMensaje(error.message);
      return;
    }
    if (data.estado === "pendiente") {
      fetch("/api/notificar-amistad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amistadId: data.id }),
      }).catch((err) => console.error("notificar-amistad:", err));
    }
    setAmigos((prev) => [
      ...prev.filter((a) => a.amigoId !== destino.id),
      {
        amigoId: destino.id,
        nombre: destino.nombre,
        estado: data.estado,
        solicitadoPorMi: data.estado === "pendiente",
      },
    ]);
    setResultados((prev) => prev.filter((r) => r.id !== destino.id));
  }

  async function responder(amigoId: string, aceptar: boolean) {
    setCargando(amigoId);
    setMensaje(null);
    const { error } = await supabase.rpc("responder_solicitud_amistad", {
      p_solicitante_id: amigoId,
      p_aceptar: aceptar,
    });
    setCargando(null);
    if (error) {
      setMensaje(error.message);
      return;
    }
    setAmigos((prev) =>
      aceptar
        ? prev.map((a) =>
            a.amigoId === amigoId ? { ...a, estado: "aceptada" } : a
          )
        : prev.filter((a) => a.amigoId !== amigoId)
    );
  }

  async function eliminar(amigoId: string) {
    setCargando(amigoId);
    setMensaje(null);
    const { error } = await supabase.rpc("eliminar_amigo", {
      p_otro_id: amigoId,
    });
    setCargando(null);
    if (error) {
      setMensaje(error.message);
      return;
    }
    setAmigos((prev) => prev.filter((a) => a.amigoId !== amigoId));
  }

  return (
    <div>
      <section className="mb-6">
        <input
          value={query}
          onChange={(e) => buscar(e.target.value)}
          placeholder="Buscar por nombre de usuario…"
          className="w-full rounded-2xl border border-borde bg-tarjeta px-4 py-3 text-sm text-texto placeholder-texto2 outline-none focus:border-ambar"
        />
        {mensaje && <p className="mt-2 text-xs text-rosa">{mensaje}</p>}
        {buscando && (
          <p className="mt-2 text-xs text-texto2">Buscando…</p>
        )}
        {resultados.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {resultados.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-borde bg-tarjeta px-4 py-2.5"
              >
                <span className="text-sm text-texto">{r.nombre}</span>
                {idsConocidos.has(r.id) ? (
                  <span className="text-xs text-texto2">Ya en tu lista</span>
                ) : (
                  <button
                    onClick={() => enviarSolicitud(r)}
                    disabled={cargando === r.id}
                    className="rounded-lg bg-ambar px-3 py-1.5 text-xs font-semibold text-fondo active:scale-95 disabled:opacity-50"
                  >
                    {cargando === r.id ? "…" : "Añadir"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!buscando &&
          query.trim().length >= 2 &&
          resultados.length === 0 && (
            <p className="mt-2 text-xs text-texto2">Nadie con ese nombre.</p>
          )}
      </section>

      {recibidas.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-titulo text-sm uppercase text-texto2">
            Solicitudes recibidas
          </h2>
          <ul className="space-y-1.5">
            {recibidas.map((a) => (
              <li
                key={a.amigoId}
                className="flex items-center justify-between rounded-xl border border-ambar/50 bg-tarjeta px-4 py-2.5"
              >
                <Link
                  href={`/perfil/${a.amigoId}`}
                  className="text-sm text-texto underline"
                >
                  {a.nombre}
                </Link>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => responder(a.amigoId, true)}
                    disabled={cargando === a.amigoId}
                    className="rounded-lg bg-lima px-3 py-1.5 text-xs font-semibold text-fondo active:scale-95 disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => responder(a.amigoId, false)}
                    disabled={cargando === a.amigoId}
                    className="rounded-lg border border-rosa px-3 py-1.5 text-xs text-rosa active:scale-95 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {enviadas.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-titulo text-sm uppercase text-texto2">
            Solicitudes enviadas
          </h2>
          <ul className="space-y-1.5">
            {enviadas.map((a) => (
              <li
                key={a.amigoId}
                className="flex items-center justify-between rounded-xl border border-borde bg-tarjeta px-4 py-2.5"
              >
                <Link
                  href={`/perfil/${a.amigoId}`}
                  className="text-sm text-texto underline"
                >
                  {a.nombre}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-texto2">Pendiente</span>
                  <button
                    onClick={() => eliminar(a.amigoId)}
                    disabled={cargando === a.amigoId}
                    className="rounded-lg border border-borde px-3 py-1.5 text-xs text-texto2 active:scale-95 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-titulo text-sm uppercase text-texto2">
          Amigos ({aceptados.length})
        </h2>
        {aceptados.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-6 text-center text-sm text-texto2">
            Todavía no tienes amigos añadidos. Búscalos por su nombre de
            usuario arriba.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {aceptados.map((a) => (
              <li
                key={a.amigoId}
                className="flex items-center justify-between rounded-xl border border-borde bg-tarjeta px-4 py-2.5"
              >
                <Link
                  href={`/perfil/${a.amigoId}`}
                  className="text-sm text-texto underline"
                >
                  {a.nombre}
                </Link>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/mapa/amigo/${a.amigoId}`}
                    aria-label={`Sitios de ${a.nombre}`}
                    title="Sus sitios"
                    className="rounded-lg border border-borde px-2.5 py-1.5 text-sm active:scale-95"
                  >
                    🗺️
                  </Link>
                  <button
                    onClick={() => eliminar(a.amigoId)}
                    disabled={cargando === a.amigoId}
                    className="rounded-lg border border-rosa px-3 py-1.5 text-xs text-rosa active:scale-95 disabled:opacity-50"
                  >
                    {cargando === a.amigoId ? "…" : "Quitar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
