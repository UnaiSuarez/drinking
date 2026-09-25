import gsap from "gsap";

/** Utilidades GSAP compartidas por las animaciones de cofres y cartas. Los
 * elementos se crean sobre `host` (position: relative/fixed) y se eliminan
 * solos al terminar. */

export function sinMovimiento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** En móvil (puntero táctil o pocos núcleos) se usan menos partículas. */
export function factorParticulas() {
  if (typeof window === "undefined") return 1;
  const tactil = window.matchMedia("(pointer: coarse)").matches;
  const pocos = (navigator.hardwareConcurrency ?? 8) <= 4;
  return tactil || pocos ? 0.55 : 1;
}

type Punto = { x: number; y: number };

/** Centro de `el` en coordenadas de `host`. */
export function centroEn(el: Element, host: Element): Punto {
  const a = el.getBoundingClientRect();
  const b = host.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
}

/** Explosión de chispas con gravedad: cada una sale en una dirección y
 * velocidad distintas y cae al final. */
export function chispas(
  host: HTMLElement,
  { x, y, colores, cantidad, distancia = 120, tam = 8, gravedad = 60, duracion = 1, arco }: {
    x: number; y: number; colores: string[]; cantidad: number; distancia?: number; tam?: number; gravedad?: number; duracion?: number;
    /** Rango de ángulos en radianes (p. ej. [-2.2, -0.9] lanza hacia arriba). */
    arco?: [number, number];
  }
) {
  if (sinMovimiento()) return;
  cantidad = Math.max(4, Math.round(cantidad * factorParticulas()));
  for (let i = 0; i < cantidad; i++) {
    const s = document.createElement("i");
    const t = gsap.utils.random(tam * 0.5, tam);
    const color = colores[i % colores.length];
    Object.assign(s.style, {
      position: "absolute", left: `${x}px`, top: `${y}px`, width: `${t}px`, height: `${t}px`,
      marginLeft: `${-t / 2}px`, marginTop: `${-t / 2}px`, borderRadius: i % 3 === 0 ? "2px" : "50%",
      background: `radial-gradient(circle, #fff 0, ${color} 55%, transparent 100%)`, pointerEvents: "none", zIndex: "60", willChange: "transform",
    } as Partial<CSSStyleDeclaration>);
    host.appendChild(s);
    const ang = arco ? gsap.utils.random(arco[0], arco[1]) : gsap.utils.random(0, Math.PI * 2);
    const d = gsap.utils.random(distancia * 0.35, distancia);
    const dur = gsap.utils.random(duracion * 0.6, duracion);
    gsap.timeline({ onComplete: () => s.remove() })
      .to(s, { x: Math.cos(ang) * d, duration: dur, ease: "power2.out" }, 0)
      .to(s, { y: Math.sin(ang) * d, duration: dur * 0.55, ease: "power2.out" }, 0)
      .to(s, { y: `+=${gravedad}`, duration: dur * 0.45, ease: "power1.in" }, dur * 0.55)
      .to(s, { rotation: gsap.utils.random(-260, 260), duration: dur }, 0)
      .to(s, { opacity: 0, scale: 0.2, duration: dur * 0.45, ease: "power1.in" }, dur * 0.55);
  }
}

/** Onda expansiva circular. */
export function onda(host: HTMLElement, { x, y, color, tam = 90, escala = 3, duracion = 0.8, grosor = 3 }: {
  x: number; y: number; color: string; tam?: number; escala?: number; duracion?: number; grosor?: number;
}) {
  if (sinMovimiento()) return;
  const o = document.createElement("i");
  Object.assign(o.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${tam}px`, height: `${tam}px`,
    marginLeft: `${-tam / 2}px`, marginTop: `${-tam / 2}px`, borderRadius: "50%",
    border: `${grosor}px solid ${color}`, boxShadow: `0 0 18px ${color}, inset 0 0 18px ${color}`,
    pointerEvents: "none", zIndex: "55",
  } as Partial<CSSStyleDeclaration>);
  host.appendChild(o);
  gsap.fromTo(o, { scale: 0.15, opacity: 0.95 }, { scale: escala, opacity: 0, duration: duracion, ease: "power2.out", onComplete: () => o.remove() });
}

/** Temblor de pantalla con amortiguación. */
export function temblor(el: Element, intensidad = 8, duracion = 0.5) {
  if (sinMovimiento()) return;
  const pasos = Math.round(duracion / 0.04);
  const tl = gsap.timeline();
  for (let i = 0; i < pasos; i++) {
    const k = 1 - i / pasos;
    tl.to(el, { x: gsap.utils.random(-intensidad, intensidad) * k, y: gsap.utils.random(-intensidad, intensidad) * k, duration: 0.04, ease: "none" });
  }
  tl.to(el, { x: 0, y: 0, duration: 0.05 });
}

/** Fogonazo de pantalla completa. */
export function fogonazo(host: HTMLElement, color = "#fff", duracion = 0.45) {
  if (sinMovimiento()) return;
  const f = document.createElement("i");
  Object.assign(f.style, { position: "absolute", inset: "0", background: color, pointerEvents: "none", zIndex: "58", opacity: "0" } as Partial<CSSStyleDeclaration>);
  host.appendChild(f);
  gsap.timeline({ onComplete: () => f.remove() }).to(f, { opacity: 0.85, duration: 0.06 }).to(f, { opacity: 0, duration: duracion, ease: "power2.out" });
}

function punto(host: HTMLElement, color: string, t: number, z = "56") {
  const s = document.createElement("i");
  Object.assign(s.style, {
    position: "absolute", left: "0px", top: "0px", width: `${t}px`, height: `${t}px`,
    marginLeft: `${-t / 2}px`, marginTop: `${-t / 2}px`, borderRadius: "50%", opacity: "0",
    background: `radial-gradient(circle, #fff 0, ${color} 45%, transparent 72%)`,
    pointerEvents: "none", zIndex: z, willChange: "transform",
  } as Partial<CSSStyleDeclaration>);
  host.appendChild(s);
  return s;
}

