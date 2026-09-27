"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

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

  const categorias = useMemo(
    () => [...new Set(items.filter((i) => i.cantidad > 0).map((i) => i.categoriaNombre))].sort(),
    [items]
  );
  const conseguidas = items.filter((i) => i.cantidad > 0).length;

  const filtradas = items.filter(
    (i) =>
      (categoria === "todas" || i.categoriaNombre === categoria) &&
      (rareza === "todas" || i.rareza === rareza) &&
      i.cantidad > 0
  );

  return (
    <section className="mb-8">
      <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="min-w-0 font-titulo text-xl text-texto">
          🍹 Bebidas concretas ({conseguidas}/{items.length})
        </h2>
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-texto2 group-open:rotate-180" />
      </summary>

      {conseguidas > 0 && <div className="mb-3 flex flex-wrap gap-2">
        <select
          aria-label="Categoría de bebida"
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
          aria-label="Rareza de bebida"
          value={rareza}
          onChange={(e) => setRareza(e.target.value)}
          className="rounded-xl border border-borde bg-tarjeta px-2 py-1.5 text-xs text-texto"
        >
          <option value="todas">Toda rareza</option>
          {(["comun", "rara", "epica", "legendaria"] as const).map((r) => (
            <option key={r} value={r}>{RAREZA_NOMBRE[r]}</option>
          ))}
        </select>
      </div>}

      {filtradas.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          {conseguidas === 0 ? "Todavía no hay bebidas concretas desbloqueadas." : "Nada con estos filtros."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {filtradas.map((item) => {
            return (
              <li
                key={item.id}
                className={`flex items-center gap-2 rounded-xl border bg-tarjeta p-2.5 ${
                  RAREZA_ESTILO[item.rareza] ?? "border-borde"
                }`}
              >
                <span className="text-xl">{item.categoriaIcono}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-titulo text-xs text-texto">
                    {item.nombre}
                  </p>
                  <p className="text-[10px] text-texto2">
                    {item.categoriaNombre} · {RAREZA_NOMBRE[item.rareza]}
                  </p>
                </div>
                  <span className="shrink-0 font-titulo text-xs text-ambar">x{item.cantidad}</span>
              </li>
            );
          })}
        </ul>
      )}
      </details>
    </section>
  );
}
