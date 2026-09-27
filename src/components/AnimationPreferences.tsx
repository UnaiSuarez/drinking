"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { MotionConfig } from "motion/react";
import { animationMode, savedAnimationMode, saveAnimationMode, subscribeAnimations, type AnimationMode } from "@/lib/animationSettings";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export function useAnimationMode() {
  return useSyncExternalStore(subscribeAnimations, animationMode, () => "minimal" as const);
}

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const mode = useAnimationMode();
  useEffect(() => { document.documentElement.dataset.animationMode = mode; }, [mode]);
  return <MotionConfig reducedMotion={mode === "full" ? "user" : "always"}>{children}</MotionConfig>;
}

const modes: { value: AnimationMode; title: string; detail: string }[] = [
  { value: "minimal", title: "Mínimo", detail: "Sin efectos decorativos. Apertura y giro sencillo de cartas. Menor consumo." },
  { value: "balanced", title: "Equilibrado", detail: "Efectos suaves y breves, sin partículas ni temblores. Recomendado para móvil." },
  { value: "full", title: "Completo", detail: "Todos los efectos. Para dispositivos potentes; consume más batería." },
];

export default function AnimationPreferences({ welcome = false }: { welcome?: boolean }) {
  const saved = useSyncExternalStore(subscribeAnimations, savedAnimationMode, () => null);
  const hydrated = useSyncExternalStore(subscribeAnimations, () => true, () => false);
  const [draft, setDraft] = useState<AnimationMode>("balanced");
  const open = welcome && hydrated && saved === null;
  const first = useRef<HTMLButtonElement>(null);
  useModalScrollLock(open);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);
  const content = <>
    <h2 className="font-titulo text-xl">{welcome ? "¿Cómo quieres las animaciones?" : "Animaciones y rendimiento"}</h2>
    <p className="mt-2 text-sm text-texto2">Elige según tu móvil. Puedes cambiarlo en Ajustes. Se guarda en este dispositivo y respeta el movimiento reducido del sistema.</p>
    <fieldset className="mt-4 space-y-3">
      <legend className="sr-only">Modo de animaciones</legend>
      {modes.map((item) => <label key={item.value} className="flex cursor-pointer gap-3 rounded-lg border border-borde p-3">
        <input type="radio" name={welcome ? "welcome-animation" : "settings-animation"} value={item.value} checked={(welcome ? draft : saved ?? "balanced") === item.value}
          onChange={() => welcome ? setDraft(item.value) : saveAnimationMode(item.value)} className="mt-1 h-5 w-5 shrink-0 accent-cyan-400" />
        <span><strong className="block">{item.title}</strong><span className="text-sm text-texto2">{item.detail}</span></span>
      </label>)}
    </fieldset>
    {welcome && <button ref={first} onClick={() => saveAnimationMode(draft)} className="mt-5 min-h-11 w-full rounded-lg bg-cian px-4 font-titulo text-fondo">Guardar y continuar</button>}
  </>;
  if (!welcome) return <section className="border-b border-borde py-6">{content}</section>;
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-fondo/95 p-5">
    <div role="dialog" aria-modal="true" aria-label="Preferencias de animación" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input:checked, button'));
      const target = event.shiftKey ? controls[controls.length - 1] : controls[0];
      if ((!event.shiftKey && document.activeElement === controls[controls.length - 1]) || (event.shiftKey && document.activeElement === controls[0])) {
        event.preventDefault(); target?.focus();
      }
    }} className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-lg border border-borde bg-tarjeta p-5">{content}</div>
  </div>, document.body);
}
