"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BebidaTipo = {
  id: number;
  nombre: string;
  icono: string;
};

const XP_POR_BEBIDA_SUELTA = 5;

export default function BebidaSueltaLogger({
  salaId,
  bebidas,
}: {
  salaId: string;
  bebidas: BebidaTipo[];
}) {
  const supabase = createClient();
  const [ultimo, setUltimo] = useState<{ id: string; ts: number } | null>(
    null
  );
  const [ahora, setAhora] = useState(() => Date.now());
  const [cargandoId, setCargandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masUnos, setMasUnos] = useState<{ id: number; icono: string }[]>([]);
  const contador = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function registrar(bebida: BebidaTipo) {
    setCargandoId(bebida.id);
    setError(null);
    const { data, error } = await supabase.rpc("registrar_bebida_suelta", {
      p_sala: salaId,
      p_bebida_tipo_id: bebida.id,
    });
    setCargandoId(null);
    if (error || !data) {
      setError("No se pudo registrar. Inténtalo otra vez.");
      return;
    }
    setUltimo({ id: data.id, ts: new Date(data.ts).getTime() });
    if (navigator.vibrate) navigator.vibrate(40);
    const idAnim = contador.current++;
    setMasUnos((prev) => [...prev, { id: idAnim, icono: bebida.icono }]);
    setTimeout(
      () => setMasUnos((prev) => prev.filter((m) => m.id !== idAnim)),
      900
    );
  }

  async function deshacer() {
    if (!ultimo) return;
    const { error } = await supabase.rpc("anular_bebida_suelta", {
      p_registro_id: ultimo.id,
    });
    if (!error) setUltimo(null);
  }

  const puedoDeshacer = ultimo && ahora - ultimo.ts < 30000;

  return (
    <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
      <div className="relative">
        {masUnos.map((m) => (
          <span
            key={m.id}
            className="mas-uno pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-2xl"
          >
            {m.icono} +{XP_POR_BEBIDA_SUELTA} XP
          </span>
        ))}
        <h2 className="mb-1 font-titulo text-xl text-texto">
          🥤 Registrar una bebida
        </h2>
        <p className="mb-4 text-xs text-texto2">
          Se puede añadir en cualquier momento. Suma {XP_POR_BEBIDA_SUELTA} XP
          a tu nivel general, pero no cuenta para la liga: para eso hace
          falta iniciar una noche.
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-rosa">{error}</p>}

      <div className="grid grid-cols-4 gap-2">
        {bebidas.map((b) => (
          <button
            key={b.id}
            onClick={() => registrar(b)}
            disabled={cargandoId !== null}
            className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-borde bg-fondo py-3 transition active:scale-90 active:border-ambar disabled:opacity-40"
          >
            <span className="text-3xl">{b.icono}</span>
            <span className="mt-1 text-center text-[11px] leading-tight text-texto">
              {b.nombre}
            </span>
          </button>
        ))}
      </div>

      {puedoDeshacer && (
        <button
          onClick={deshacer}
          className="mt-4 w-full rounded-xl border border-rosa py-2 text-sm text-rosa active:scale-95"
        >
          ↩️ Deshacer última
        </button>
      )}
    </section>
  );
}
