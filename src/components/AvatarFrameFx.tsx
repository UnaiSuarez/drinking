"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

import { type FxKind } from "@/lib/marcoFx";

const R = gsap.utils.random;
const N: Record<FxKind, { band: number; free: number; stars: number }> = {
  shine: { band: 1, free: 0, stars: 2 },
  cristal: { band: 1, free: 0, stars: 5 },
  electric: { band: 1, free: 0, stars: 0 },
  fire: { band: 1, free: 14, stars: 0 },
  disco: { band: 1, free: 0, stars: 6 },
  cosmic: { band: 0, free: 0, stars: 6 },
  prisma: { band: 1, free: 0, stars: 3 },
  halo: { band: 1, free: 0, stars: 4 },
  crown: { band: 1, free: 0, stars: 6 },
  glitch: { band: 3, free: 0, stars: 0 },
  dust: { band: 1, free: 10, stars: 0 },
  portal: { band: 0, free: 9, stars: 3 },
};

const idx = (n: number) => Array.from({ length: n }, (_, i) => i);

export default function AvatarFrameFx({ kind, arte }: { kind: FxKind; arte: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const n = N[kind];

  useGSAP(
    (_context, safeFn) => {
      const contextSafe = safeFn!;
      const el = root.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const q = <T extends Element = HTMLElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
      const [x0, x1] = arte ? [17, 83] : [8, 92];
      const timers: { pause: (v: boolean) => void }[] = [];

      // Ejecuta fn en intervalos aleatorios: nunca dos pasadas iguales.
      const later = (min: number, max: number, fn: () => void) => {
        let h: gsap.core.Tween;
        const go = contextSafe(() => {
          h = gsap.delayedCall(R(min, max), () => {
            fn();
            go();
          });
        });
        go();
        timers.push({ pause: (v) => h?.paused(v) });
      };

      const edgePoint = () => {
        const side = Math.floor(R(0, 4));
        if (side === 0) return { x: R(x0 + 6, x1 - 6), y: R(4, 12) };
        if (side === 1) return { x: R(x0 + 6, x1 - 6), y: R(88, 96) };
        if (side === 2) return { x: R(x0 - 2, x0 + 6), y: R(14, 86) };
        return { x: R(x1 - 6, x1 + 2), y: R(14, 86) };
      };

      const stars = q(".fx-star");
      stars.forEach((star) =>
        later(0.3, kind === "crown" || kind === "cristal" ? 1.6 : 2.8, () => {
          const p = edgePoint();
          gsap.set(star, { left: `${p.x}%`, top: `${p.y}%`, rotation: R(0, 45) });
          gsap.fromTo(star, { scale: 0, opacity: 0 }, { scale: R(0.8, 1.5), opacity: 1, duration: R(0.18, 0.32), ease: "power2.out", yoyo: true, repeat: 1 });
        })
      );

      const particles = (sel: string, drift: number, rise: [number, number], life: [number, number]) =>
        q(sel).forEach((p) => {
          const launch = contextSafe(() => {
            const left = Math.random() < 0.5;
            gsap.set(p, { left: `${left ? R(x0 + 2, x0 + 16) : R(x1 - 16, x1 - 2)}%`, top: `${R(86, 96)}%`, xPercent: 0, yPercent: 0, scale: R(0.5, 1.2), opacity: 0 });
            const dur = R(life[0], life[1]);
            gsap.timeline({ delay: R(0, 1.2), onComplete: launch })
              .to(p, { yPercent: -R(rise[0], rise[1]), xPercent: R(-drift, drift), scale: 0.15, duration: dur, ease: "sine.out" }, 0)
              .to(p, { opacity: 1, duration: dur * 0.15, ease: "power1.out" }, 0)
              .to(p, { opacity: 0, duration: dur * 0.6, ease: "power1.in" }, dur * 0.4);
          });
          launch();
        });

      const sweep = (s: HTMLElement) => {
        gsap.set(s, { rotation: 20 });
        return () => gsap.fromTo(s, { xPercent: -160 }, { xPercent: 380, duration: R(0.9, 1.3), ease: "power2.inOut" });
      };

      if (kind === "shine" || kind === "crown") {
        const s = q(".fx-sweep")[0];
        const run = sweep(s);
        later(kind === "crown" ? 1.2 : 2, kind === "crown" ? 3 : 4.5, run);
      }

      if (kind === "cristal" || kind === "dust") {
        gsap.to(q(".fx-glow")[0], { opacity: "random(0.35,1)", duration: "random(1.2,2.4)", ease: "sine.inOut", repeat: -1, yoyo: true, repeatRefresh: true });
      }

      if (kind === "halo") {
        gsap.to(q(".fx-rays")[0], { rotation: 360, duration: 34, ease: "none", repeat: -1 });
        gsap.to(q(".fx-rays")[0], { opacity: "random(0.35,0.85)", duration: "random(1.6,3)", ease: "sine.inOut", repeat: -1, yoyo: true, repeatRefresh: true });
      }

      if (kind === "disco") {
        gsap.to(q(".fx-disco-beam")[0], { rotation: 360, duration: 4.5, ease: "none", repeat: -1 });
        gsap.to(q(".fx-disco-beam")[0], { opacity: "random(0.5,0.95)", duration: "random(0.2,0.5)", ease: "steps(1)", repeat: -1, repeatRefresh: true });
      }

      if (kind === "prisma") {
        const p = q(".fx-prism")[0];
        gsap.set(p, { rotation: 18 });
        gsap.timeline({ repeat: -1, repeatDelay: 0.9 }).fromTo(p, { xPercent: -140, filter: "hue-rotate(0deg)" }, { xPercent: 140, filter: "hue-rotate(300deg)", duration: 2.6, ease: "power1.inOut" });
      }

      if (kind === "cosmic") {
        q(".fx-comet").forEach((c, i) => {
          gsap.to(c, { rotation: i ? -360 : 360, duration: i ? 9 : 6, ease: "none", repeat: -1 });
          gsap.to(c.querySelector("i"), { scale: 1.25, duration: 1.1, ease: "sine.inOut", repeat: -1, yoyo: true });
        });
      }

      if (kind === "fire") {
        gsap.to(q(".fx-heat")[0], { opacity: "random(0.45,1)", scaleY: "random(0.95,1.18)", duration: "random(0.25,0.6)", ease: "sine.inOut", repeat: -1, yoyo: true, repeatRefresh: true, transformOrigin: "50% 100%" });
        particles(".fx-ember", 260, [700, 1500], [1.1, 2.3]);
      }

      if (kind === "dust") particles(".fx-mote", 420, [900, 2000], [2.6, 4.6]);

      if (kind === "portal") {
        q(".fx-ring").forEach((r, i) => {
          gsap.to(r, { rotation: i ? -360 : 360, duration: i ? 11 : 7, ease: "none", repeat: -1 });
          gsap.to(r, { scale: i ? 1.03 : 0.97, opacity: 0.65, duration: 2.2 + i, ease: "sine.inOut", repeat: -1, yoyo: true });
        });
        const pulse = q(".fx-pulse")[0];
        later(1.8, 3.6, () => gsap.fromTo(pulse, { scale: 0.86, opacity: 0.9 }, { scale: 1.16, opacity: 0, duration: 1.4, ease: "power2.out" }));
        // Chispas que caen en espiral hacia el portal.
        q(".fx-orb").forEach((o) => {
          const s = { t: 0 };
          const go = contextSafe(() => {
            const a0 = R(0, 360);
            const turns = R(0.6, 1.1);
            s.t = 0;
            gsap.to(s, {
              t: 1,
              duration: R(2.2, 3.6),
              delay: R(0, 1.4),
              ease: "power1.in",
              onUpdate() {
                const ang = ((a0 + s.t * turns * 360) * Math.PI) / 180;
                const rad = 49 - s.t * 7;
                gsap.set(o, { left: `${50 + Math.cos(ang) * rad}%`, top: `${50 + Math.sin(ang) * rad}%`, opacity: Math.sin(s.t * Math.PI), scale: 1 - s.t * 0.6 });
              },
              onComplete: go,
            });
          });
          go();
        });
      }

      if (kind === "glitch") {
        q(".fx-slice").forEach((s) =>
          later(0.35, 1.7, () => {
            gsap.set(s, { top: `${R(18, 82)}%`, height: `${R(3, 9)}%`, xPercent: R(-10, 10) });
            gsap.timeline().to(s, { opacity: 0.9, duration: 0.03 }).to(s, { xPercent: R(-14, 14), duration: 0.05 }).to(s, { opacity: 0.2, duration: 0.03 }).to(s, { opacity: 0.8, xPercent: R(-8, 8), duration: 0.04 }).to(s, { opacity: 0, duration: 0.05 });
          })
        );
      }

      if (kind === "electric") {
        const glow = q(".fx-glow")[0];
        const main = q<SVGPathElement>(".fx-bolt:not(.fx-bolt-branch)");
        const branch = q<SVGPathElement>(".fx-bolt-branch");
        main.forEach((path, i) =>
          later(0.45, 2.1, () => {
            const side = Math.floor(R(0, 4));
            const horizontal = side < 2;
            const base = side === 0 ? R(6, 10) : side === 1 ? R(90, 94) : side === 2 ? R(x0 + 1, x0 + 6) : R(x1 - 6, x1 - 1);
            const lo = horizontal ? x0 + 4 : 12;
            const hi = horizontal ? x1 - 4 : 88;
            const a = R(lo, hi - 30);
            const b = a + R(26, 46);
            const pts: [number, number][] = [];
            const steps = 8;
            for (let k = 0; k <= steps; k++) {
              const t = a + ((Math.min(b, hi) - a) * k) / steps;
              const j = k === 0 || k === steps ? 0 : R(-4.5, 4.5);
              pts.push(horizontal ? [t, base + j] : [base + j, t]);
            }
            const d = pts.map(([px, py], k) => `${k ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
            const [mx, my] = pts[Math.floor(R(2, 6))];
            const dir = horizontal ? [R(-5, 5), side === 0 ? R(5, 10) : -R(5, 10)] : [side === 2 ? R(5, 10) : -R(5, 10), R(-5, 5)];
            const bd = `M${mx.toFixed(1)} ${my.toFixed(1)} L${(mx + dir[0] * 0.5).toFixed(1)} ${(my + dir[1] * 0.5).toFixed(1)} L${(mx + dir[0]).toFixed(1)} ${(my + dir[1]).toFixed(1)}`;
            const br = branch[i];
            gsap.set(path, { attr: { d } });
            gsap.set(br, { attr: { d: bd } });
            gsap.timeline()
              .to([path, br], { opacity: 1, duration: 0.03 })
              .to([path, br], { opacity: 0.15, duration: 0.05 })
              .to([path, br], { opacity: 1, duration: 0.03 })
              .to([path, br], { opacity: 0, duration: R(0.2, 0.35), ease: "power2.in" });
            gsap.fromTo(glow, { opacity: 1 }, { opacity: 0.25, duration: 0.5, ease: "power2.out", overwrite: true });
          })
        );
      }

      // Solo animar cuando el marco es visible: listas largas no cuestan nada.
      const observer = new IntersectionObserver(([entry]) => {
        const paused = !entry.isIntersecting;
        gsap.getTweensOf(el.querySelectorAll("*")).forEach((t) => t.paused(paused));
        timers.forEach((t) => t.pause(paused));
      });
      observer.observe(el);
      return () => observer.disconnect();
    },
    { scope: root, dependencies: [kind, arte] }
  );

  // Con movimiento reducido no se lanza nada: los elementos son transparentes
  // por defecto y solo quedan los brillos base.
  return (
    <span ref={root} className="avatar-frame-fx" data-kind={kind} aria-hidden="true">
      <span className="fx-band">
        {kind === "shine" || kind === "crown" ? <i className="fx-sweep" /> : null}
        {kind === "cristal" || kind === "dust" || kind === "electric" ? <i className="fx-glow" /> : null}
        {kind === "halo" ? <i className="fx-rays" /> : null}
        {kind === "disco" ? <i className="fx-disco-beam" /> : null}
        {kind === "prisma" ? <i className="fx-prism" /> : null}
        {kind === "fire" ? <i className="fx-heat" /> : null}
        {kind === "glitch" ? idx(3).map((i) => <i key={i} className="fx-slice" />) : null}
      </span>
      <span className="fx-free">
        {kind === "cosmic" ? idx(2).map((i) => <i key={i} className="fx-comet"><i className="fx-comet-dot" /></i>) : null}
        {kind === "electric" && (
          <svg className="fx-bolts" viewBox="0 0 100 100" focusable="false">
            {idx(3).map((i) => <path key={`m${i}`} className="fx-bolt" d="M0 0" />)}
            {idx(3).map((i) => <path key={`b${i}`} className="fx-bolt fx-bolt-branch" d="M0 0" />)}
          </svg>
        )}
        {kind === "portal" && (
          <>
            <i className="fx-ring" />
            <i className="fx-ring" />
            <i className="fx-pulse" />
          </>
        )}
        {idx(n.free).map((i) => <i key={i} className={kind === "fire" ? "fx-ember" : kind === "portal" ? "fx-orb" : "fx-mote"} />)}
        {idx(n.stars).map((i) => <i key={`s${i}`} className="fx-star" />)}
      </span>
    </span>
  );
}
