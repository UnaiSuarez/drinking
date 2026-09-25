"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { REVERSOS_CARTA, type CartaRareza, type CofreTipo } from "@/lib/cofresDesign";
import type { RecompensaCofre } from "@/lib/inventario";
import { PERSONAJES_OCULTOS } from "@/lib/tienda";
import { prepararAudioCofre, sonarCofre } from "@/lib/cofreAudio";
import { centroEn, chispas, fogonazo, onda, particulasAscendentes, sinMovimiento, temblor, vortice } from "@/lib/cofreFx";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

gsap.registerPlugin(useGSAP);

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

/** Las recompensas "secretas" usan el estilo único (morado): exclusivas,
 * fragmentos de personaje y momentos históricos. */
function esSecreta(recompensa: RecompensaCofre) {
  return (
    recompensa.tipo === "fragmentoPersonaje" ||
    (recompensa.tipo === "carta" && recompensa.oculta) ||
    (recompensa.tipo === "skin" && recompensa.skinTipo === "momento")
  );
}

function reversoPorRecompensa(recompensa: RecompensaCofre) {
  if (recompensa.tipo === "fragmentoPersonaje") return REVERSOS_CARTA.personaje;
  if (recompensa.tipo === "skin") return recompensa.skinTipo === "momento" ? REVERSOS_CARTA.momento : REVERSOS_CARTA.skin;
  if (esSecreta(recompensa)) return REVERSOS_CARTA.exclusiva;
  const rareza = recompensa.rareza;
  if (rareza === "legendaria") return REVERSOS_CARTA.legendaria;
  if (rareza === "epica") return REVERSOS_CARTA.epica;
  return REVERSOS_CARTA.comun;
}

function etiquetaRecompensa(recompensa: RecompensaCofre) {
  if (recompensa.tipo === "monedas") return `${recompensa.cantidad} chapas`;
  if (recompensa.tipo === "fragmentoPersonaje") return "Personaje · fragmento";
  if (recompensa.tipo === "skin") return recompensa.skinTipo === "momento" ? "Momento histórico" : `Skin · ${recompensa.personajeNombre}`;
  if (recompensa.oculta) return "Carta exclusiva";
  return `Carta ${recompensa.rareza}`;
}

