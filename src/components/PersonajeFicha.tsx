"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import AvatarFrame from "@/components/AvatarFrame";
import { type MarcoPerfil } from "@/lib/marcos";
import { type PersonajeCatalogo, type TiendaRareza } from "@/lib/tienda";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

gsap.registerPlugin(useGSAP);

const RAREZA_FICHA: Record<TiendaRareza, { etiqueta: string; texto: string; borde: string; glow: string }> = {
  comun: { etiqueta: "Común", texto: "text-texto2", borde: "border-borde", glow: "rgba(245, 241, 232, 0.16)" },
  rara: { etiqueta: "Rara", texto: "text-cian", borde: "border-cian/60", glow: "rgba(45, 226, 230, 0.28)" },
  epica: { etiqueta: "Épica", texto: "text-rosa", borde: "border-rosa/70", glow: "rgba(255, 46, 147, 0.3)" },
  legendaria: { etiqueta: "Legendaria", texto: "text-oro", borde: "border-oro", glow: "rgba(255, 213, 74, 0.38)" },
  unica: { etiqueta: "Única", texto: "text-oro", borde: "border-oro", glow: "rgba(255, 213, 74, 0.4)" },
};

const FX_PERSONAJE = ["ronda", "jefe", "cronica", "letal", "guardian", "celestial", "deidad"];
const AURA_PERSONAJE = ["neon", "brillos", "rayos", "aura", "llamas"];

