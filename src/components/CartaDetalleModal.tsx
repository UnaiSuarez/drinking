"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { REVERSOS_CARTA, type CartaCofre, type CartaRareza } from "@/lib/cofresDesign";
import { sinMovimiento } from "@/lib/cofreFx";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

gsap.registerPlugin(useGSAP);

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
  const raiz = useRef<HTMLDivElement>(null);
  useModalScrollLock(true);

  // Entrada de la carta girando en 3D; después sigue al puntero con una
  // inclinación suave y un reflejo (solo con puntero fino, sin gasto en móvil).
  useGSAP(
    () => {
      const el = raiz.current;
      if (!el || sinMovimiento()) return;
      const q = gsap.utils.selector(el);
      const arte = q(".carta-detalle__art")[0] as HTMLElement;
      const brillo = q(".carta-detalle__glare")[0];
      gsap.set(q(".carta-detalle__texto > *"), { opacity: 0, y: 14 });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(q(".carta-detalle__panel"), { y: 40, scale: 0.94, opacity: 0, duration: 0.45 })
        .fromTo(arte, { rotationY: -100, scale: 0.6, opacity: 0, transformPerspective: 800 }, { rotationY: 0, scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.5)" }, 0.1)
        .fromTo(brillo, { xPercent: -140, opacity: 1 }, { xPercent: 140, duration: 0.8, ease: "power2.inOut", onComplete: () => { gsap.set(brillo, { opacity: 0 }); } }, 0.55)
        .to(q(".carta-detalle__texto > *"), { opacity: 1, y: 0, duration: 0.4, stagger: 0.07 }, 0.5);
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const rx = gsap.quickTo(arte, "rotationX", { duration: 0.4, ease: "power3.out" });
      const ry = gsap.quickTo(arte, "rotationY", { duration: 0.4, ease: "power3.out" });
      const mover = (event: PointerEvent) => {
        const r = arte.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5;
        const y = (event.clientY - r.top) / r.height - 0.5;
        ry(x * 22);
        rx(-y * 22);
        gsap.to(brillo, { opacity: 0.5, xPercent: x * 160, duration: 0.3, overwrite: true });
      };
      const salir = () => {
        rx(0);
        ry(0);
        gsap.to(brillo, { opacity: 0, duration: 0.3 });
      };
      arte.addEventListener("pointermove", mover);
      arte.addEventListener("pointerleave", salir);
      return () => {
        arte.removeEventListener("pointermove", mover);
        arte.removeEventListener("pointerleave", salir);
      };
    },
    { scope: raiz }
  );

  useEffect(() => {
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const imagen = bloqueada ? REVERSOS_CARTA.exclusiva : carta.imagen;
  const titulo = bloqueada ? "???" : carta.nombre;
  const descripcion = bloqueada
    ? "Carta exclusiva oculta. Se revelara al conseguirla en cofres."
    : carta.descripcion;

  return createPortal(
    <div
      ref={raiz}
      className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/90 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      onClick={onClose}
    >
      <div
        className="carta-detalle__panel w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-5 text-center shadow-2xl"
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
        <div className="carta-detalle__art relative mx-auto mb-4 aspect-square w-40 overflow-hidden rounded-2xl bg-fondo/70">
          {!bloqueada && carta.oculta && <span className="cofre-reward-aura" />}
          <Image
            src={imagen}
            alt={titulo}
            width={768}
            height={768}
            className="relative z-10 h-full w-full object-cover"
            sizes="160px"
          />
          <span className="carta-detalle__glare" aria-hidden="true" />
        </div>
        <div className="carta-detalle__texto">
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
      </div>
    </div>,
    document.body
  );
}
