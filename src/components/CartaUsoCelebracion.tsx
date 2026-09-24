"use client";

import { useEffect, type CSSProperties } from "react";
import Image from "next/image";
import type { CartaCofre, CartaRareza } from "@/lib/cofresDesign";

const RAREZA_COLOR: Record<CartaRareza, string> = {
  comun: "#aeb4c8",
  rara: "#2de2e6",
  epica: "#ff2e93",
  legendaria: "#ffd54a",
};

const RAREZA_NOMBRE: Record<CartaRareza, string> = {
  comun: "Comun",
  rara: "Rara",
  epica: "Epica",
  legendaria: "Legendaria",
};

function efectoVisual(carta: CartaCofre) {
  if (carta.id === "noche-x10") return "multiplicador";
  if (carta.id === "meteorito-de-caos") return "meteorito";
  if (carta.id === "ruleta-del-bar") return "ruleta";
  if (carta.oculta) return "secreta";
  return "normal";
}

export default function CartaUsoCelebracion({
  carta,
  detalle,
  onClose,
}: {
  carta: CartaCofre;
  detalle?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onClose, sinMovimiento ? 900 : 2300);
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [onClose]);

  const especial = Boolean(carta.oculta);
  const color = especial ? "#ad6cff" : RAREZA_COLOR[carta.rareza];

  return (
    <div
      role="status"
      aria-live="polite"
      className="carta-uso fixed inset-0 z-[70] flex items-center justify-center p-5"
      data-effect={efectoVisual(carta)}
      style={{ "--carta-color": color } as CSSProperties}
    >
      <div className="carta-uso__veil" aria-hidden="true" />
      <div className="carta-uso__scene relative w-full max-w-xs text-center">
        <span className="carta-uso__rays" aria-hidden="true" />
        <span className="carta-uso__ring" aria-hidden="true" />
        <span className="carta-uso__streak" aria-hidden="true" />
        {carta.id === "noche-x10" && (
          <span className="carta-uso__multiplier" aria-hidden="true">×10</span>
        )}
        <div className="carta-uso__art relative mx-auto aspect-square w-52 max-w-[62vw] overflow-hidden rounded-lg border-2 bg-fondo">
          <Image
            src={carta.imagen}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 62vw, 208px"
          />
        </div>
        <p className="carta-uso__label mt-5 font-titulo text-xs uppercase text-texto2">
          Carta {especial ? "exclusiva" : RAREZA_NOMBRE[carta.rareza]}
        </p>
        <p className="carta-uso__label mt-1 font-titulo text-2xl text-texto">
          {carta.nombre}
        </p>
        {detalle && <p className="carta-uso__label mt-1 text-sm text-texto2">{detalle}</p>}
        <button
          type="button"
          onClick={onClose}
          className="carta-uso__label mt-5 rounded-lg border border-borde px-4 py-2 text-sm text-texto2"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
