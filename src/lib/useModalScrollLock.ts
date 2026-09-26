"use client";

import { useEffect } from "react";

let activeLocks = 0;
let previousOverflow = "";
let previousRootOverflow = "";
let previousBodyStyles: Record<string, string> = {};
let scrollY = 0;
const lockedProperties = ["position", "top", "left", "width"] as const;

export function useModalScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (activeLocks === 0) {
      previousOverflow = document.body.style.overflow;
      previousRootOverflow = document.documentElement.style.overflow;
      scrollY = window.scrollY;
      previousBodyStyles = Object.fromEntries(lockedProperties.map((key) => [key, document.body.style[key]]));
      // Mobile browsers can still pan an overflow-hidden document. Freeze it
      // at its current position; only the modal's own scroller remains active.
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    activeLocks += 1;
    return () => {
      activeLocks -= 1;
      if (activeLocks === 0) {
        document.body.style.overflow = previousOverflow;
        document.documentElement.style.overflow = previousRootOverflow;
        lockedProperties.forEach((key) => { document.body.style[key] = previousBodyStyles[key]; });
        window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      }
    };
  }, [active]);
}
