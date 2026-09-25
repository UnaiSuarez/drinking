"use client";

import { useEffect, useRef } from "react";

export type AvatarElement = "fire" | "lightning" | "ice" | "light" | "portal";

export default function AvatarElementalEffect({ element }: { element: AvatarElement }) {
  const fireRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (element !== "fire" || !fireRef.current) return;
    const canvas = fireRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastDraw = 0;
    const particles = Array.from({ length: 46 }, (_, index) => ({
      side: index % 2,
      offset: (index * 0.61803398875) % 1,
      speed: 0.25 + ((index * 0.381966) % 1) * 0.45,
      radius: 9 + ((index * 0.754877) % 1) * 17,
    }));

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(time: number) {
      if (!reducedMotion && time - lastDraw < 33) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastDraw = time;
      context!.clearRect(0, 0, width, height);
      particles.forEach((particle, index) => {
        const progress = reducedMotion ? particle.offset : (particle.offset + time * 0.00015 * particle.speed) % 1;
        const xBase = particle.side ? width * 0.85 : width * 0.15;
        const x = xBase + Math.sin(progress * 7 + index) * width * 0.085;
        const y = height * (0.92 - progress * 0.74);
        const radius = particle.radius * (0.65 + (1 - progress) * 0.8);
        context!.save();
        context!.translate(x, y);
        context!.scale(0.65, 1.65);
        const glow = context!.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, `rgba(255, 232, 126, ${0.75 * (1 - progress)})`);
        glow.addColorStop(0.38, `rgba(255, 94, 25, ${0.58 * (1 - progress)})`);
        glow.addColorStop(1, "rgba(255, 46, 20, 0)");
        context!.fillStyle = glow;
        context!.beginPath();
        context!.arc(0, 0, radius, 0, Math.PI * 2);
        context!.fill();
        context!.restore();
      });
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    }

    resize();
    draw(0);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [element]);

  return (
    <span className={`avatar-elemental avatar-elemental-${element}`} aria-hidden="true">
      {element === "fire" && (
        <>
          <canvas className="avatar-elemental-fire-canvas" ref={fireRef} />
          <svg className="avatar-elemental-fire-shapes" viewBox="0 0 320 320" preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id="avatar-fire-gradient" x1="0" y1="1" x2="0" y2="0">
                <stop stopColor="#ffb627" stopOpacity="0.82" />
                <stop offset="0.55" stopColor="#ff5b1a" stopOpacity="0.7" />
                <stop offset="1" stopColor="#ff5b1a" stopOpacity="0.38" />
              </linearGradient>
            </defs>
            <path d="M46 291 C13 261 26 211 49 177 C45 211 67 207 66 161 C101 204 96 241 78 270 C102 250 104 221 108 211 C125 259 102 288 46 291Z" />
            <path d="M274 291 C307 261 294 211 271 177 C275 211 253 207 254 161 C219 204 224 241 242 270 C218 250 216 221 212 211 C195 259 218 288 274 291Z" />
          </svg>
        </>
      )}
      {element === "ice" && Array.from({ length: 6 }, (_, index) => (
        <span className="avatar-elemental-shard" key={index} />
      ))}
      {element === "lightning" && (
        <svg viewBox="0 0 320 320" preserveAspectRatio="none" focusable="false">
          <path d="M46 22 78 54 57 71 89 94 68 124 M266 18 236 54 255 72 226 102 247 133 M35 229 72 205 59 184 93 165 M282 218 246 198 259 178 229 155" />
        </svg>
      )}
      {element === "light" && <><span className="avatar-elemental-beam" /><span className="avatar-elemental-beam" /></>}
      {element === "portal" && <><span className="avatar-elemental-ring" /><span className="avatar-elemental-ring" /></>}
    </span>
  );
}