/** Campo continuo de motas de luz que suben y se desvanecen (sin confeti).
 * Devuelve la función que lo detiene y limpia. */
export function particulasAscendentes(
  host: HTMLElement,
  { colores, cantidad = 30, tam = 8 }: { colores: string[]; cantidad?: number; tam?: number }
) {
  if (sinMovimiento()) return () => {};
  cantidad = Math.max(6, Math.round(cantidad * factorParticulas()));
  const items: { el: HTMLElement; tl?: gsap.core.Timeline }[] = [];
  const vivo = { v: true };
  for (let i = 0; i < cantidad; i++) {
    const el = punto(host, colores[i % colores.length], gsap.utils.random(tam * 0.5, tam), "54");
    const item: { el: HTMLElement; tl?: gsap.core.Timeline } = { el };
    const lanzar = () => {
      if (!vivo.v) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      const dur = gsap.utils.random(2.8, 5.2);
      gsap.set(el, { x: gsap.utils.random(0, w), y: h + 20, scale: gsap.utils.random(0.5, 1.2), opacity: 0 });
      item.tl = gsap.timeline({ delay: gsap.utils.random(0, 2.5), onComplete: lanzar })
        .to(el, { y: h * gsap.utils.random(0.1, 0.55), duration: dur, ease: "power1.out" }, 0)
        .to(el, { x: `+=${gsap.utils.random(-70, 70)}`, duration: dur, ease: "sine.inOut" }, 0)
        .to(el, { opacity: 0.95, duration: dur * 0.25, ease: "power1.out" }, 0)
        .to(el, { opacity: 0, scale: 0.2, duration: dur * 0.6, ease: "power1.in" }, dur * 0.4);
    };
    lanzar();
    items.push(item);
  }
  return () => {
    vivo.v = false;
    items.forEach((it) => { it.tl?.kill(); it.el.remove(); });
  };
}

/** Energía que converge en espiral hacia un punto (carga antes de un impacto). */
export function vortice(
  host: HTMLElement,
  { x, y, colores, cantidad = 60, radio = 240, duracion = 1.4 }: { x: number; y: number; colores: string[]; cantidad?: number; radio?: number; duracion?: number }
) {
  if (sinMovimiento()) return;
  cantidad = Math.round(cantidad * factorParticulas());
  for (let i = 0; i < cantidad; i++) {
    const el = punto(host, colores[i % colores.length], gsap.utils.random(5, 11), "57");
    const est = { t: 0 };
    const a0 = gsap.utils.random(0, Math.PI * 2);
    const vueltas = gsap.utils.random(1.2, 2.2) * (i % 2 ? 1 : -1);
    const r0 = gsap.utils.random(radio * 0.55, radio);
    gsap.to(est, {
      t: 1,
      duration: duracion * gsap.utils.random(0.7, 1),
      delay: gsap.utils.random(0, duracion * 0.35),
      ease: "power2.in",
      onUpdate() {
        const ang = a0 + est.t * vueltas * Math.PI * 2;
        const r = r0 * (1 - est.t);
        gsap.set(el, { x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r, opacity: Math.sin(Math.min(1, est.t * 1.15) * Math.PI) * 0.95, scale: 1.2 - est.t * 0.7 });
      },
      onComplete: () => el.remove(),
    });
  }
}