function categoriaRecompensa(recompensa: RecompensaCofre) {
  if (recompensa.tipo === "fragmentoPersonaje") return "PERSONAJE";
  if (recompensa.tipo === "skin") return recompensa.skinTipo === "momento" ? "MOMENTO" : "SKIN";
  if (recompensa.tipo === "carta" && recompensa.oculta) return "EXCLUSIVA";
  if (recompensa.tipo === "monedas") return "CHAPAS";
  return ({ comun: "COMÚN", rara: "RARA", epica: "ÉPICA", legendaria: "LEGENDARIA" } as const)[recompensa.rareza];
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
  const [sonidoActivo, setSonidoActivo] = useState(true);
  const [premioEspecial, setPremioEspecial] = useState<{
    recompensa: RecompensaCofre;
    modo: ModoPremio;
    index: number;
  } | null>(null);
  // Cartas de personaje ya desbloqueadas y vistas: pasan de silueta a imagen.
  const [desveladas, setDesveladas] = useState<number[]>([]);
  const raiz = useRef<HTMLDivElement>(null);
  const sonido = useRef(true);
  useModalScrollLock(true);

  useEffect(() => {
    sonido.current = sonidoActivo;
  }, [sonidoActivo]);

  // Precarga y decodifica las imágenes de personajes durante la apertura: si
  // se pidieran al revelar la carta, la pantalla épica arrancaría con un parón.
  useEffect(() => {
    recompensas.forEach((r) => {
      if (r.tipo !== "fragmentoPersonaje") return;
      const img = new window.Image();
      img.src = r.imagen;
      void img.decode?.().catch(() => {});
    });
  }, [recompensas]);

  // Secuencia de apertura: tensión creciente, estallido de luz y cartas que
  // salen del cofre en arco. La intensidad depende del tipo de cofre.
  const { context } = useGSAP(
    () => {
      const el = raiz.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const slots = q(".cofre-reward-slot");
      if (sinMovimiento()) {
        gsap.set(q(".cofre-opening__closed"), { opacity: 0 });
        gsap.set(q(".cofre-opening__open"), { opacity: 1, y: 0, scale: 1 });
        setEtapa("lista");
        if (sonido.current) sonarCofre("abrir");
        return;
      }
      const cofreEl = q(".cofre-opening__chest")[0];
      const cerrado = q(".cofre-opening__closed");
      const abierto = q(".cofre-opening__open");
      const luz = q(".cofre-opening__light");
      const haz = q(".cofre-opening__beam");
      const estallido = q(".cofre-opening__burst");
      const modal = q(".cofre-apertura-modal")[0];
      const color = COFRE_COLOR[cofre.id];
      const fuerza = cofre.id === "legendario" ? 2 : cofre.id === "epico" ? 1 : 0;
      gsap.set(slots, { autoAlpha: 0 });

      const tl = gsap.timeline();
      tl.fromTo(luz, { opacity: 0.1 }, { opacity: 0.42, duration: 1.15, ease: "power1.in" }, 0);
      // El cofre tiembla cada vez más antes de abrirse.
      for (let i = 0; i < 16; i++) {
        const dir = i % 2 ? 1 : -1;
        tl.to(cofreEl, { x: dir * (2 + i * 0.6 * (1 + fuerza * 0.3)), rotation: dir * (1 + i * 0.4), duration: 0.05, ease: "none" }, i ? ">" : 0);
      }
      tl.to(cofreEl, { scale: 1.07, x: 0, rotation: 0, duration: 0.14, ease: "power2.in" });
      tl.call(() => {
        setEtapa("abierto");
        if (sonido.current) sonarCofre("abrir");
        const c = centroEn(cofreEl, el);
        const colores = [color, "#fff6b8", "#ffffff"];
        chispas(el, { x: c.x, y: c.y - 30, colores, cantidad: 18 + fuerza * 16, distancia: 150 + fuerza * 40, tam: 9, gravedad: 90 });
        onda(el, { x: c.x, y: c.y - 10, color, tam: 80, escala: 3.4 + fuerza * 0.6 });
        if (fuerza > 0) {
          onda(el, { x: c.x, y: c.y - 10, color: "#fff", tam: 60, escala: 4.4, duracion: 1 });
          fogonazo(el, color, 0.5);
          temblor(modal, 4 + fuerza * 5, 0.5);
        }
        if (navigator.vibrate) navigator.vibrate(fuerza ? [30, 20, 60] : 30);
      });
      tl.set(cerrado, { opacity: 0 })
        .set(abierto, { opacity: 1, y: 0 })
        .fromTo(cofreEl, { scale: 1.07 }, { scale: 1, duration: 0.8, ease: "elastic.out(1,0.32)" }, "<")
        .fromTo(estallido, { opacity: 0.95, scale: 0.2 }, { opacity: 0, scale: 2.6, duration: 0.85, ease: "power2.out" }, "<")
        .fromTo(haz, { scaleY: 0, opacity: 1 }, { scaleY: 1, opacity: 0, duration: 1, ease: "power3.out" }, "<")
        .to(luz, { opacity: 0.72, duration: 0.45, yoyo: true, repeat: 1, ease: "sine.inOut" }, "<");
      tl.call(() => setEtapa("saliendo"), undefined, "+=0.3");
      // Las cartas salen del cofre: x e y con curvas distintas dibujan un arco.
      const desde = (eje: "x" | "y") => (_i: number, t: Element) => {
        const a = centroEn(cofreEl, el);
        const b = centroEn(t, el);
        return eje === "x" ? a.x - b.x : a.y - b.y;
      };
      tl.addLabel("salen")
        .fromTo(slots, { x: desde("x"), scale: 0.15, rotation: () => gsap.utils.random(-30, 30), autoAlpha: 0 }, { x: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.85, ease: "power2.out", stagger: 0.17 }, "salen")
        .fromTo(slots, { y: desde("y") }, { y: 0, duration: 0.85, ease: "back.out(1.8)", stagger: 0.17 }, "salen")
        .call(() => setEtapa("lista"));
    },
    { scope: raiz }
  );

  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [onClose]);

  const revelarCarta = (index: number) => context.add(() => {
    const recompensa = recompensas[index];
    const el = raiz.current;
    if (etapa !== "lista" || !recompensa || fases[index] !== "oculta" || !el) return;
    const secreta = esSecreta(recompensa);
    const rareza = secreta ? "unica" : recompensa.rareza;
    // Toda skin (sea cual sea su rareza) abre la pantalla grande con la imagen completa.
    const nivel = recompensa.tipo === "skin" || rareza === "legendaria" || rareza === "unica" ? 3 : rareza === "epica" ? 2 : rareza === "rara" ? 1 : 0;
    const colores = RAREZA_COLOR[rareza];
    const frag = recompensa.tipo === "fragmentoPersonaje" ? recompensa : null;
    const modo: ModoPremio = frag ? (frag.completa ? "personaje" : "fragmento") : recompensa.tipo === "skin" ? "skin" : rareza === "unica" ? "unica" : "legendaria";
    const pantallaPropia = modo === "personaje" || modo === "fragmento";

    if (sinMovimiento()) {
      setFases((actual) => actual.map((fase, i) => i === index ? "revelada" : fase));
      if (nivel === 3) setPremioEspecial({ recompensa, modo, index });
      if (sonido.current && nivel < 3) sonarCofre("revelar");
      return;
    }
    setFases((actual) => actual.map((fase, i) => i === index ? "girando" : fase));
    if (sonido.current && nivel < 3) sonarCofre("revelar");
    if (navigator.vibrate) navigator.vibrate(15);

    const slot = el.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    const carta = slot?.querySelector(".gacha-card");
    const brillo = slot?.querySelector(".cofre-glare");
    const halo = slot?.querySelector(".cofre-reward-halo");
    const modal = el.querySelector(".cofre-apertura-modal");
    if (!slot || !carta || !brillo || !halo || !modal) return;
    const duracionGiro = modo === "personaje" ? 1.25 : modo === "fragmento" ? 0.95 : 0.6 + nivel * 0.2;

    // El halo late aparte: dentro de la línea principal alargaría la espera.
    if (nivel === 3) gsap.to(halo, { opacity: 1, scale: modo === "personaje" ? 2 : 1.7, duration: 0.25, yoyo: true, repeat: modo === "personaje" ? 5 : 1, ease: "sine.inOut" });

    const tl = gsap.timeline();
    // Anticipación breve: cuanto más rara, más tiembla la carta.
    tl.to(slot, { scale: 1.08 + nivel * 0.03, y: -6 - nivel * 4, duration: 0.14 + nivel * 0.04, ease: "power2.out" });
    if (nivel >= 2) {
      for (let k = 0; k < 8; k++) tl.to(slot, { x: (k % 2 ? 1 : -1) * (2 + nivel + k * 0.3), duration: 0.03, ease: "none" });
      tl.to(slot, { x: 0, duration: 0.03 });
    }
    tl.addLabel("giro");
    tl.to(carta, { rotationY: 180, duration: duracionGiro, ease: nivel >= 2 ? "power3.inOut" : "back.inOut(1.3)" }, "giro")
      .to(slot, { scale: 1.2 + nivel * 0.04, duration: duracionGiro / 2, ease: "sine.out" }, "giro")
      .fromTo(brillo, { xPercent: -130, opacity: 1 }, { xPercent: 130, duration: 0.7, ease: "power2.inOut", onComplete: () => { gsap.set(brillo, { opacity: 0 }); } }, `giro+=${duracionGiro * 0.4}`);
    tl.addLabel("aterriza", `giro+=${duracionGiro}`);
    tl.to(slot, { scale: 1, y: 0, duration: 0.5, ease: "back.out(2.4)" }, "aterriza-=0.1");
    if (pantallaPropia) {
      // La pantalla épica toma el relevo con la carta aún girando: sin pausa.
      tl.call(() => setPremioEspecial({ recompensa, modo, index }), undefined, `giro+=${duracionGiro * 0.55}`);
      tl.call(() => setFases((actual) => actual.map((fase, i) => i === index ? "revelada" : fase)), undefined, "aterriza");
    } else {
      tl.call(() => {
        setFases((actual) => actual.map((fase, i) => i === index ? "revelada" : fase));
        const c = centroEn(slot, el);
        onda(el, { x: c.x, y: c.y, color: colores[0], tam: 70, escala: 2.2 + nivel * 0.8 });
        if (nivel > 0) chispas(el, { x: c.x, y: c.y, colores: [...colores, "#ffffff"], cantidad: 8 + nivel * 12, distancia: 70 + nivel * 35, tam: 7 });
        if (nivel === 2) {
          confetti({ particleCount: 40, spread: 65, startVelocity: 32, gravity: 1.1, scalar: 0.8, origin: { x: c.x / window.innerWidth, y: c.y / window.innerHeight }, colors: colores });
        }
        if (nivel === 3) {
          // Legendarias y únicas: partículas de luz, nunca confeti.
          fogonazo(el, colores[0], 0.55);
          temblor(modal, 9, 0.5);
          const luz = [...colores, "#ffffff"];
          chispas(el, { x: c.x, y: c.y, colores: luz, cantidad: 30, distancia: 260, tam: 6, gravedad: -30, duracion: 1.4, arco: [-2.4, -0.7] });
        }
        if (navigator.vibrate) navigator.vibrate(nivel === 3 ? [40, 30, 60] : nivel === 2 ? [30, 20, 40] : 30);
      }, undefined, "aterriza-=0.05");
      if (nivel === 3) tl.call(() => setPremioEspecial({ recompensa, modo, index }), undefined, "aterriza+=0.12");
    }
  });

  return (
    <div ref={raiz} className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/92 p-3 backdrop-blur-sm">
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
            onClick={() => {
              if (!sonidoActivo) prepararAudioCofre();
              setSonidoActivo((activo) => !activo);
            }}
            aria-label={sonidoActivo ? "Silenciar cofres" : "Activar sonido de cofres"}
            title={sonidoActivo ? "Silenciar" : "Activar sonido"}
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-borde text-lg text-texto2 active:scale-95"
          >
            {sonidoActivo ? "🔊" : "🔇"}
          </button>
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
          <span className="cofre-opening__beam" aria-hidden="true" />
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
            const secreta = esSecreta(recompensa);
            const rareza = secreta ? "unica" : recompensa.rareza;

            return (
              <button
                key={recompensa.id}
                data-idx={index}
                type="button"
                onClick={() => revelarCarta(index)}
                disabled={etapa !== "lista" || fase !== "oculta"}
                aria-label={fase === "revelada" ? recompensa.nombre : `Revelar recompensa ${index + 1}`}
                className={`cofre-reward-slot gacha-scene fase-${fase}`}
                data-rarity={rareza}
                data-kind={recompensa.tipo === "fragmentoPersonaje" ? "personaje" : recompensa.tipo === "skin" ? recompensa.skinTipo : secreta ? "exclusiva" : rareza}
                style={{ "--reward-color": RAREZA_COLOR[rareza][0] } as CSSProperties}
              >
                <span className="cofre-reward-halo" aria-hidden="true" />
                <span className={`gacha-card relative block aspect-[3/4] ${secreta ? "cofre-reveal-secret" : ""}`}>
                  <span className="cofre-reveal-face absolute inset-0">
                    <Image src={reversoPorRecompensa(recompensa)} alt="Carta boca abajo" fill className="object-contain" sizes="120px" />
                    {rareza !== "legendaria" && rareza !== "unica" && recompensa.tipo !== "skin" && (
                      <span className="absolute inset-0 flex items-center justify-center font-titulo text-3xl text-oro drop-shadow-lg">?</span>
                    )}
                    <span className="cofre-card-category">{categoriaRecompensa(recompensa)}</span>
                  </span>
                  <span className="cofre-reveal-face cofre-reveal-front absolute inset-0" aria-hidden={fase !== "revelada"}>
                    {secreta && <span className="cofre-reward-aura" />}
                    {recompensa.tipo === "fragmentoPersonaje" ? (
                      <PiezaPersonaje recompensa={recompensa} desvelada={desveladas.includes(index)} />
                    ) : (
                      <Image src={recompensa.imagen} alt={recompensa.nombre} width={768} height={768} className="relative z-10 aspect-square w-full rounded-md object-contain" sizes="120px" />
                    )}
                    <span className="relative z-10 mt-1 block font-titulo text-[10px] leading-tight text-texto sm:text-[11px]">{recompensa.nombre}</span>
                    <span className="relative z-10 block text-[9px] text-texto2">{etiquetaRecompensa(recompensa)}</span>
                    <span className="cofre-glare" aria-hidden="true" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {premioEspecial && (
        <PremioGrande
          recompensa={premioEspecial.recompensa}
          modo={premioEspecial.modo}
          sonido={sonidoActivo}
          onClose={() => {
            const cerrado = premioEspecial;
            setPremioEspecial(null);
            if (cerrado.modo === "personaje") setDesveladas((actual) => [...actual, cerrado.index]);
          }}
        />
      )}
    </div>
  );
}


