"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { progresoNivel } from "@/lib/niveles";

const Celebracion = dynamic(() => import("./NivelCelebracionModal"), { ssr: false });

export default function NivelCelebracion({
  userId,
  nivelInicial,
}: {
  userId: string;
  nivelInicial: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const visto = useRef<number | null>(null);
  const [pendientes, setPendientes] = useState<number[]>([]);

  const comprobar = useCallback((nivel: number) => {
    if (visto.current === null) return;
    if (nivel <= visto.current) return;
    const nuevos = Array.from(
      { length: nivel - visto.current },
      (_, index) => visto.current! + index + 1
    );
    visto.current = nivel;
    try {
      window.localStorage.setItem(`nivel-visto:${userId}`, String(nivel));
    } catch {
      // La celebración de esta sesión sigue funcionando sin almacenamiento.
    }
    setPendientes((actuales) => [...actuales, ...nuevos]);
  }, [userId]);

  useEffect(() => {
    const clave = `nivel-visto:${userId}`;
    let guardado = 0;
    try {
      guardado = Number(window.localStorage.getItem(clave));
    } catch {
      // El navegador puede bloquear localStorage en modo privado.
    }
    visto.current = Number.isInteger(guardado) && guardado > 0
      ? guardado
      : nivelInicial;
    if (!guardado) {
      try { window.localStorage.setItem(clave, String(nivelInicial)); } catch { /* opcional */ }
    }
    comprobar(nivelInicial);
  }, [userId, comprobar, nivelInicial]);

  useEffect(() => {
    comprobar(nivelInicial);
  }, [nivelInicial, comprobar]);

  useEffect(() => {
    let activo = true;
    async function refrescar() {
      const { data } = await supabase
        .from("perfiles")
        .select("xp")
        .eq("id", userId)
        .maybeSingle();
      if (activo && data) comprobar(progresoNivel(data.xp ?? 0).nivel);
    }
    const canal = supabase
      .channel(`nivel-celebracion-${userId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "perfiles",
        filter: `id=eq.${userId}`,
      }, (evento) => {
        const xp = Number(evento.new.xp);
        if (Number.isFinite(xp)) comprobar(progresoNivel(xp).nivel);
      })
      .subscribe();
    window.addEventListener("focus", refrescar);
    void refrescar();
    return () => {
      activo = false;
      window.removeEventListener("focus", refrescar);
      void supabase.removeChannel(canal);
    };
  }, [supabase, userId, comprobar]);

  const nivel = pendientes[0];
  if (!nivel) return null;
  return createPortal(
    <Celebracion
      key={nivel}
      nivel={nivel}
      restantes={pendientes.length - 1}
      onContinuar={() => setPendientes((actuales) => actuales.slice(1))}
      onOmitir={() => setPendientes([])}
    />,
    document.body
  );
}
