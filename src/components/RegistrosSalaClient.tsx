"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type RegistroSala = {
  id: string;
  usuarioId: string;
  nombre: string;
  bebidaNombre: string;
  icono: string;
  ts: string;
};

export type MiembroRanking = {
  usuarioId: string;
  nombre: string;
  total: number;
};

const PAGINA = 20;

export default function RegistrosSalaClient({
  salaId,
  registrosIniciales,
  hayMasInicial,
  ranking: rankingInicial,
  userId,
  esAdmin,
  nombrePorUsuario,
  tipoPorId,
  nombrePorCatalogo,
}: {
  salaId: string;
  registrosIniciales: RegistroSala[];
  hayMasInicial: boolean;
  ranking: MiembroRanking[];
  userId: string;
  esAdmin: boolean;
  nombrePorUsuario: Record<string, string>;
  tipoPorId: Record<number, { nombre: string; icono: string }>;
  nombrePorCatalogo: Record<string, string>;
}) {
  const supabase = createClient();
  const [registros, setRegistros] = useState(registrosIniciales);
  const [ranking, setRanking] = useState(rankingInicial);
  const [hayMas, setHayMas] = useState(hayMasInicial);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargarMas() {
    setCargandoMas(true);
    setError(null);
    const { data, error } = await supabase
      .from("registros")
      .select("id, usuario_id, bebida_tipo_id, bebida_catalogo_id, ts")
      .eq("sala_id", salaId)
      .order("ts", { ascending: false })
      .range(registros.length, registros.length + PAGINA - 1);
    setCargandoMas(false);
    if (error) {
      setError(error.message);
      return;
    }
    const nuevos: RegistroSala[] = (data ?? []).map((r) => {
      const tipo = tipoPorId[r.bebida_tipo_id];
      return {
        id: r.id,
        usuarioId: r.usuario_id,
        nombre: nombrePorUsuario[r.usuario_id] ?? "???",
        bebidaNombre: r.bebida_catalogo_id
          ? nombrePorCatalogo[r.bebida_catalogo_id] ?? tipo?.nombre ?? "???"
          : tipo?.nombre ?? "???",
        icono: tipo?.icono ?? "🥤",
        ts: r.ts,
      };
    });
    setRegistros((prev) => [...prev, ...nuevos]);
    setHayMas(nuevos.length === PAGINA);
  }

  async function borrar(registro: RegistroSala) {
    setBorrandoId(registro.id);
    setError(null);
    const { error } = await supabase.rpc("borrar_registro_bebida_suelta", {
      p_registro_id: registro.id,
    });
    setBorrandoId(null);
    if (error) {
      setError(error.message);
      return;
    }
    setRegistros((prev) => prev.filter((r) => r.id !== registro.id));
    setRanking((prev) =>
      prev
        .map((m) =>
          m.usuarioId === registro.usuarioId
            ? { ...m, total: m.total - 1 }
            : m
        )
        .filter((m) => m.total > 0)
        .sort((a, b) => b.total - a.total)
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-rosa">{error}</p>}

      <section className="mb-6 rounded-3xl border border-borde bg-tarjeta p-5">
        <h2 className="mb-3 font-titulo text-lg text-texto">
          🏅 Quién lleva más
        </h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-texto2">
            Todavía no hay nada registrado.
          </p>
        ) : (
          <ul className="space-y-2">
            {ranking.map((m, i) => (
              <li
                key={m.usuarioId}
                className="flex items-center justify-between text-sm text-texto"
              >
                <span>
                  <span className="text-texto2">{i + 1}.</span> {m.nombre}
                  {m.usuarioId === userId && (
                    <span className="ml-1 text-xs text-texto2">(tú)</span>
                  )}
                </span>
                <span className="font-titulo text-ambar">{m.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-titulo text-lg text-texto">📋 Historial</h2>
        {registros.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Nada por aquí todavía.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {registros.map((r) => {
                const puedeBorrar = r.usuarioId === userId || esAdmin;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-texto">
                      <span className="text-lg">{r.icono}</span>
                      <div>
                        <p>{r.bebidaNombre}</p>
                        <p className="text-xs text-texto2">
                          {r.nombre}
                          {r.usuarioId === userId && " (tú)"} ·{" "}
                          {new Date(r.ts).toLocaleString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {puedeBorrar && (
                      <button
                        onClick={() => borrar(r)}
                        disabled={borrandoId === r.id}
                        className="px-2 text-sm text-rosa disabled:opacity-50"
                      >
                        {borrandoId === r.id ? "…" : "🗑️"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {hayMas && (
              <button
                onClick={cargarMas}
                disabled={cargandoMas}
                className="mt-3 w-full rounded-xl border border-borde py-2 text-sm text-texto2 disabled:opacity-50"
              >
                {cargandoMas ? "Cargando…" : "Ver más"}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
