"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campo = {
  clave: string;
  etiqueta: string;
  predeterminado: number;
};

const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: "🍺 Volumen (PL por bebida, decreciente)",
    campos: [
      { clave: "vol1_5", etiqueta: "Bebidas 1ª a 5ª", predeterminado: 5 },
      { clave: "vol6", etiqueta: "6ª bebida", predeterminado: 4 },
      { clave: "vol7", etiqueta: "7ª bebida", predeterminado: 3 },
      { clave: "vol8", etiqueta: "8ª bebida", predeterminado: 2 },
      { clave: "vol9", etiqueta: "9ª en adelante", predeterminado: 1 },
    ],
  },
  {
    titulo: "🏆 Posición en el podio",
    campos: [
      { clave: "pos1", etiqueta: "1º puesto", predeterminado: 15 },
      { clave: "pos2", etiqueta: "2º puesto", predeterminado: 10 },
      { clave: "pos3", etiqueta: "3º puesto", predeterminado: 6 },
      { clave: "resto", etiqueta: "Resto que participa", predeterminado: 3 },
      {
        clave: "presencia",
        etiqueta: "Presencia (0 bebidas)",
        predeterminado: 2,
      },
    ],
  },
  {
    titulo: "🗳️ Votación",
    campos: [{ clave: "voto", etiqueta: "Por voto recibido", predeterminado: 5 }],
  },
];

export default function BalanceEditor({
  salaId,
  balanceActual,
}: {
  salaId: string;
  balanceActual: Record<string, number> | null;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const g of GRUPOS)
      for (const c of g.campos)
        v[c.clave] = balanceActual?.[c.clave]?.toString() ?? "";
    return v;
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  const personalizado =
    balanceActual !== null && Object.keys(balanceActual).length > 0;

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    // Solo guardamos las claves que difieren del predeterminado
    const balance: Record<string, number> = {};
    for (const g of GRUPOS) {
      for (const c of g.campos) {
        const crudo = valores[c.clave].trim();
        if (crudo === "") continue;
        const n = parseInt(crudo, 10);
        if (Number.isNaN(n) || n < 0 || n > 99) {
          setMensaje(`Valor no válido en "${c.etiqueta}" (0-99).`);
          setGuardando(false);
          return;
        }
        if (n !== c.predeterminado) balance[c.clave] = n;
      }
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("salas")
      .update({ balance: Object.keys(balance).length > 0 ? balance : null })
      .eq("id", salaId);
    setGuardando(false);
    if (error) {
      setMensaje("No se pudo guardar. ¿Eres admin de la sala?");
    } else {
      setMensaje("✅ Balance guardado.");
      router.refresh();
    }
  }

  async function restaurar() {
    setGuardando(true);
    setMensaje(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("salas")
      .update({ balance: null })
      .eq("id", salaId);
    setGuardando(false);
    setConfirmandoReset(false);
    if (error) {
      setMensaje("No se pudo restaurar.");
    } else {
      const v: Record<string, string> = {};
      for (const g of GRUPOS) for (const c of g.campos) v[c.clave] = "";
      setValores(v);
      setMensaje("🔄 Balance restaurado a los valores predeterminados.");
      router.refresh();
    }
  }

  return (
    <div>
      {personalizado && (
        <p className="mb-4 rounded-2xl border border-ambar/50 bg-tarjeta px-4 py-3 text-center text-xs text-ambar">
          ⚠️ Esta sala usa un balance personalizado
        </p>
      )}

      {GRUPOS.map((g) => (
        <section
          key={g.titulo}
          className="mb-5 rounded-3xl border border-borde bg-tarjeta p-5"
        >
          <h2 className="mb-4 font-titulo text-sm text-texto">{g.titulo}</h2>
          <div className="space-y-3">
            {g.campos.map((c) => (
              <label
                key={c.clave}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-texto2">
                  {c.etiqueta}
                  <span className="ml-2 text-xs text-texto2/60">
                    (predet.: {c.predeterminado})
                  </span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  inputMode="numeric"
                  placeholder={c.predeterminado.toString()}
                  value={valores[c.clave]}
                  onChange={(e) =>
                    setValores((prev) => ({
                      ...prev,
                      [c.clave]: e.target.value,
                    }))
                  }
                  className="w-20 rounded-xl border border-borde bg-fondo px-3 py-2 text-center font-titulo text-lg text-ambar outline-none focus:border-ambar"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      {mensaje && (
        <p className="mb-4 rounded-2xl bg-tarjeta px-4 py-3 text-center text-sm text-texto">
          {mensaje}
        </p>
      )}

      <button
        onClick={guardar}
        disabled={guardando}
        className="mb-3 w-full rounded-2xl bg-ambar py-4 font-titulo text-lg text-fondo active:scale-95 disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Guardar balance"}
      </button>

      {confirmandoReset ? (
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmandoReset(false)}
            className="flex-1 rounded-2xl border border-borde bg-tarjeta py-3 text-texto2 active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={restaurar}
            disabled={guardando}
            className="flex-1 rounded-2xl bg-rosa py-3 font-titulo text-fondo active:scale-95 disabled:opacity-50"
          >
            Sí, restaurar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmandoReset(true)}
          className="w-full rounded-2xl border-2 border-rosa bg-tarjeta py-3 font-titulo text-rosa active:scale-95"
        >
          🔄 Restaurar valores predeterminados
        </button>
      )}
    </div>
  );
}
