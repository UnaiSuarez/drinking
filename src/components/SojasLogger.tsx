"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SitioPicker from "@/components/SitioPicker";

const OPCIONES = [
  { id: "agua", icono: "💧", nombre: "Agua" },
  { id: "refresco", icono: "🥤", nombre: "Refresco" },
  { id: "cerveza_0", icono: "🍺", nombre: "Cerveza 0,0" },
  { id: "coctel_0", icono: "🍹", nombre: "Cóctel 0,0" },
  { id: "zumo", icono: "🧃", nombre: "Zumo" },
] as const;

type Resultado = {
  registro: { id: string; bebida: string; ts: string };
  total: number;
  xp_ganada: number;
  logros_nuevos: string[];
};

type RegistroSoja = Resultado["registro"];
const PAGINA = 20;

export default function SojasLogger({
  salaId,
  nocheId,
  disabled = false,
}: {
  salaId: string;
  nocheId?: string;
  disabled?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [abierto, setAbierto] = useState(false);
  const [totalContexto, setTotalContexto] = useState<number | null>(null);
  const [registrosContexto, setRegistrosContexto] = useState<RegistroSoja[]>([]);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimoRegistroId, setUltimoRegistroId] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    async function cargarTotal() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const consultaContexto = supabase
        .from("sojas_registros")
        .select("id, bebida, ts", { count: "exact" })
        .eq("usuario_id", auth.user.id)
        .eq("sala_id", salaId);
      const contexto = await (nocheId
        ? consultaContexto.eq("noche_id", nocheId)
        : consultaContexto.is("noche_id", null))
        .order("ts", { ascending: false })
        .range(0, PAGINA - 1);
      if (!activo) return;
      if (contexto.error) {
        setError(contexto.error.message);
        return;
      }
      setTotalContexto(contexto.count ?? 0);
      setRegistrosContexto(contexto.data ?? []);
    }
    void cargarTotal();
    return () => { activo = false; };
  }, [supabase, salaId, nocheId]);

  async function cargarMas() {
    setCargandoMas(true);
    setError(null);
    const consulta = supabase
      .from("sojas_registros")
      .select("id, bebida, ts")
      .eq("sala_id", salaId);
    const { data, error: fallo } = await (nocheId
      ? consulta.eq("noche_id", nocheId)
      : consulta.is("noche_id", null))
      .order("ts", { ascending: false })
      .range(registrosContexto.length, registrosContexto.length + PAGINA - 1);
    setCargandoMas(false);
    if (fallo) {
      setError(fallo.message);
      return;
    }
    setRegistrosContexto((prev) => [...prev, ...(data ?? [])]);
  }

  async function borrar(registro: RegistroSoja) {
    setBorrandoId(registro.id);
    setError(null);
    const { error: fallo } = await supabase.rpc("borrar_soja_suelta", {
      p_registro_id: registro.id,
    });
    setBorrandoId(null);
    if (fallo) {
      setError(fallo.message);
      return;
    }
    setRegistrosContexto((prev) => prev.filter((r) => r.id !== registro.id));
    setTotalContexto((prev) => Math.max(0, (prev ?? 1) - 1));
  }

  async function registrar(bebida: (typeof OPCIONES)[number]) {
    if (guardando || disabled) return;
    setGuardando(true);
    setError(null);
    setMensaje(null);
    const { data, error: fallo } = await supabase.rpc("registrar_soja", {
      p_sala: salaId,
      p_bebida: bebida.id,
      p_noche: nocheId ?? null,
    });
    setGuardando(false);
    if (fallo) {
      setError(fallo.message);
      return;
    }
    const resultado = data as Resultado;
    setTotalContexto((prev) => (prev ?? 0) + 1);
    setRegistrosContexto((prev) => [resultado.registro, ...prev]);
    setMensaje(
      resultado.logros_nuevos.length > 0
        ? `¡Nueva medalla SOJAS! +${resultado.xp_ganada} XP`
        : `+${resultado.xp_ganada} XP · 0 PL`
    );
    if (!nocheId) {
      setUltimoRegistroId(resultado.registro.id);
      fetch("/api/notificar-bebida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registroId: resultado.registro.id, tipo: "soja" }),
      }).catch((err) => console.error("notificar-bebida:", err));
    }
  }

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        className="flex min-h-12 w-full items-center justify-between rounded-lg border border-cian/50 bg-cian/10 px-4 text-left font-titulo text-cian transition hover:border-cian"
      >
        <span>💧 SOJAS</span>
        <span className="text-xs text-texto2">{totalContexto === null ? "" : `${totalContexto} en esta sala`} {abierto ? "−" : "+"}</span>
      </button>
      {abierto && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-texto2">Sin alcohol · +2 XP · 0 PL</p>
          <div className="grid grid-cols-2 gap-2">
            {OPCIONES.map((bebida) => (
              <button
                key={bebida.id}
                type="button"
                onClick={() => void registrar(bebida)}
                disabled={disabled || guardando}
                className="flex min-h-16 items-center gap-2 rounded-lg border border-borde bg-tarjeta px-3 text-left text-sm text-texto transition hover:border-cian disabled:opacity-40"
              >
                <span className="text-2xl">{bebida.icono}</span>
                <span>{bebida.nombre}</span>
              </button>
            ))}
          </div>
          {mensaje && <p role="status" className="text-sm text-cian">{mensaje}</p>}
          {error && <p role="alert" className="text-sm text-rosa">{error}</p>}
          <div className="border-t border-borde pt-3">
            <h3 className="mb-2 font-titulo text-sm text-cian">
              {nocheId ? "Esta noche" : "En esta sala"} · {totalContexto ?? "…"} SOJAS
            </h3>
            {registrosContexto.length === 0 ? (
              <p className="text-xs text-texto2">Aún no has registrado ninguna aquí.</p>
            ) : (
              <ul className="space-y-1.5">
                {registrosContexto.map((registro) => {
                  const bebida = OPCIONES.find((opcion) => opcion.id === registro.bebida);
                  return (
                    <li key={registro.id} className="flex items-center justify-between gap-2 rounded-lg border border-borde bg-tarjeta px-3 py-2 text-xs text-texto">
                      <span>{bebida?.icono ?? "💧"} {bebida?.nombre ?? registro.bebida}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-texto2">
                          {new Date(registro.ts).toLocaleString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!nocheId && (
                          <button
                            type="button"
                            onClick={() => void borrar(registro)}
                            disabled={borrandoId === registro.id}
                            className="px-1 text-rosa disabled:opacity-50"
                            aria-label="Borrar este registro"
                          >
                            {borrandoId === registro.id ? "…" : "🗑️"}
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {registrosContexto.length < (totalContexto ?? 0) && (
              <button type="button" onClick={cargarMas} disabled={cargandoMas} className="mt-2 w-full rounded-lg border border-borde py-2 text-xs text-texto2 disabled:opacity-50">
                {cargandoMas ? "Cargando…" : "Ver más"}
              </button>
            )}
          </div>
          {!nocheId && ultimoRegistroId && (
            <SitioPicker
              key={ultimoRegistroId}
              registroId={ultimoRegistroId}
              tipo="soja"
            />
          )}
        </div>
      )}
    </section>
  );
}
