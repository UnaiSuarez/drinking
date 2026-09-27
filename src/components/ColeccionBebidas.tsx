"use client";

import { useMemo, useState } from "react";

export type BebidaCatalogoItem = {
  id: string;
  nombre: string;
  rareza: string;
  categoriaNombre: string;
  categoriaIcono: string;
  cantidad: number;
};

const RAREZA_ESTILO: Record<string, string> = {
  comun: "border-borde text-texto2",
  rara: "border-cian/60 text-cian",
  epica: "border-rosa/60 text-rosa",
  legendaria: "border-oro text-oro",
};

const RAREZA_NOMBRE: Record<string, string> = {
  comun: "Común",
  rara: "Rara",
  epica: "Épica",
  legendaria: "Legendaria",
};

/** Catálogo de bebidas concretas (globales; las personalizadas de cada sala no
 * se incluyen aquí): cuáles ya se han probado, cuántas veces, con filtros por
 * categoría y rareza. Solo cuenta lo registrado como "bebida concreta" (con
 * bebida_catalogo_id) en una noche o en una sala permanente. */
export default function ColeccionBebidas({ items }: { items: BebidaCatalogoItem[] }) {
  const [categoria, setCategoria] = useState("todas");
  const [rareza, setRareza] = useState("todas");
  const [soloConseguidas, setSoloConseguidas] = useState(false);

  const categorias = useMemo(
    () => [...new Set(items.map((i) => i.categoriaNombre))].sort(),
    [items]
  );
  const conseguidas = items.filter((i) => i.cantidad > 0).length;

  const filtradas = items.filter(
    (i) =>
      (categoria === "todas" || i.categoriaNombre === categoria) &&
      (rareza === "todas" || i.rareza === rareza) &&
      (!soloConseguidas || i.cantidad > 0)
  );

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-titulo text-xl text-texto">
          🍹 Bebidas concretas ({conseguidas}/{items.length})
        </h2>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-xl border border-borde bg-tarjeta px-2 py-1.5 text-xs text-texto"
        >
          <option value="todas">Toda categoría</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={rareza}
          onChange={(e) => setRareza(e.target.value)}
          className="rounded-xl border border-borde bg-tarjeta px-2 py-1.5 text-xs text-texto"
        >
          <option value="todas">Toda rareza</option>
          {(["comun", "rara", "epica", "legendaria"] as const).map((r) => (
            <option key={r} value={r}>{RAREZA_NOMBRE[r]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSoloConseguidas((v) => !v)}
          className={`rounded-xl border px-3 py-1.5 text-xs active:scale-95 ${
            soloConseguidas ? "border-cian bg-cian/10 text-cian" : "border-borde text-texto2"
          }`}
        >
          {soloConseguidas ? "✓ Solo probadas" : "Solo probadas"}
        </button>
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          Nada con estos filtros.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {filtradas.map((item) => {
            const probada = item.cantidad > 0;
            return (
              <li
                key={item.id}
                className={`flex items-center gap-2 rounded-xl border bg-tarjeta p-2.5 ${
                  probada ? RAREZA_ESTILO[item.rareza] ?? "border-borde" : "border-borde opacity-50"
                }`}
              >
                <span className="text-xl">{probada ? item.categoriaIcono : "❔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-titulo text-xs ${probada ? "text-texto" : "text-texto2"}`}>
                    {probada ? item.nombre : "???"}
                  </p>
                  <p className="text-[10px] text-texto2">
                    {item.categoriaNombre} · {RAREZA_NOMBRE[item.rareza]}
                  </p>
                </div>
                {probada && (
                  <span className="shrink-0 font-titulo text-xs text-ambar">x{item.cantidad}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
