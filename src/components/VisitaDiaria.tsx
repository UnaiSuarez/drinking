"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const fechaMadrid = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function VisitaDiaria({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const registrada = useRef<string | null>(null);
  const enCurso = useRef(false);

  useEffect(() => {
    registrada.current = null;
    async function registrar() {
      const hoy = fechaMadrid.format(new Date());
      if (registrada.current === hoy || enCurso.current) return;
      enCurso.current = true;
      const { error } = await supabase.rpc("registrar_visita_diaria");
      if (!error) registrada.current = hoy;
      enCurso.current = false;
    }

    function alVolver() {
      if (document.visibilityState === "visible") void registrar();
    }

    void registrar();
    window.addEventListener("focus", registrar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("focus", registrar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [supabase, userId]);

  return null;
}
