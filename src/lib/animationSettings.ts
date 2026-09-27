export type AnimationMode = "full" | "balanced" | "minimal";
export const ANIMATION_KEY = "ranking-animation-mode-v1";
export const ANIMATION_EVENT = "ranking-animation-change";
let fallback: AnimationMode | null = null;
const listeners = new Set<() => void>();
let disconnect: (() => void) | undefined;

export function savedAnimationMode(): AnimationMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(ANIMATION_KEY);
    return value === "full" || value === "balanced" || value === "minimal" ? value : fallback;
  } catch { return fallback; }
}

export function animationMode(): AnimationMode {
  if (typeof window === "undefined") return "minimal";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "minimal";
  return savedAnimationMode() ?? "balanced";
}

export function saveAnimationMode(mode: AnimationMode) {
  fallback = mode;
  try { localStorage.setItem(ANIMATION_KEY, mode); } catch { /* Session fallback. */ }
  try { localStorage.setItem("frame-list-animations", mode === "minimal" ? "off" : "on"); } catch { /* Session fallback. */ }
  window.dispatchEvent(new Event("frame-list-animations-change"));
  document.documentElement.dataset.animationMode = animationMode();
  window.dispatchEvent(new Event(ANIMATION_EVENT));
}

export function subscribeAnimations(notify: () => void) {
  listeners.add(notify);
  if (!disconnect) {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => listeners.forEach((listener) => listener());
    window.addEventListener("storage", update);
    window.addEventListener(ANIMATION_EVENT, update);
    media.addEventListener("change", update);
    disconnect = () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(ANIMATION_EVENT, update);
      media.removeEventListener("change", update);
    };
  }
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) { disconnect?.(); disconnect = undefined; }
  };
}
