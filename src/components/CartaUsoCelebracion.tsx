"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { CartaCofre, CartaRareza } from "@/lib/cofresDesign";
import { centroEn, chispas, fogonazo, onda, sinMovimiento, temblor } from "@/lib/cofreFx";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

gsap.registerPlugin(useGSAP);

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
  const raiz = useRef<HTMLDivElement>(null);
  useModalScrollLock(true);
  useEffect(() => {
    const timer = window.setTimeout(onClose, sinMovimiento() ? 900 : 3000);
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
  const efecto = efectoVisual(carta);

  // La carta entra girando en 3D con un brillo que la barre; cada efecto
  // especial añade su propio remate (cuenta de ×10, meteorito, ruleta...).
  useGSAP(
    () => {
      const el = raiz.current;
      if (!el || sinMovimiento()) return;
      const q = gsap.utils.selector(el);
      const arte = q(".carta-uso__art")[0];
      const aro = q(".carta-uso__ring")[0];
      const estela = q(".carta-uso__streak")[0];
      const mult = q(".carta-uso__multiplier")[0];
      const brillo = q(".carta-uso__glare")[0];
      const escena = q(".carta-uso__scene")[0];
      const colores = [color, "#ffffff", "#fff6b8"];
      const golpe = (n: number, dist: number) => {
        const c = centroEn(arte, el);
        chispas(el, { x: c.x, y: c.y, colores, cantidad: n, distancia: dist, tam: 8, gravedad: 100 });
      };

      gsap.set(q(".carta-uso__label"), { opacity: 0, y: 16 });
      const tl = gsap.timeline();
      tl.from(q(".carta-uso__veil"), { opacity: 0, duration: 0.25 }, 0)
        .fromTo(q(".carta-uso__rays"), { opacity: 0, rotation: -40, scale: 0.4 }, { opacity: 0.45, rotation: 60, scale: 1.15, duration: 2.6, ease: "power1.out" }, 0)
        .fromTo(arte, { y: 130, rotationY: -110, rotationX: 24, scale: 0.45, opacity: 0, transformPerspective: 900 }, { y: 0, rotationY: 0, rotationX: 0, scale: 1, opacity: 1, duration: 0.95, ease: "back.out(1.4)" }, 0.05)
        .fromTo(brillo, { xPercent: -140, opacity: 1 }, { xPercent: 140, duration: 0.8, ease: "power2.inOut", onComplete: () => { gsap.set(brillo, { opacity: 0 }); } }, 0.7)
        .to(q(".carta-uso__label"), { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: "power2.out" }, 0.65)
        .call(() => {
          const c = centroEn(arte, el);
          if (!especial && carta.rareza === "comun") return;
          onda(el, { x: c.x, y: c.y, color, tam: 100, escala: carta.rareza === "legendaria" || especial ? 4.5 : 3 });
          golpe(carta.rareza === "legendaria" || especial ? 44 : 22, carta.rareza === "legendaria" ? 200 : 130);
          if (carta.rareza === "legendaria" || especial) {
            fogonazo(el, color, 0.5);
            temblor(escena, 8, 0.45);
          }
        }, undefined, 0.6);

      if (efecto === "multiplicador" && mult) {
        const n = { v: 1 };
        tl.fromTo(mult, { opacity: 0, scale: 3.4, rotation: -14 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }, 0.5)
          .to(n, { v: 10, duration: 0.7, ease: "power2.in", onUpdate: () => { mult.textContent = `×${Math.round(n.v)}`; } }, 0.5)
          .fromTo(mult, { textShadow: `0 0 20px ${color}` }, { textShadow: `0 0 60px ${color}`, duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.2)
          .call(() => temblor(escena, 10, 0.4), undefined, 1.15);
      }

      if (efecto === "meteorito" && estela) {
        tl.fromTo(estela, { xPercent: -60, yPercent: -260, opacity: 0, rotation: -35 }, { xPercent: 240, yPercent: 320, opacity: 1, duration: 0.55, ease: "power2.in" }, 0.3)
          .to(estela, { opacity: 0, duration: 0.15 }, ">-0.1")
          .call(() => {
            fogonazo(el, "#ff9d3a", 0.55);
            temblor(escena, 16, 0.6);
            const c = centroEn(arte, el);
            chispas(el, { x: c.x, y: c.y, colores: ["#ff9d3a", "#ffd54a", "#ff5b1a"], cantidad: 40, distancia: 180, tam: 9, gravedad: 120 });
            onda(el, { x: c.x, y: c.y, color: "#ff9d3a", tam: 90, escala: 4 });
          }, undefined, 0.8);
      }

      if (efecto === "ruleta" && aro) {
        tl.fromTo(aro, { opacity: 0, rotation: 0, scale: 0.7 }, { opacity: 0.85, scale: 1, duration: 0.4 }, 0.2)
          .to(aro, { rotation: 900, duration: 1.9, ease: "power4.out" }, 0.2)
          .call(() => { golpe(28, 150); onda(el, { ...centroEn(arte, el), color, tam: 110, escala: 3.6 }); }, undefined, 1.9);
      }

      if (efecto === "secreta") {
        if (aro) {
          tl.fromTo(aro, { opacity: 0, scale: 0.4, rotation: -120 }, { opacity: 0.85, scale: 1, rotation: 0, duration: 0.9, ease: "back.out(1.6)" }, 0.2);
          gsap.to(aro, { rotation: 360, duration: 12, ease: "none", repeat: -1 });
        }
        gsap.to(arte, { boxShadow: `0 0 40px ${color}, 0 0 100px ${color}`, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.9 });
      }
    },
    { scope: raiz }
  );

  return (
    <div
      ref={raiz}
      role="status"
      aria-live="polite"
      className="carta-uso fixed inset-0 z-[70] flex items-center justify-center p-5"
      data-effect={efecto}
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
          <span className="carta-uso__glare" aria-hidden="true" />
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