/** Estilo de un trozo (tercio vertical) de la imagen de un personaje. */
function estiloTrozo(imagen: string, indice: number, total: number): CSSProperties {
  return {
    backgroundImage: `url(${imagen})`,
    backgroundSize: `${total * 100}% 100%`,
    backgroundPosition: `${total > 1 ? (indice / (total - 1)) * 100 : 0}% 0`,
  };
}

/** Trozo de la imagen del personaje en la cara de una carta de fragmento. */
function PiezaPersonaje({ recompensa, desvelada }: { recompensa: Extract<RecompensaCofre, { tipo: "fragmentoPersonaje" }>; desvelada: boolean }) {
  if (recompensa.completa && desvelada) {
    return <Image src={recompensa.imagen} alt={recompensa.nombre} width={768} height={768} className="relative z-10 aspect-square w-full rounded-md object-contain" sizes="120px" />;
  }
  return (
    <span className="relative z-10 mx-auto flex aspect-square w-full items-center justify-center">
      {recompensa.completa ? (
        <span
          className="pieza-personaje pieza-personaje--silueta"
          style={{ width: "100%", backgroundImage: `url(${recompensa.imagen})`, backgroundSize: "contain", backgroundPosition: "center" }}
        />
      ) : (
        <span className="pieza-personaje" style={{ width: `${100 / recompensa.necesarios}%`, ...estiloTrozo(recompensa.imagen, recompensa.indice, recompensa.necesarios) }} />
      )}
    </span>
  );
}

