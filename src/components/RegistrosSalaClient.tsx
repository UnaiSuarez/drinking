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

export type RegistroSoja = {
  id: string;
  bebida: string;
  ts: string;
};

export type MiembroRanking = {
  usuarioId: string;
  nombre: string;
  total: number;
};

export type DesgloseItem = {
  usuarioId: string;
  bebidaTipoNombre: string;
  bebidaTipoIcono: string;
  bebidaCatalogoNombre: string | null;
  rareza: string | null;
  cantidad: number;
};

const PAGINA = 20;

const RAREZA_ETIQUETA: Record<string, string> = {
  rara: " 🔷",
  epica: " 💗",
  legendaria: " 👑",
};

const SOJAS_BEBIDAS: Record<string, { nombre: string; icono: string }> = {
  agua: { nombre: "Agua", icono: "💧" },
  refresco: { nombre: "Refresco", icono: "🥤" },
  cerveza_0: { nombre: "Cerveza 0,0", icono: "🍺" },
  coctel_0: { nombre: "Cóctel 0,0", icono: "🍹" },
  zumo: { nombre: "Zumo", icono: "🧃" },
};

export default function RegistrosSalaClient({
  salaId,
  registrosIniciales,
  hayMasInicial,
  sojasIniciales,
  sojasTotal,
  ranking,
  desglose,
  miembros,
  userId,
  esAdmin,
  nombrePorUsuario,
  tipoPorId,
  nombrePorCatalogo,
}: {
  salaId: string;
  registrosIniciales: RegistroSala[];
  hayMasInicial: boolean;
  sojasIniciales: RegistroSoja[];
  sojasTotal: number;
  ranking: MiembroRanking[];
  desglose: DesgloseItem[];
  miembros: { usuarioId: string; nombre: string }[];
  userId: string;
  esAdmin: boolean;
  nombrePorUsuario: Record<string, string>;
  tipoPorId: Record<number, { nombre: string; icono: string }>;
  nombrePorCatalogo: Record<string, string>;
}) {
  const supabase = createClient();
  const [registros, setRegistros] = useState(registrosIniciales);
  const [rankingLocal, setRanking] = useState(ranking);
  const [hayMas, setHayMas] = useState(hayMasInicial);
  const [sojas, setSojas] = useState(sojasIniciales);
  const [sojasTotalLocal, setSojasTotalLocal] = useState(sojasTotal);
  const [cargandoSojas, setCargandoSojas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [borrandoSoja, setBorrandoSoja] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jugadorFiltro, setJugadorFiltro] = useState<string>("todos");

  const desglosePorJugador = new Map<string, DesgloseItem[]>();
  for (const item of desglose) {
    const lista = desglosePorJugador.get(item.usuarioId) ?? [];
    lista.push(item);
    desglosePorJugador.set(item.usuarioId, lista);
  }
  const jugadoresConDesglose = miembros.filter(
    (m) =>
      (jugadorFiltro === "todos" || jugadorFiltro === m.usuarioId) &&
      desglosePorJugador.has(m.usuarioId)
  );

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

  async function cargarMasSojas() {
    setCargandoSojas(true);
    setError(null);
    const { data, error } = await supabase
      .from("sojas_registros")
      .select("id, bebida, ts")
      .eq("sala_id", salaId)
      .eq("usuario_id", userId)
      .is("noche_id", null)
      .order("ts", { ascending: false })
      .range(sojas.length, sojas.length + PAGINA - 1);
    setCargandoSojas(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSojas((prev) => [...prev, ...(data ?? [])]);
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

  async function borrarSoja(registro: RegistroSoja) {
    setBorrandoSoja(registro.id);
    setError(null);
    const { error } = await supabase.rpc("borrar_soja_suelta", {
      p_registro_id: registro.id,
    });
    setBorrandoSoja(null);
    if (error) {
      setError(error.message);
      return;
    }
    setSojas((prev) => prev.filter((r) => r.id !== registro.id));
    setSojasTotalLocal((prev) => Math.max(0, prev - 1));
  }

  const sojasAgrupadas = new Map<string, RegistroSoja[]>();
  for (const registro of sojas) {
    const lista = sojasAgrupadas.get(registro.bebida) ?? [];
    lista.push(registro);
    sojasAgrupadas.set(registro.bebida, lista);
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-rosa">{error}</p>}

      <section className="mb-6 rounded-3xl border border-borde bg-tarjeta p-5">
        <h2 className="mb-3 font-titulo text-lg text-texto">
          🏅 Quién lleva más
        </h2>
        {rankingLocal.length === 0 ? (
          <p className="text-sm text-texto2">
            Todavía no hay nada registrado.
          </p>
        ) : (
          <ul className="space-y-2">
            {rankingLocal.map((m, i) => (
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

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-titulo text-lg text-texto">
            🥤 Desglose por jugador
          </h2>
          <select
            value={jugadorFiltro}
            onChange={(e) => setJugadorFiltro(e.target.value)}
            className="rounded-lg border border-borde bg-tarjeta px-2 py-1 text-xs text-texto"
          >
            <option value="todos">Todos</option>
            {miembros.map((m) => (
              <option key={m.usuarioId} value={m.usuarioId}>
                {m.nombre}
                {m.usuarioId === userId ? " (tú)" : ""}
              </option>
            ))}
          </select>
        </div>
        {jugadoresConDesglose.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Nada que desglosar todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {jugadoresConDesglose.map((m) => (
              <details
                key={m.usuarioId}
                className="group rounded-2xl border border-borde bg-tarjeta p-4"
                open={jugadorFiltro === m.usuarioId}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-titulo text-sm text-texto">
                  <span>
                    {m.nombre}
                    {m.usuarioId === userId && (
                      <span className="ml-1 text-xs text-texto2">(tú)</span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-texto2 group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(desglosePorJugador.get(m.usuarioId) ?? []).map((item, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-borde bg-fondo px-2 py-1 text-[11px] text-texto"
                      title={
                        item.bebidaCatalogoNombre
                          ? "Bebida concreta"
                          : `${item.bebidaTipoNombre} sin especificar (registro rápido)`
                      }
                    >
                      {item.bebidaTipoIcono}{" "}
                      {item.bebidaCatalogoNombre ?? item.bebidaTipoNombre}
                      {item.rareza && RAREZA_ETIQUETA[item.rareza]}
                      {!item.bebidaCatalogoNombre && (
                        <span className="text-texto2"> (genérica)</span>
                      )}{" "}
                      ×{item.cantidad}
                    </span>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-titulo text-lg text-cian">💧 Tus SOJAS ({sojasTotalLocal})</h2>
          <span className="shrink-0 text-xs text-texto2">0 PL</span>
        </div>
        {sojas.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Aún no has registrado bebidas sin alcohol fuera de una noche en esta sala.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {[...sojasAgrupadas.entries()].map(([bebidaId, registros]) => {
                const bebida = SOJAS_BEBIDAS[bebidaId] ?? {
                  nombre: bebidaId,
                  icono: "💧",
                };
                const masReciente = registros[0];
                return (
                  <span
                    key={bebidaId}
                    className="flex items-center gap-1 rounded-full border border-cian/30 bg-tarjeta px-2 py-1 text-[11px] text-texto"
                  >
                    {bebida.icono} {bebida.nombre} ×{registros.length}
                    <button
                      onClick={() => void borrarSoja(masReciente)}
                      disabled={borrandoSoja === masReciente.id}
                      className="ml-0.5 text-rosa disabled:opacity-50"
                      aria-label={`Borrar un registro de ${bebida.nombre}`}
                    >
                      {borrandoSoja === masReciente.id ? "…" : "✕"}
                    </button>
                  </span>
                );
              })}
            </div>
            {sojas.length < sojasTotalLocal && (
              <button
                onClick={cargarMasSojas}
                disabled={cargandoSojas}
                className="mt-3 w-full rounded-xl border border-borde py-2 text-sm text-texto2 disabled:opacity-50"
              >
                {cargandoSojas ? "Cargando…" : "Ver más SOJAS"}
              </button>
            )}
          </>
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
