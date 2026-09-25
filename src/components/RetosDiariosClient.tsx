"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { COFRES_TIPOS } from "@/lib/cofresDesign";

type EstadoDiario = {
  dia: string;
  visita: boolean;
  actividad: boolean;
  reclamado: boolean;
};

const cofreComun = COFRES_TIPOS.find((cofre) => cofre.id === "comun")!;

export default function RetosDiariosClient() {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<EstadoDiario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reclamando, setReclamando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    const { error: visitaError } = await supabase.rpc("registrar_visita_diaria");
    if (visitaError) {
      setMensaje(`No se pudo registrar la visita: ${visitaError.message}`);
      setCargando(false);
      return;
    }
    const { data, error } = await supabase.rpc("estado_reto_diario");
    if (error) setMensaje(`No se pudieron cargar los retos: ${error.message}`);
    else setEstado((data?.[0] as EstadoDiario | undefined) ?? null);
    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    const inicio = window.setTimeout(() => void refrescar(), 0);
    const alVolver = () => { if (document.visibilityState === "visible") void refrescar(); };
    window.addEventListener("focus", alVolver);
    return () => {
      window.clearTimeout(inicio);
      window.removeEventListener("focus", alVolver);
    };
  }, [refrescar]);

  async function reclamar() {
    setReclamando(true);
    setMensaje(null);
    const { error } = await supabase.rpc("reclamar_reto_diario");
    setReclamando(false);
    if (error) {
      setMensaje(`No se pudo reclamar: ${error.message}`);
      await refrescar();
      return;
    }
    setEstado((actual) => actual ? { ...actual, reclamado: true } : actual);
    setMensaje("Cofre común añadido a tu inventario.");
  }

  const completo = !!estado?.visita && !!estado?.actividad;

  return (
    <section className="space-y-4" aria-label="Retos diarios">
      <p className="text-sm text-texto2">Se reinician cada día a medianoche, hora de Madrid. Una SOJA cuenta como actividad.</p>
      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="flex items-center gap-4">
          <Image src={cofreComun.imagen} alt="" width={64} height={64} className="h-16 w-16 shrink-0 object-contain" />
          <div className="min-w-0">
            <h2 className="font-titulo text-lg text-texto">Cofre del día</h2>
            <p className="text-xs text-texto2">Completa los dos pasos para recibir un cofre común.</p>
          </div>
        </div>
        <ol className="mt-4 space-y-2">
          <li className="flex items-center justify-between gap-3 border-t border-borde pt-3 text-sm">
            <span className="min-w-0">Entrar en la app</span>
            <span className={`shrink-0 ${estado?.visita ? "text-lima" : "text-texto2"}`}>{estado?.visita ? "Hecho" : "Pendiente"}</span>
          </li>
          <li className="flex items-center justify-between gap-3 border-t border-borde pt-3 text-sm">
            <span className="min-w-0">Registrar una bebida o SOJA</span>
            <span className={`shrink-0 ${estado?.actividad ? "text-lima" : "text-texto2"}`}>{estado?.actividad ? "Hecho" : "Pendiente"}</span>
          </li>
        </ol>
        {estado?.reclamado ? (
          <Link href="/inventario" className="mt-5 block text-center text-sm font-bold text-lima underline underline-offset-4">Cofre reclamado · Ver inventario</Link>
        ) : (
          <button type="button" onClick={reclamar} disabled={!completo || reclamando || cargando} className="mt-5 min-h-12 w-full rounded-lg bg-ambar px-4 font-titulo text-fondo disabled:cursor-not-allowed disabled:opacity-50">
            {reclamando ? "Entregando..." : "Reclamar cofre común"}
          </button>
        )}
      </div>
      {cargando && <p className="text-center text-sm text-texto2">Comprobando el progreso...</p>}
      {mensaje && <p role="status" className="text-center text-sm text-cian">{mensaje}</p>}
    </section>
  );
}
