"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";

type SitioCercano = { id: string; nombre: string; distancia_m: number };
type Fase = "inicial" | "buscando" | "eligiendo" | "nuevo" | "confirmado" | "omitido";

const ICONOS = ["📍", "🍺", "🍷", "🍸", "🥃", "🎉", "🏠", "⛺", "🌳", "🏖️"];

/**
 * Ofrece marcar el sitio de un registro (bebida suelta o SOJA) recién
 * creado — solo tiene sentido fuera de una noche: registrar_bebida_suelta
 * exige sala de tipo "permanente", y registrar_soja exige lo mismo cuando
 * no se le pasa una noche, así que este registroId siempre lo cumple. El
 * padre lo renderiza con `key={registroId}`, así que un registro nuevo lo
 * remonta entero con estado limpio (no hace falta reiniciarlo aquí).
 */
export default function SitioPicker({
  registroId,
  tipo = "bebida",
}: {
  registroId: string;
  tipo?: "bebida" | "soja";
}) {
  const rpcMarcar =
    tipo === "soja" ? "marcar_sitio_de_soja" : "marcar_sitio_de_registro";
  const supabase = createClient();
  const [fase, setFase] = useState<Fase>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [cercanos, setCercanos] = useState<SitioCercano[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsNuevo, setCoordsNuevo] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [iconoElegido, setIconoElegido] = useState(ICONOS[0]);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [nombreElegido, setNombreElegido] = useState("");
  const [guardando, setGuardando] = useState(false);

  const miniMapaRef = useRef<HTMLDivElement | null>(null);
  const miniMapaInstancia = useRef<LeafletMap | null>(null);
  const miniMarcador = useRef<LeafletMarker | null>(null);

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
    const { error } = await supabase.rpc(rpcMarcar, {
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
    const punto = coordsNuevo ?? coords;
    if (!punto || !nombreNuevo.trim()) return;
    setGuardando(true);
    setError(null);
    const { data: sitio, error: errorCrear } = await supabase.rpc("crear_sitio", {
      p_nombre: nombreNuevo.trim(),
      p_lat: punto.lat,
      p_lng: punto.lng,
      p_icono: iconoElegido,
    });
    if (errorCrear || !sitio) {
      setGuardando(false);
      setError(errorCrear?.message ?? "No se pudo crear el sitio.");
      return;
    }
    const { error: errorMarcar } = await supabase.rpc(rpcMarcar, {
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

  // Mapa con marcador arrastrable para ajustar el punto exacto del sitio
  // nuevo: no hace falta que quede justo donde te pilló el GPS. Usa un
  // divIcon propio (el icono por defecto de Leaflet depende de rutas de
  // imagen que el bundler de Next no resuelve, y sale como un recuadro
  // transparente).
  useEffect(() => {
    if (fase !== "nuevo" || !coords) return;
    let cancelado = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelado || !miniMapaRef.current || miniMapaInstancia.current) return;
      const mapa = L.map(miniMapaRef.current, {
        attributionControl: false,
      }).setView([coords.lat, coords.lng], 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapa);
      const icono = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#ffb627;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.4);">${iconoElegido}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marcador = L.marker([coords.lat, coords.lng], {
        draggable: true,
        icon: icono,
      }).addTo(mapa);
      marcador.on("dragend", () => {
        const pos = marcador.getLatLng();
        setCoordsNuevo({ lat: pos.lat, lng: pos.lng });
      });
      miniMapaInstancia.current = mapa;
      miniMarcador.current = marcador;
    })();
    return () => {
      cancelado = true;
      miniMapaInstancia.current?.remove();
      miniMapaInstancia.current = null;
      miniMarcador.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, coords]);

  // Actualiza el emoji del marcador cuando se cambia el icono elegido, sin
  // tener que recrear el mapa entero (que perdería la posición arrastrada).
  useEffect(() => {
    (async () => {
      const L = await import("leaflet");
      const marcador = miniMarcador.current;
      if (!marcador) return;
      marcador.setIcon(
        L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;border-radius:50%;background:#ffb627;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 6px rgba(0,0,0,0.4);">${iconoElegido}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
      );
    })();
  }, [iconoElegido]);

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
            onClick={() => {
              setCoordsNuevo(coords);
              setFase("nuevo");
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-cian/50 px-3 py-2 text-xs text-cian"
          >
            ➕ Es un sitio nuevo
          </button>
        </div>
      )}
      {fase === "nuevo" && (
        <form onSubmit={crearYElegir} className="flex flex-col gap-2">
          <div
            ref={miniMapaRef}
            className="h-40 w-full overflow-hidden rounded-lg border border-borde"
          />
          <p className="text-center text-[11px] text-texto2">
            Arrastra el marcador para ajustar el punto exacto
          </p>
          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del sitio (ej: Bar Pepe)"
            maxLength={60}
            className="w-full rounded-lg border border-borde bg-tarjeta px-3 py-2 text-xs text-texto placeholder-texto2 outline-none focus:border-ambar"
          />
          <div className="flex flex-wrap gap-1.5">
            {ICONOS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIconoElegido(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition active:scale-90 ${
                  iconoElegido === ic
                    ? "border-ambar bg-ambar/10"
                    : "border-borde"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
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
