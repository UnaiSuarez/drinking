"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { REVERSOS_CARTA, type CartaRareza, type CofreTipo } from "@/lib/cofresDesign";
import type { RecompensaCofre } from "@/lib/inventario";

type FaseCarta = "oculta" | "girando" | "revelada";
type EtapaApertura = "sellado" | "abierto" | "saliendo" | "lista";

const RAREZA_COLOR: Record<CartaRareza | "unica", string[]> = {
  comun: ["#8a8fa8"],
  rara: ["#2de2e6", "#67f5f8"],
  epica: ["#ff2e93", "#a78bfa"],
  legendaria: ["#ffd54a", "#ffb627", "#f5f1e8"],
  unica: ["#a78bfa", "#ff2e93"],
};

const COFRE_COLOR: Record<CofreTipo["id"], string> = {
  comun: "#2de2e6",
  epico: "#ff2e93",
  legendario: "#ffd54a",
};

const RAREZA_BORDE: Record<CartaRareza | "unica", string> = {
  comun: "border-borde",
  rara: "border-cian/60",
  epica: "border-rosa/70",
  legendaria: "border-oro",
  unica: "border-purple-300",
};

function reversoPorRareza(rareza: CartaRareza | "unica") {
  if (rareza === "legendaria" || rareza === "unica") return REVERSOS_CARTA.legendaria;
  if (rareza === "epica") return REVERSOS_CARTA.epica;
  return REVERSOS_CARTA.comun;
}

function etiquetaRecompensa(recompensa: RecompensaCofre) {
  if (recompensa.tipo === "monedas") return `${recompensa.cantidad} chapas`;
  if (recompensa.tipo === "fragmentoPersonaje") return "Fragmento unico";
  return recompensa.oculta ? "Carta oculta" : "Carta";
}

