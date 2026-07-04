"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { REVERSOS_CARTA, type CartaCofre, type CartaRareza } from "@/lib/cofresDesign";

const RAREZA_ETIQUETA: Record<CartaRareza, string> = {
  comun: "Comun",
  rara: "Rara",
  epica: "Epica",
  legendaria: "Legendaria",
};

export default function CartaDetalleModal({
  carta,
  cantidad,
  bloqueada,
  onClose,
}: {
  carta: CartaCofre;
  cantidad: number;
  bloqueada: boolean;
  onClose: () => void;
}) {
  const tituloId = useId();

  useEffect(() => {
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const imagen = bloqueada ? REVERSOS_CARTA.legendaria : carta.imagen;
  const titulo = bloqueada ? "???" : carta.nombre;
  const descripcion = bloqueada
    ? "Carta exclusiva oculta. Se revelara al conseguirla en cofres."
    : carta.descripcion;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/90 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-5 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-borde px-3 py-2 text-sm text-texto2 active:scale-95"
          >
            Cerrar
          </button>
        </div>
        <div className="relative mx-auto mb-4 aspect-square w-40 overflow-hidden rounded-2xl bg-fondo/70">
          {!bloqueada && carta.oculta && <span className="cofre-reward-aura" />}
          <Image
            src={imagen}
            alt={titulo}
            width={768}
            height={768}
            className="relative z-10 h-full w-full object-cover"
            sizes="160px"
          />
        </div>
        <h2 id={tituloId} className="font-titulo text-xl text-texto">
          {titulo}
        </h2>
        <p className="mt-1 font-titulo text-xs uppercase text-ambar">
          {bloqueada ? "Oculta" : RAREZA_ETIQUETA[carta.rareza]}
        </p>
        <p className="mt-3 text-sm leading-snug text-texto2">{descripcion}</p>
        {!bloqueada && (
          <p className="mt-3 rounded-xl bg-fondo/60 px-3 py-2 text-xs text-cian">
            {carta.efecto}
          </p>
        )}
        <p className="mt-3 font-titulo text-sm text-oro">
          {bloqueada ? "Aun no conseguida" : `Tienes: x${cantidad}`}
        </p>
      </div>
    </div>,
    document.body
  );
}
