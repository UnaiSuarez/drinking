"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const OPCIONES = [
  { id: "agua", icono: "💧", nombre: "Agua" },
  { id: "refresco", icono: "🥤", nombre: "Refresco" },
  { id: "cerveza_0", icono: "🍺", nombre: "Cerveza 0,0" },
  { id: "coctel_0", icono: "🍹", nombre: "Cóctel 0,0" },
  { id: "zumo", icono: "🧃", nombre: "Zumo" },
] as const;

type Resultado = {
  total: number;
  xp_ganada: number;
  logros_nuevos: string[];
};

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
  const [total, setTotal] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    async function cargarTotal() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { count } = await supabase
        .from("sojas_registros")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", auth.user.id);
      if (activo) setTotal(count ?? 0);
    }
    void cargarTotal();
    return () => { activo = false; };
  }, [supabase]);

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
    setTotal(resultado.total);
    setMensaje(
      resultado.logros_nuevos.length > 0
        ? `¡Nueva medalla SOJAS! +${resultado.xp_ganada} XP`
        : `+${resultado.xp_ganada} XP · 0 PL`
    );
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
        <span className="text-xs text-texto2">{total === null ? "" : `${total} registradas`} {abierto ? "−" : "+"}</span>
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
        </div>
      )}
    </section>
  );
}