export default function CofreAperturaModal({
  cofre,
  recompensas,
  onClose,
}: {
  cofre: CofreTipo;
  recompensas: RecompensaCofre[];
  onClose: () => void;
}) {
  const [etapa, setEtapa] = useState<EtapaApertura>("sellado");
  const [fases, setFases] = useState<FaseCarta[]>(() => recompensas.map(() => "oculta"));
  const timersRevelado = useRef<number[]>([]);

  useEffect(() => {
    if (etapa === "lista") return;
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const siguiente: Record<Exclude<EtapaApertura, "lista">, [EtapaApertura, number]> = {
      sellado: ["abierto", 480],
      abierto: ["saliendo", 650],
      saliendo: ["lista", 1050],
    };
    const [nuevaEtapa, pausa] = sinMovimiento ? ["lista", 0] as const : siguiente[etapa];
    const timer = window.setTimeout(() => setEtapa(nuevaEtapa), pausa);
    return () => window.clearTimeout(timer);
  }, [etapa]);

  useEffect(() => {
    const timers = timersRevelado.current;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("keydown", cerrarConEscape);
      timers.forEach(clearTimeout);
    };
  }, [onClose]);

  function revelarCarta(index: number) {
    const recompensa = recompensas[index];
    if (etapa !== "lista" || !recompensa || fases[index] !== "oculta") return;
    const secreta =
      recompensa.tipo === "fragmentoPersonaje" ||
      (recompensa.tipo === "carta" && recompensa.oculta);
    const rareza = secreta ? "unica" : recompensa.rareza;
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFases((actual) => actual.map((fase, i) => i === index ? (sinMovimiento ? "revelada" : "girando") : fase));
    if (sinMovimiento) return;
    if (navigator.vibrate) navigator.vibrate(15);

    const timer = window.setTimeout(() => {
      setFases((actual) => actual.map((fase, i) => i === index ? "revelada" : fase));
      if (navigator.vibrate) {
        navigator.vibrate(
          rareza === "legendaria" || rareza === "unica"
            ? [40, 30, 60]
            : rareza === "epica" ? [30, 20, 40] : 30
        );
      }
      if (rareza !== "comun") {
        confetti({
          particleCount: rareza === "legendaria" || rareza === "unica" ? 60 : rareza === "epica" ? 40 : 22,
          spread: 65,
          startVelocity: 32,
          gravity: 1.1,
          scalar: 0.8,
          origin: { x: 0.5, y: 0.55 },
          colors: RAREZA_COLOR[rareza],
        });
      }
    }, 720);
    timersRevelado.current.push(timer);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/92 p-3 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-apertura"
        className="cofre-apertura-modal max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-xl border border-borde bg-tarjeta p-4 text-center shadow-2xl sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-left">
            <h2 id="titulo-apertura" className="font-titulo text-2xl text-ambar">
              {cofre.nombre}
            </h2>
            <p className="text-xs text-texto2" aria-live="polite">
              {etapa === "lista"
                ? `${fases.filter((fase) => fase === "revelada").length}/${recompensas.length} recompensas reveladas`
                : "Abriendo..."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar apertura"
            title="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-borde text-2xl leading-none text-texto2 active:scale-95"
          >
            ×
          </button>
        </div>

        <div
          className="cofre-opening mb-5"
          data-stage={etapa}
          data-tier={cofre.id}
          style={{ "--cofre-color": COFRE_COLOR[cofre.id] } as CSSProperties}
        >
          <span className="cofre-opening__light" aria-hidden="true" />
          <span className="cofre-opening__burst" aria-hidden="true" />
          <div className="cofre-opening__chest">
            <Image src={cofre.imagen} alt="" width={768} height={768} loading="eager" className="cofre-opening__closed" sizes="220px" />
            <Image src={cofre.imagenAbierto} alt={cofre.nombre + " abierto"} width={768} height={768} loading="eager" className="cofre-opening__open" sizes="220px" />
          </div>
        </div>

        <div
          className="cofre-reward-grid mx-auto grid w-full gap-2 sm:gap-3"
          data-stage={etapa}
          style={{
            gridTemplateColumns: `repeat(${recompensas.length}, minmax(0, 1fr))`,
            maxWidth: `${recompensas.length * 118}px`,
          }}
        >
          {recompensas.map((recompensa, index) => {
            const fase = fases[index];
            const secreta =
              recompensa.tipo === "fragmentoPersonaje" ||
              (recompensa.tipo === "carta" && recompensa.oculta);
            const rareza = secreta ? "unica" : recompensa.rareza;

            return (
              <button
                key={recompensa.id}
                type="button"
                onClick={() => revelarCarta(index)}
                disabled={etapa !== "lista" || fase !== "oculta"}
                aria-label={fase === "revelada" ? recompensa.nombre : `Revelar recompensa ${index + 1}`}
                className={`cofre-reward-slot gacha-scene fase-${fase}`}
                style={
                  {
                    "--reward-color": RAREZA_COLOR[rareza][0],
                    "--reward-index": index,
                    "--reward-origin-x": `${((recompensas.length - 1) / 2 - index) * 108}%`,
                  } as CSSProperties
                }
              >
                <span className="cofre-reward-halo" aria-hidden="true" />
                {fase === "revelada" && (
                  <span
                    className="gacha-estallido"
                    style={{ background: `radial-gradient(circle, ${RAREZA_COLOR[rareza][0]}, transparent 65%)` }}
                  />
                )}
                <span className={`gacha-card relative block aspect-[3/4] rounded-lg border bg-fondo ${RAREZA_BORDE[rareza]} ${secreta ? "cofre-reveal-secret" : ""}`}>
                  <span className="cofre-reveal-face absolute inset-0 overflow-hidden rounded-lg">
                    <Image src={reversoPorRareza(rareza)} alt="Carta boca abajo" fill className="object-cover" sizes="120px" />
                    <span className="absolute inset-0 flex items-center justify-center font-titulo text-4xl text-oro">?</span>
                  </span>
                  <span className="cofre-reveal-face cofre-reveal-front absolute inset-0 overflow-hidden rounded-lg bg-tarjeta p-1.5 sm:p-2" aria-hidden={fase !== "revelada"}>
                    {secreta && <span className="cofre-reward-aura" />}
                    <Image src={recompensa.imagen} alt={recompensa.nombre} width={768} height={768} className="relative z-10 aspect-square w-full rounded-md object-cover" sizes="120px" />
                    <span className="relative z-10 mt-1 block font-titulo text-[10px] leading-tight text-texto sm:text-[11px]">{recompensa.nombre}</span>
                    <span className="relative z-10 block text-[9px] text-texto2">{etiquetaRecompensa(recompensa)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
