"use client";

import { useSyncExternalStore } from "react";
import { useAnimationMode } from "@/components/AnimationPreferences";

const KEY = "frame-list-animations";
const EVENT = "frame-list-animations-change";
let sessionValue = false;
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(EVENT, notify);
  };
}
function snapshot() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return sessionValue; }
}
export function useFrameListAnimations() {
  const mode = useAnimationMode();
  const enabled = useSyncExternalStore(subscribe, snapshot, () => false);
  return mode !== "minimal" && enabled;
}
export default function FrameListAnimations() {
  const enabled = useFrameListAnimations();
  const mode = useAnimationMode();
  return <label className="mb-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-texto2">
    <input type="checkbox" disabled={mode === "minimal"} checked={enabled} onChange={(event) => {
      sessionValue = event.target.checked;
      try {
        localStorage.setItem(KEY, event.target.checked ? "on" : "off");
      } catch { /* The preference still works for this session. */ }
      window.dispatchEvent(new Event(EVENT));
    }} className="h-5 w-5 accent-cyan-400" />
    Animaciones en la lista
  </label>;
}
