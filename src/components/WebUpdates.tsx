"use client";

import { useEffect, useRef, useState } from "react";

export default function WebUpdates() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const reloading = useRef(false);

  useEffect(() => {
    // Development chunks change continuously; keep the worker production-only.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    let lastCheck = Date.now();
    const installed = () => {
      if (!disposed && registration?.waiting) setWaiting(registration.waiting);
    };
    const found = () => {
      installing?.removeEventListener("statechange", installed);
      installing = registration?.installing ?? null;
      installing?.addEventListener("statechange", installed);
    };
    const reload = () => {
      if (reloading.current) window.location.reload();
    };
    const check = () => {
      if (document.hidden || Date.now() - lastCheck < 60 * 60 * 1000) return;
      lastCheck = Date.now();
      void registration?.update().catch(() => {});
    };
    navigator.serviceWorker.addEventListener("controllerchange", reload);
    document.addEventListener("visibilitychange", check);
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((value) => {
      if (disposed) return;
      registration = value;
      installed();
      found();
      value.addEventListener("updatefound", found);
    }).catch(() => {
      // Private mode or blocked storage must not prevent normal web usage.
    });
    return () => {
      disposed = true;
      installing?.removeEventListener("statechange", installed);
      registration?.removeEventListener("updatefound", found);
      navigator.serviceWorker.removeEventListener("controllerchange", reload);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!waiting || dismissed) return null;
  return <aside role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-lg border border-cian bg-fondo p-3 text-sm text-texto shadow-lg">
    <span className="flex-1">Nueva version disponible</span>
    <button type="button" className="min-h-11 px-2 text-cian" onClick={() => {
      reloading.current = true;
      waiting.postMessage({ type: "SKIP_WAITING" });
    }}>Actualizar</button>
    <button type="button" className="min-h-11 px-2 text-texto2" onClick={() => setDismissed(true)}>Mas tarde</button>
  </aside>;
}