type ModoPremio = "legendaria" | "unica" | "fragmento" | "personaje" | "skin";

/** Premio grande de una legendaria, única o personaje; siempre con partículas
 * de luz (sin confeti).
 * - legendaria: se estrella con onda de choque.
 * - única: emerge de un portal.
 * - fragmento: el trozo cae en su hueco y el personaje sigue oculto.
 * - personaje: los 3 trozos aparecen, se unen y el personaje se enciende. */
function PremioGrande({
  recompensa,
  modo,
  sonido,
  onClose,
}: {
  recompensa: RecompensaCofre;
  modo: ModoPremio;
  sonido: boolean;
  onClose: () => void;
}) {
  const raiz = useRef<HTMLButtonElement>(null);
  // Los momentos históricos usan la paleta morada; el resto de skins, la dorada.
  const unica = modo === "skin" ? recompensa.tipo === "skin" && recompensa.skinTipo === "momento" : modo !== "legendaria";
  const [fallo, setFallo] = useState(false);
  const frag = recompensa.tipo === "fragmentoPersonaje" ? recompensa : null;
  const total = frag?.necesarios ?? 3;
  const habilidad = frag ? PERSONAJES_OCULTOS.find((p) => p.id === frag.personajeId)?.habilidad : undefined;
  const titulo =
    modo === "personaje" ? "¡Personaje desbloqueado!"
    : modo === "fragmento" ? (frag?.yaTenido ? "Ya lo tenías · +250 chapas" : `Fragmento ${Math.min((frag?.previos ?? 0) + 1, total)}/${total}`)
    : recompensa.tipo === "skin" ? (recompensa.skinTipo === "momento" ? (recompensa.fecha ? `Momento histórico · ${recompensa.fecha}` : "Momento histórico") : `Skin de ${recompensa.personajeNombre}`)
    : modo === "unica" ? "Recompensa única" : "Legendaria";

  useEffect(() => {
    raiz.current?.focus();
  }, []);

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el || sinMovimiento()) return;
      const q = gsap.utils.selector(el);
      const premio = q(".cofre-grand-reveal__prize")[0];
      const figura = q(".gr-figura")[0];
      const escena = q(".cofre-grand-reveal__stage")[0];
      const colores = unica ? ["#bd7bff", "#ff2e93", "#ffffff"] : ["#ffd54a", "#fff6b8", "#ffb627"];
      const color = colores[0];
      const luz = [...colores, "#ffffff"];
      const n = (x: number) => x; // cofreFx ya aligera las partículas en móvil
      let detener: (() => void) | undefined;
      gsap.set(q(".gr-letra"), { opacity: 0, y: 22, scale: 0.6 });
      gsap.set([...q(".cofre-grand-reveal__tier"), ...q(".cofre-grand-reveal__continue"), ...q(".gr-pip"), ...q(".gr-habilidad")], { opacity: 0 });

      const centro = () => centroEn(figura, el);
      const fuentes = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        chispas(el, { x: w * 0.08, y: h, colores: luz, cantidad: n(30), distancia: h * 0.75, tam: 8, gravedad: 90, duracion: 1.8, arco: [-1.75, -1.1] });
        chispas(el, { x: w * 0.92, y: h, colores: luz, cantidad: n(30), distancia: h * 0.75, tam: 8, gravedad: 90, duracion: 1.8, arco: [-2.05, -1.4] });
      };
      const impacto = (grande: boolean) => {
        const c = centro();
        fogonazo(el, modo === "personaje" ? "#ffffff" : unica ? "#e6d4ff" : "#fff6d0", grande ? 0.9 : 0.6);
        onda(el, { x: c.x, y: c.y, color, tam: 120, escala: 4.2, duracion: 1 });
        onda(el, { x: c.x, y: c.y, color: "#ffffff", tam: 90, escala: 3, duracion: 0.7, grosor: 2 });
        if (grande) {
          onda(el, { x: c.x, y: c.y, color: colores[1] ?? color, tam: 60, escala: 7, duracion: 1.5, grosor: 5 });
          onda(el, { x: c.x, y: c.y, color: "#ffffff", tam: 40, escala: 9, duracion: 1.8, grosor: 2 });
        }
        chispas(el, { x: c.x, y: c.y, colores: luz, cantidad: n(grande ? 120 : 50), distancia: grande ? 380 : 260, tam: 10, gravedad: 140, duracion: grande ? 2 : 1.4 });
        temblor(escena, grande ? 24 : 12, grande ? 0.9 : 0.6);
        fuentes();
        if (navigator.vibrate) navigator.vibrate(grande ? [80, 40, 120, 40, 200] : [50, 30, 80]);
        detener = particulasAscendentes(el, { colores: luz, cantidad: n(grande ? 40 : 28), tam: 9 });
      };

      const tl = gsap.timeline();
      tl.from(el, { opacity: 0, duration: 0.2 })
        .fromTo(q(".cofre-grand-reveal__beam"), { scaleY: 0, opacity: 0, transformOrigin: "50% 0%" }, { scaleY: 1, opacity: 0.8, duration: modo === "personaje" ? 1.4 : 0.5, ease: "power2.in" }, 0);

      if (modo === "personaje") {
        // Sin pausas: todo arranca a la vez mientras la carta aún gira.
        const trozos = q(".gr-trozo");
        const w = (figura as HTMLElement).clientWidth;
        const origen = [{ x: -w * 1.05, y: -w * 0.7, r: -34 }, { x: 0, y: w * 1.1, r: 12 }, { x: w * 1.05, y: -w * 0.7, r: 34 }];
        const c0 = () => ({ x: el.clientWidth / 2, y: centro().y });
        gsap.set(premio, { opacity: 1 });
        gsap.set(q(".gr-sombra"), { opacity: 0 });
        gsap.set(q(".cofre-grand-reveal__image"), { clipPath: "inset(0 0 100% 0)" });
        gsap.set(q(".gr-barrido"), { opacity: 0, yPercent: -50 });
        gsap.set(trozos, { opacity: 0 });
        tl.call(() => vortice(el, { ...c0(), colores: luz, cantidad: n(70), radio: Math.min(el.clientWidth, el.clientHeight) * 0.6, duracion: 1.9 }), undefined, 0)
          .to(escena, { scale: 1.02, duration: 0.2, yoyo: true, repeat: 7, ease: "sine.inOut" }, 0.1)
          .fromTo(q(".cofre-grand-reveal__rays"), { opacity: 0, scale: 0.2 }, { opacity: 0.5, scale: 0.7, duration: 2, ease: "power2.in" }, 0.1);
        // 1) Los 3 trozos aparecen de uno en uno, cada uno con su ping.
        trozos.forEach((t, i) => {
          tl.fromTo(t, { opacity: 0, x: origen[i]?.x ?? 0, y: origen[i]?.y ?? 0, rotation: origen[i]?.r ?? 0, scale: 0.4, filter: `brightness(0.3) saturate(0.5) drop-shadow(0 0 2px #fff) drop-shadow(0 0 4px ${color})` }, { opacity: 1, scale: 1, filter: `brightness(0.3) saturate(0.5) drop-shadow(0 0 2px #fff) drop-shadow(0 0 22px ${color})`, duration: 0.5, ease: "back.out(1.8)" }, 0.15 + i * 0.32)
            .call(() => { const c = centroEn(t, el); onda(el, { x: c.x, y: c.y, color, tam: 50, escala: 3, duracion: 0.7, grosor: 2 }); chispas(el, { x: c.x, y: c.y, colores: luz, cantidad: n(16), distancia: 80, tam: 6 }); }, undefined, 0.2 + i * 0.32);
        });
        // 2) Tiemblan cargados de energía y se acercan.
        tl.to(trozos, { x: (i: number) => (origen[i]?.x ?? 0) * 0.45, y: (i: number) => (origen[i]?.y ?? 0) * 0.45, rotation: (i: number) => (origen[i]?.r ?? 0) * 0.4, filter: `brightness(0.3) saturate(0.5) drop-shadow(0 0 2px #fff) drop-shadow(0 0 34px ${color})`, duration: 0.7, ease: "sine.inOut" }, 1.15)
          .to(trozos, { keyframes: [{ x: "+=5", duration: 0.04 }, { x: "-=10", duration: 0.04 }, { x: "+=5", duration: 0.04 }], repeat: 4, ease: "none" }, 1.5);
        // 3) Convergen y encajan.
        tl.to(trozos, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.5, ease: "power4.in", stagger: 0.04 }, 1.95)
          .addLabel("encaje", 2.5)
          .call(() => impacto(true), undefined, "encaje")
          .set(trozos, { opacity: 0 }, "encaje")
          .set(q(".gr-sombra"), { opacity: 1 }, "encaje")
          // 4) La luz barre la silueta de arriba abajo y revela al personaje.
          .fromTo(q(".gr-barrido"), { opacity: 1, top: "0%" }, { top: "100%", duration: 0.95, ease: "power2.inOut" }, "encaje+=0.05")
          .to(q(".cofre-grand-reveal__image"), { clipPath: "inset(0 0 0% 0)", duration: 0.95, ease: "power2.inOut" }, "encaje+=0.05")
          .to(q(".gr-barrido"), { opacity: 0, duration: 0.2 }, ">-0.1")
          .fromTo(figura, { scale: 1 }, { scale: 1.14, duration: 0.14, ease: "power4.out" }, "encaje+=0.95")
          .to(figura, { scale: 1, duration: 1, ease: "elastic.out(1,0.4)" }, ">")
          .fromTo(q(".cofre-grand-reveal__rays"), { opacity: 0.5, scale: 0.7 }, { opacity: 0.85, scale: 1.25, duration: 1, ease: "power2.out" }, "encaje")
          .fromTo(q(".gr-orbita"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.9, stagger: 0.15, ease: "back.out(1.6)" }, "encaje+=0.9")
          .addLabel("texto", "encaje+=1.1");
        q(".gr-orbita").forEach((o, i) => gsap.to(o, { rotation: i ? -360 : 360, duration: i ? 9 : 6, ease: "none", repeat: -1 }));
        gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 5 }).call(() => {
          const c = centro();
          onda(el, { x: c.x, y: c.y, color, tam: 100, escala: 4, duracion: 1.4, grosor: 2 });
        });
      } else if (modo === "fragmento") {
        const actual = q(".gr-trozo-actual")[0];
        const previos = q(".gr-trozo-previo");
        const w = (figura as HTMLElement).clientWidth;
        gsap.set(q(".gr-hueco"), { opacity: 0 });
        gsap.set(previos, { opacity: 0 });
        gsap.set(actual, { opacity: 0 });
        tl.fromTo(figura, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 0.05)
          .to(q(".gr-hueco"), { opacity: 1, duration: 0.3, stagger: 0.08 }, 0.15)
          .to(previos, { opacity: 1, duration: 0.4, stagger: 0.1 }, 0.35);
        if (actual) {
          tl.fromTo(actual, { opacity: 0, y: -w * 1.3, rotation: -28, scale: 1.5, filter: "brightness(3) saturate(0)" }, { opacity: 1, y: 0, rotation: 0, scale: 1, filter: "brightness(1.6) saturate(1)", duration: 0.5, ease: "power3.in" }, 0.6)
            .call(() => {
              const c = centroEn(actual, el);
              fogonazo(el, "#e6d4ff", 0.4);
              onda(el, { x: c.x, y: c.y, color, tam: 70, escala: 4, duracion: 0.9 });
              chispas(el, { x: c.x, y: c.y, colores: luz, cantidad: n(44), distancia: 190, tam: 8, gravedad: 100, duracion: 1.3 });
              temblor(escena, 10, 0.5);
              if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
              detener = particulasAscendentes(el, { colores: luz, cantidad: n(22), tam: 8 });
            }, undefined, 1.1)
            .to(actual, { filter: "brightness(1) saturate(1)", scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.12)
            .addLabel("texto", 1.25);
        } else {
          tl.addLabel("texto", 0.9);
        }
        tl.fromTo(q(".cofre-grand-reveal__rays"), { opacity: 0, scale: 0.3 }, { opacity: 0.55, scale: 1, duration: 0.9, ease: "power2.out" }, 1.0);
      } else if (modo === "skin") {
        // Revelación de la ilustración completa: la luz sube desde el suelo y
        // va descubriendo al personaje de los pies a la cabeza.
        const img = q(".cofre-grand-reveal__image")[0];
        const c = () => centroEn(figura, el);
        gsap.set(img, { clipPath: "inset(100% 0 0 0)", filter: "brightness(0.25) saturate(0.4)", yPercent: 4 });
        gsap.set(q(".gr-barrido"), { opacity: 0, top: "100%" });
        gsap.set(q(".gr-piso"), { opacity: 0, scaleX: 0.2 });
        tl.fromTo(figura, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, 0.05)
          .to(q(".gr-piso"), { opacity: 1, scaleX: 1, duration: 0.7, ease: "power2.out" }, 0.1)
          .to(q(".gr-barrido"), { opacity: 1, duration: 0.1 }, 0.35)
          .to(q(".gr-barrido"), { top: "0%", duration: 1.1, ease: "power2.inOut" }, 0.35)
          .to(img, { clipPath: "inset(0% 0 0 0)", yPercent: 0, duration: 1.1, ease: "power2.inOut" }, 0.35)
          .to(img, { filter: "brightness(1) saturate(1)", duration: 0.9, ease: "power1.in" }, 0.55)
          .to(q(".gr-barrido"), { opacity: 0, duration: 0.2 }, 1.35)
          .call(() => {
            const p = c();
            fogonazo(el, unica ? "#e6d4ff" : "#fff6d0", 0.5);
            onda(el, { x: p.x, y: p.y + (figura as HTMLElement).clientHeight * 0.42, color, tam: 90, escala: 5, duracion: 1.1 });
            chispas(el, { x: p.x, y: p.y, colores: luz, cantidad: n(70), distancia: 240, tam: 8, gravedad: 110, duracion: 1.5, arco: [-2.6, -0.5] });
            temblor(escena, 8, 0.5);
            if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
            detener = particulasAscendentes(el, { colores: luz, cantidad: n(32), tam: 9 });
          }, undefined, 1.4)
          .fromTo(figura, { scale: 1 }, { scale: 1.05, duration: 0.14, ease: "power4.out" }, 1.4)
          .to(figura, { scale: 1, duration: 0.9, ease: "elastic.out(1,0.4)" }, ">")
          .addLabel("texto", 1.5);
      } else if (modo === "unica") {
        tl.fromTo(premio, { y: 50, scale: 0.12, opacity: 0, rotation: -200 }, { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 1, ease: "elastic.out(1,0.55)" }, 0.2)
          .call(() => impacto(false), undefined, 0.45)
          .addLabel("texto", 0.8);
      } else {
        tl.fromTo(premio, { y: "-85vh", rotation: -22, scale: 0.5, opacity: 1 }, { y: 0, rotation: 0, scale: 1, duration: 0.62, ease: "power3.in" }, 0.05)
          .call(() => impacto(false))
          .to(premio, { scaleY: 0.8, scaleX: 1.14, transformOrigin: "50% 100%", duration: 0.09, ease: "power2.out" }, "<")
          .to(premio, { scaleY: 1, scaleX: 1, duration: 0.8, ease: "elastic.out(1,0.35)" }, ">")
          .addLabel("texto", 0.85);
      }
      if (modo === "legendaria" || modo === "unica" || modo === "skin") {
        tl.fromTo(q(".cofre-grand-reveal__rays"), { opacity: 0, scale: 0.3 }, { opacity: 0.75, scale: 1, duration: 0.9, ease: "power2.out" }, "texto-=0.5");
      }
      const fuerte = modo === "personaje";
      tl.to(q(".gr-letra"), fuerte ? { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(3)", stagger: 0.05 } : { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2.2)", stagger: 0.03 }, "texto")
        .to(q(".cofre-grand-reveal__tier"), { opacity: 1, duration: 0.4 }, ">-0.1");
      if (modo === "personaje" || modo === "fragmento") {
        tl.to(q(".gr-pip"), { opacity: 1, duration: 0.15, stagger: 0.09 }, ">0.05")
          .call(() => {
            const llenos = q(".gr-pip-lleno");
            llenos.forEach((pip, i) => {
              gsap.fromTo(pip, { scale: 0.2, backgroundColor: "#ffffff" }, { scale: 1, backgroundColor: color, duration: 0.5, delay: i * 0.12, ease: "back.out(3)" });
              if (i === llenos.length - 1) {
                gsap.delayedCall(i * 0.12 + 0.1, () => {
                  const c = centroEn(pip, el);
                  onda(el, { x: c.x, y: c.y, color, tam: 30, escala: 4, duracion: 0.8 });
                  chispas(el, { x: c.x, y: c.y, colores: luz, cantidad: 20, distancia: 90, tam: 6 });
                });
              }
            });
          });
      }
      if (modo === "personaje") tl.to(q(".gr-habilidad"), { opacity: 1, y: 0, duration: 0.5 }, ">0.1");
      tl.to(q(".cofre-grand-reveal__continue"), { opacity: 1, duration: 0.4 }, ">0.2");
      gsap.to(q(".cofre-grand-reveal__rays"), { rotation: 360, duration: 40, ease: "none", repeat: -1 });
      if (modo !== "fragmento" && modo !== "skin") gsap.to(q(".cofre-grand-reveal__image"), { y: -7, duration: 2.1, ease: "sine.inOut", yoyo: true, repeat: -1, delay: modo === "personaje" ? 5 : 1.8 });
      gsap.to(q(".cofre-grand-reveal__continue"), { opacity: 0.45, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, delay: modo === "personaje" ? 7 : 2.6 });
      if (sonido) sonarCofre(modo === "personaje" ? "personaje" : modo === "fragmento" || modo === "unica" ? "unica" : "legendaria");
      return () => detener?.();
    },
    { scope: raiz }
  );

  return (
    <button
      ref={raiz}
      type="button"
      className="cofre-grand-reveal"
      data-rarity={unica ? "unica" : "legendaria"}
      data-personaje={modo === "personaje" || undefined}
      data-skin={modo === "skin" || undefined}
      aria-label={`Cerrar premio ${recompensa.nombre}`}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <span className="cofre-grand-reveal__stage">
        <span className="cofre-grand-reveal__beam" aria-hidden="true" />
        <span className="cofre-grand-reveal__rays" aria-hidden="true" />
        <span className="cofre-grand-reveal__prize">
          {modo === "personaje" && (
            <>
              <span className="gr-orbita" aria-hidden="true" />
              <span className="gr-orbita gr-orbita-2" aria-hidden="true" />
            </>
          )}
          <span className={`gr-figura ${modo === "personaje" || modo === "fragmento" ? "gr-figura--luz" : ""} ${modo === "skin" ? "gr-figura--completa" : ""}`}>
            {modo === "fragmento" && frag && (
              <>
                {Array.from({ length: total }, (_, i) => (
                  <span key={`h${i}`} className="gr-hueco" style={{ left: `${(i * 100) / total}%`, width: `${100 / total}%` }} />
                ))}
                {Array.from({ length: total }, (_, i) => {
                  const previo = i < frag.previos && i !== frag.indice;
                  const actual = i === frag.indice && !frag.yaTenido;
                  if (!previo && !actual) return null;
                  return (
                    <span
                      key={`t${i}`}
                      className={`gr-trozo ${actual ? "gr-trozo-actual" : "gr-trozo-previo"}`}
                      style={{ left: `${(i * 100) / total}%`, width: `${100 / total}%`, ...estiloTrozo(frag.imagen, i, total) }}
                    />
                  );
                })}
              </>
            )}
            {modo === "personaje" && frag && (
              <>
                {Array.from({ length: total }, (_, i) => (
                  <span key={`t${i}`} className="gr-trozo" style={{ left: `${(i * 100) / total}%`, width: `${100 / total}%`, ...estiloTrozo(frag.imagen, i, total) }} />
                ))}
                <span className="gr-sombra" style={{ backgroundImage: `url(${frag.imagen})` }} aria-hidden="true" />
                <span className="gr-barrido" aria-hidden="true" />
              </>
            )}
            {modo === "skin" && (
              <>
                <span className="gr-piso" aria-hidden="true" />
                <span className="gr-barrido" aria-hidden="true" />
              </>
            )}
            {modo !== "fragmento" && (
              <Image
                src={modo === "skin" && recompensa.tipo === "skin" && !fallo ? recompensa.ilustracion : recompensa.imagen}
                onError={() => setFallo(true)}
                alt=""
                width={modo === "skin" ? 1024 : 768}
                height={modo === "skin" ? 1536 : 768}
                className="cofre-grand-reveal__image"
                sizes="300px"
                priority
              />
            )}
          </span>
          <strong className="cofre-grand-reveal__name" aria-label={recompensa.nombre}>
            {recompensa.nombre.split(" ").map((palabra, i) => (
              <span key={i} className="inline-block whitespace-nowrap" aria-hidden="true">
                {[...palabra].map((letra, j) => (
                  <span key={j} className="gr-letra inline-block">{letra}</span>
                ))}
                {" "}
              </span>
            ))}
          </strong>
          <span className="cofre-grand-reveal__tier">{titulo}</span>
          {frag && (modo === "personaje" || modo === "fragmento") && (
            <span className="gr-pips" aria-label={`${Math.min(frag.previos + 1, total)} de ${total} fragmentos`}>
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`gr-pip ${i <= (modo === "personaje" ? total : frag.previos) ? "gr-pip-lleno" : ""}`} />
              ))}
            </span>
          )}
          {modo === "personaje" && habilidad && <span className="gr-habilidad">{habilidad}</span>}
          <span className="cofre-grand-reveal__continue">Continuar</span>
        </span>
      </span>
    </button>
  );
}
