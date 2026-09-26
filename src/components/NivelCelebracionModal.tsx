"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import confetti from "canvas-confetti";
import gsap from "gsap";
import { COFRES_TIPOS } from "@/lib/cofresDesign";
import { centroEn, chispas, fogonazo, onda, sinMovimiento, vortice } from "@/lib/cofreFx";
import { cofrePorNivel } from "@/lib/niveles";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

const COLORES = {
  comun: ["#2de2e6", "#9efaff"],
  epico: ["#ff2e93", "#b87aff"],
  legendario: ["#ffd54a", "#ff9d2e"],
};

export default function Celebracion({
  nivel,
  restantes,
  onContinuar,
  onOmitir,
}: {
  nivel: number;
  restantes: number;
  onContinuar: () => void;
  onOmitir: () => void;
}) {
  const tipo = cofrePorNivel(nivel);
  const cofre = COFRES_TIPOS.find((item) => item.id === tipo)!;
  const raiz = useRef<HTMLDivElement>(null);
  const cofreRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  useModalScrollLock(true);

  useEffect(() => {
    cerrarRef.current?.focus();
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onOmitir();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onOmitir]);

  useEffect(() => {
    const host = raiz.current;
    const pieza = cofreRef.current;
    if (!host || !pieza || sinMovimiento()) return;
    const titulo = host.querySelector(".nivel-celebracion-titulo");
    const premio = host.querySelector(".nivel-celebracion-premio");
    const tl = gsap.timeline();
    tl.fromTo(titulo, { opacity: 0, y: 30, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, ease: "back.out(1.8)" })
      .fromTo(pieza, { opacity: 0, y: -150, rotation: -12, scale: 0.45 }, { opacity: 1, y: 0, rotation: 0, scale: 1, duration: 0.85, ease: "bounce.out" }, 0.2)
      .call(() => {
        const centro = centroEn(pieza, host);
        if (tipo !== "comun") vortice(host, { ...centro, colores: COLORES[tipo], cantidad: tipo === "legendario" ? 55 : 32, radio: 150, duracion: 0.6 });
        onda(host, { ...centro, color: COLORES[tipo][0], tam: 70, escala: 3 });
        chispas(host, { ...centro, colores: COLORES[tipo], cantidad: tipo === "legendario" ? 48 : 28, distancia: 170 });
        fogonazo(host, COLORES[tipo][0], 0.3);
        void confetti({ particleCount: tipo === "legendario" ? 100 : 55, spread: 75, origin: { y: 0.46 }, colors: COLORES[tipo], zIndex: 120, disableForReducedMotion: true });
      }, undefined, 1.25)
      .fromTo(premio, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4 }, 1.35);
    return () => { tl.kill(); };
  }, [tipo]);

  return (
    <div ref={raiz} role="dialog" aria-modal="true" aria-label={`Nivel ${nivel} alcanzado`} className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-fondo/95 px-5 py-10 backdrop-blur-md">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <p className="nivel-celebracion-titulo font-titulo text-lg uppercase text-cian">Nuevo nivel</p>
        <h2 className="nivel-celebracion-titulo mt-1 font-titulo text-7xl text-texto">{nivel}</h2>
        <div ref={cofreRef} className="relative my-8 h-48 w-48 sm:h-56 sm:w-56">
          <Image src={cofre.imagen} alt={cofre.nombre} fill sizes="224px" className="object-contain drop-shadow-[0_0_35px_rgba(255,213,74,0.35)]" priority />
        </div>
        <div className="nivel-celebracion-premio">
          <p className="font-titulo text-2xl text-ambar">{cofre.nombre}</p>
          <p className="mt-1 text-sm text-texto2">Añadido a tu inventario</p>
        </div>
        <div className="mt-8 flex w-full gap-2">
          <button ref={cerrarRef} type="button" onClick={onContinuar} className="min-h-12 flex-1 rounded-lg border border-borde px-4 font-titulo text-texto">
            {restantes ? `Siguiente (${restantes})` : "Continuar"}
          </button>
          <Link href="/inventario" onClick={onOmitir} className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-ambar px-4 font-titulo text-fondo">
            Ver cofre
          </Link>
        </div>
        {restantes > 0 && <button type="button" onClick={onOmitir} className="mt-3 text-xs text-texto2">Omitir todo</button>}
      </div>
    </div>
  );
}