function FichaContenido({
  personaje,
  bloqueado,
  fragmentos,
  fragmentosNecesarios,
  onCerrar,
}: {
  personaje: PersonajeCatalogo;
  bloqueado: boolean;
  fragmentos?: number;
  fragmentosNecesarios?: number;
  onCerrar: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const rareza = RAREZA_FICHA[personaje.rareza];
  const animacion = personaje.config.avatarAnimacion;
  const imagen = bloqueado ? (personaje.placeholderImagen ?? personaje.imagen) : (personaje.ilustracion ?? personaje.imagen);
  const cuerpoCompleto = !bloqueado && Boolean(personaje.ilustracion);
  const skins = bloqueado ? [] : (personaje.skins ?? []);
  useModalScrollLock(true);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".ficha-fondo", { opacity: 0, duration: 0.25 })
          .from(".ficha-panel", { y: 44, scale: 0.94, opacity: 0, duration: 0.5 }, "<")
          .from(".ficha-halo", { scale: 0.3, opacity: 0, duration: 0.9 }, "-=0.3")
          .from(".ficha-retrato", { scale: 0.72, rotate: bloqueado ? 0 : -4, opacity: 0, duration: 0.75, ease: "back.out(1.5)" }, "<0.05")
          .from(".ficha-texto > *", { y: 16, opacity: 0, stagger: 0.07, duration: 0.4 }, "-=0.35");
        if (bloqueado) {
          tl.to(".ficha-retrato", { x: 5, duration: 0.05, repeat: 5, yoyo: true, ease: "none" }, "-=0.2");
        }
      });
      return () => mm.revert();
    },
    { scope: raiz }
  );

  const cerrar = useCallback(() => {
    if (!raiz.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCerrar();
      return;
    }
    gsap.to(raiz.current, { opacity: 0, duration: 0.18, ease: "power1.in", onComplete: onCerrar });
  }, [onCerrar]);

  useEffect(() => {
    cerrarRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        cerrar();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [cerrar]);

  return (
    <div
      ref={raiz}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-x-hidden overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
    >
      <div className="ficha-fondo absolute inset-0 bg-fondo/95" onClick={cerrar} />
      <div className={`ficha-panel relative my-auto w-full max-w-sm rounded-2xl border bg-tarjeta p-5 shadow-2xl ${rareza.borde}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className={`font-titulo text-xs uppercase ${bloqueado ? "text-texto2" : rareza.texto}`}>
            {rareza.etiqueta}{bloqueado ? " · Oculto" : ""}
          </span>
          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrar}
            className="rounded-lg border border-borde px-3 py-2 text-sm text-texto2 active:scale-95"
          >
            Cerrar
          </button>
        </div>

        <div className="relative mx-auto mb-5 flex w-full items-center justify-center">
          <span
            className="ficha-halo pointer-events-none absolute inset-[-8%] rounded-full"
            style={{ background: `radial-gradient(circle, ${rareza.glow}, transparent 68%)` }}
            aria-hidden="true"
          />
          {/* Sin recorte: el retrato se muestra entero (object-contain). Si
              algún día hay ilustración de cuerpo completo, ocupa un lienzo vertical. */}
          <div
            className={`ficha-retrato relative w-full overflow-hidden rounded-2xl border border-borde bg-fondo/70 ${
              cuerpoCompleto ? "aspect-[3/4] max-h-[58dvh]" : "aspect-square max-h-[50dvh]"
            } mx-auto`}
            style={cuerpoCompleto ? undefined : { maxWidth: "min(100%, 50dvh)" }}
          >
            <Image
              src={imagen}
              alt={bloqueado ? "Personaje oculto" : personaje.nombre}
              fill
              sizes="(max-width: 640px) 90vw, 384px"
              className="object-contain"
              priority
            />
            {!bloqueado && FX_PERSONAJE.includes(animacion) && (
              <span className={`avatar-character-fx avatar-character-fx-${animacion}`} aria-hidden="true" />
            )}
            {!bloqueado && AURA_PERSONAJE.includes(animacion) && (
              <span className={`avatar-aura avatar-aura-${animacion}`} aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="ficha-texto text-center">
          <h2 id={tituloId} className="font-titulo text-2xl text-texto">
            {bloqueado ? "???" : personaje.nombre}
          </h2>
          <p className="mt-1 text-sm text-texto2">
            {bloqueado ? "Sus fragmentos pueden aparecer en cualquier cofre." : personaje.descripcion}
          </p>
          {personaje.habilidad && (
            <p className="mt-3 rounded-xl border border-oro/40 bg-oro/10 px-3 py-2 text-left text-xs text-oro">
              {bloqueado ? "La identidad y la habilidad se revelan al completar sus fragmentos." : personaje.habilidad}
            </p>
          )}
          {bloqueado && fragmentosNecesarios !== undefined && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-fondo">
                <div
                  className="h-full rounded-full bg-oro"
                  style={{ width: `${Math.min(100, ((fragmentos ?? 0) / fragmentosNecesarios) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-texto2">
                {fragmentos ?? 0}/{fragmentosNecesarios} fragmentos
              </p>
            </div>
          )}
          {skins.length > 0 && (
            <ul className="mt-4 space-y-2 text-left">
              {skins.map((skin) => (
                <li key={skin.id} className="rounded-xl border border-borde bg-fondo/60 p-3">
                  <p className="font-titulo text-sm text-texto">{skin.nombre}</p>
                  <p className="text-[11px] text-cian">{skin.momento}</p>
                  <p className="mt-1 text-xs text-texto2">{skin.historia}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pantalla independiente del personaje: retrato entero, descripción y habilidad. */
export default function PersonajeFichaModal({
  personaje,
  abierto,
  onCerrar,
  bloqueado = false,
  fragmentos,
  fragmentosNecesarios,
}: {
  personaje: PersonajeCatalogo;
  abierto: boolean;
  onCerrar: () => void;
  bloqueado?: boolean;
  fragmentos?: number;
  fragmentosNecesarios?: number;
}) {
  if (!abierto || typeof document === "undefined") return null;
  return createPortal(
    <FichaContenido
      personaje={personaje}
      bloqueado={bloqueado}
      fragmentos={fragmentos}
      fragmentosNecesarios={fragmentosNecesarios}
      onCerrar={onCerrar}
    />,
    document.body
  );
}

/** Disparador: pulsar al personaje abre su ficha. El personaje queda estático. */
export function PersonajeFichaTrigger({
  personaje,
  bloqueado = false,
  fragmentos,
  fragmentosNecesarios,
  marco = "madera",
  portraitOnly = false,
  triggerClassName = "h-24 w-24",
  children,
}: {
  personaje: PersonajeCatalogo;
  bloqueado?: boolean;
  fragmentos?: number;
  fragmentosNecesarios?: number;
  marco?: MarcoPerfil;
  portraitOnly?: boolean;
  triggerClassName?: string;
  children?: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const imagen = bloqueado ? (personaje.placeholderImagen ?? personaje.imagen) : personaje.imagen;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={bloqueado ? "Ver ficha del personaje oculto" : `Ver ficha de ${personaje.nombre}`}
        className="inline-flex cursor-pointer rounded-2xl outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-cian"
      >
        {children ??
          (portraitOnly ? (
            <span className={`relative inline-flex overflow-hidden ${triggerClassName}`}>
              <Image src={imagen} alt="" fill sizes="128px" className="object-contain" />
            </span>
          ) : (
            <AvatarFrame
              config={{ ...personaje.config, avatarImagen: imagen }}
              marco={marco}
              className={triggerClassName}
              imageSizes="128px"
            />
          ))}
      </button>
      <PersonajeFichaModal
        personaje={personaje}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        bloqueado={bloqueado}
        fragmentos={fragmentos}
        fragmentosNecesarios={fragmentosNecesarios}
      />
    </>
  );
}
