"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SitioCercano = { id: string; nombre: string; distancia_m: number };
type Fase = "inicial" | "buscando" | "eligiendo" | "nuevo" | "confirmado" | "omitido";

/**
 * Ofrece marcar el sitio de un registro de bebida suelta recién creado
 * (solo tiene sentido en sala permanente: registrar_bebida_suelta exige
 * sala de tipo "permanente", así que este registroId siempre lo cumple).
 * El padre lo renderiza con `key={registroId}`, así que un registro nuevo
 * lo remonta entero con estado limpio (no hace falta reiniciarlo aquí).
 */
export default function SitioPicker({ registroId }: { registroId: string }) {
  const supabase = createClient();
  const [fase, setFase] = useState<Fase>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [cercanos, setCercanos] = useState<SitioCercano[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [nombreElegido, setNombreElegido] = useState("");
  const [guardando, setGuardando] = useState(false);

  function empezar() {
    if (!navigator.geolocation) {
      setError("Este dispositivo no permite geolocalización.");
      return;
    }
    setFase("buscando");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const { data, error } = await supabase.rpc("sitios_cercanos", {
          p_lat: lat,
          p_lng: lng,
          p_radio_metros: 150,
        });
        if (error) {
          setError("No se pudieron buscar sitios cercanos.");
          setFase("inicial");
          return;
        }
        setCercanos(data ?? []);
        setFase("eligiendo");
      },
      () => {
        setError("No se pudo acceder a tu ubicación.");
        setFase("inicial");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function elegirExistente(sitio: SitioCercano) {
    setGuardando(true);
    setError(null);
    const { error } = await supabase.rpc("marcar_sitio_de_registro", {
      p_registro_id: registroId,
      p_sitio_id: sitio.id,
    });
    setGuardando(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNombreElegido(sitio.nombre);
    setFase("confirmado");
  }

  async function crearYElegir(e: React.FormEvent) {
    e.preventDefault();
    if (!coords || !nombreNuevo.trim()) return;
    setGuardando(true);
    setError(null);
    const { data: sitio, error: errorCrear } = await supabase.rpc("crear_sitio", {
      p_nombre: nombreNuevo.trim(),
      p_lat: coords.lat,
      p_lng: coords.lng,
    });
    if (errorCrear || !sitio) {
      setGuardando(false);
      setError(errorCrear?.message ?? "No se pudo crear el sitio.");
      return;
    }
    const { error: errorMarcar } = await supabase.rpc("marcar_sitio_de_registro", {
      p_registro_id: registroId,
      p_sitio_id: sitio.id,
    });
    setGuardando(false);
    if (errorMarcar) {
      setError(errorMarcar.message);
      return;
    }
    setNombreElegido(sitio.nombre);
    setFase("confirmado");
  }

  if (fase === "confirmado") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-lima/50 bg-lima/10 px-3 py-2 text-xs text-lima">
        ✅ Marcado en {nombreElegido}
      </div>
    );
  }

  if (fase === "omitido") return null;

  if (fase === "inicial") {
    return (
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-borde px-3 py-2">
        <button onClick={empezar} className="text-xs font-semibold text-ambar">
          📍 ¿Dónde estás? (opcional)
        </button>
        <button
          onClick={() => setFase("omitido")}
          className="text-xs text-texto2 underline"
        >
          Ahora no
        </button>
      </div>
    );
  }

  if (fase === "buscando") {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-borde px-3 py-2 text-xs text-texto2">
        Buscando sitios cercanos…
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-borde bg-fondo p-3">
      {error && <p className="mb-2 text-xs text-rosa">{error}</p>}
      {fase === "eligiendo" && (
        <div className="space-y-1.5">
          {cercanos.map((s) => (
            <button
              key={s.id}
              onClick={() => elegirExistente(s)}
              disabled={guardando}
              className="flex w-full items-center justify-between rounded-lg border border-borde px-3 py-2 text-left text-xs text-texto disabled:opacity-50"
            >
              <span>{s.nombre}</span>
              <span className="text-texto2">{Math.round(s.distancia_m)} m</span>
            </button>
          ))}
          <button
            onClick={() => setFase("nuevo")}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-cian/50 px-3 py-2 text-xs text-cian"
          >
            ➕ Es un sitio nuevo, aquí mismo
          </button>
        </div>
      )}
      {fase === "nuevo" && (
        <form onSubmit={crearYElegir} className="flex flex-col gap-2">
          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del sitio (ej: Bar Pepe)"
            maxLength={60}
            className="w-full rounded-lg border border-borde bg-tarjeta px-3 py-2 text-xs text-texto placeholder-texto2 outline-none focus:border-ambar"
          />
          <button
            type="submit"
            disabled={guardando || nombreNuevo.trim().length < 2}
            className="w-full rounded-lg bg-ambar py-2 text-xs font-semibold text-fondo disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Crear y marcar aquí"}
          </button>
        </form>
      )}
    </div>
  );
}
