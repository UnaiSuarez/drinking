"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";

export type SitioMapa = {
  sitioId: string;
  nombre: string;
  lat: number;
  lng: number;
  tipo: "tuyo" | "amigo" | "ambos";
  icono: string;
  creadoPor: string | null;
  descubridorNombre: string | null;
};

type FilaDetalle = {
  usuario_id: string;
  nombre: string;
  bebida_icono: string;
  bebida_nombre: string;
  cantidad: number;
  ultima: string;
};

type PersonaDetalle = {
  usuarioId: string;
  nombre: string;
  bebidas: { icono: string; nombre: string; cantidad: number }[];
  total: number;
};

const COLOR_TIPO: Record<SitioMapa["tipo"], string> = {
  tuyo: "#ffb627",
  amigo: "#4fd8e0",
  ambos: "#b6ff3c",
};

type Filtro = "todos" | "tuyo" | "amigo";

export default function MapaSitiosClient({
  sitiosIniciales,
  userId,
}: {
  sitiosIniciales: SitioMapa[];
  userId: string;
}) {
  const supabase = createClient();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapaInstancia = useRef<LeafletMap | null>(null);
  const capaMarcadores = useRef<LayerGroup | null>(null);

  const [sitios, setSitios] = useState(sitiosIniciales);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [seleccionado, setSeleccionado] = useState<SitioMapa | null>(null);
  const [detalle, setDetalle] = useState<PersonaDetalle[] | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  const visibles = sitios.filter((s) => {
    if (filtro === "todos") return true;
    if (filtro === "tuyo") return s.tipo === "tuyo" || s.tipo === "ambos";
    return s.tipo === "amigo" || s.tipo === "ambos";
  });
  const idsVisibles = visibles.map((s) => `${s.sitioId}:${s.icono}`).join(",");

  async function borrarSitio(sitio: SitioMapa) {
    setBorrando(true);
    setErrorBorrar(null);
    const { error } = await supabase.rpc("eliminar_sitio", {
      p_sitio_id: sitio.sitioId,
    });
    setBorrando(false);
    if (error) {
      setErrorBorrar(error.message);
      return;
    }
    setSitios((prev) => prev.filter((s) => s.sitioId !== sitio.sitioId));
    setSeleccionado(null);
  }

  async function abrirSitio(sitio: SitioMapa) {
    setSeleccionado(sitio);
    setDetalle(null);
    setCargandoDetalle(true);
    const { data, error } = await supabase.rpc("detalle_sitio", {
      p_sitio_id: sitio.sitioId,
    });
    setCargandoDetalle(false);
    if (error || !data) return;

    const porPersona = new Map<string, PersonaDetalle>();
    for (const fila of data as FilaDetalle[]) {
      const actual = porPersona.get(fila.usuario_id) ?? {
        usuarioId: fila.usuario_id,
        nombre: fila.usuario_id === userId ? "Tú" : fila.nombre,
        bebidas: [],
        total: 0,
      };
      actual.bebidas.push({
        icono: fila.bebida_icono,
        nombre: fila.bebida_nombre,
        cantidad: Number(fila.cantidad),
      });
      actual.total += Number(fila.cantidad);
      porPersona.set(fila.usuario_id, actual);
    }
    setDetalle(
      [...porPersona.values()].sort((a, b) =>
        a.usuarioId === userId ? -1 : b.usuarioId === userId ? 1 : b.total - a.total
      )
    );
  }

  // Crea el mapa una vez; se limpia al desmontar el componente.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelado || !mapRef.current || mapaInstancia.current) return;
      const centro: [number, number] =
        sitiosIniciales.length > 0
          ? [
              sitiosIniciales.reduce((acc, s) => acc + s.lat, 0) / sitiosIniciales.length,
              sitiosIniciales.reduce((acc, s) => acc + s.lng, 0) / sitiosIniciales.length,
            ]
          : [40.4168, -3.7038];
      const mapa = L.map(mapRef.current).setView(centro, sitiosIniciales.length > 0 ? 13 : 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa);
      mapaInstancia.current = mapa;
      capaMarcadores.current = L.layerGroup().addTo(mapa);
    })();
    return () => {
      cancelado = true;
      mapaInstancia.current?.remove();
      mapaInstancia.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repinta los marcadores cuando cambia el filtro (o llegan sitios nuevos).
  useEffect(() => {
    (async () => {
      const L = await import("leaflet");
      const capa = capaMarcadores.current;
      if (!capa) return;
      capa.clearLayers();
      for (const sitio of visibles) {
        const icono = L.divIcon({
          className: "",
          html: `<div style="width:30px;height:30px;border-radius:50%;background:${COLOR_TIPO[sitio.tipo]};display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;border:2px solid rgba(255,255,255,0.85);box-shadow:0 2px 6px rgba(0,0,0,0.4);">${sitio.icono}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        const marcador = L.marker([sitio.lat, sitio.lng], { icon: icono }).addTo(capa);
        marcador.on("click", () => abrirSitio(sitio));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsVisibles]);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["todos", "tuyo", "amigo"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex-1 rounded-full border py-2 text-xs font-semibold transition active:scale-95 ${
              filtro === f
                ? "border-ambar bg-ambar/10 text-ambar"
                : "border-borde text-texto2"
            }`}
          >
            {f === "todos" ? "Todos" : f === "tuyo" ? "🙋 Tuyos" : "👥 Amigos"}
          </button>
        ))}
      </div>

      <div
        ref={mapRef}
        className="h-80 w-full overflow-hidden rounded-2xl border border-borde"
      />

      <div className="mt-3 flex gap-4 text-[11px] text-texto2">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: COLOR_TIPO.tuyo }}
          />
          Tuyos
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: COLOR_TIPO.amigo }}
          />
          Amigos
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: COLOR_TIPO.ambos }}
          />
          Ambos
        </span>
      </div>

      {sitios.length === 0 && (
        <p className="mt-4 rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          Todavía no has marcado ningún sitio. Se hace al registrar una
          bebida en sala permanente.
        </p>
      )}

      {seleccionado && (
        <div className="mt-4 rounded-2xl border border-borde bg-tarjeta p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-titulo text-base text-texto">
              {seleccionado.icono} {seleccionado.nombre}
            </p>
            <button
              onClick={() => setSeleccionado(null)}
              className="text-texto2"
            >
              ✕
            </button>
          </div>
          {seleccionado.descubridorNombre && (
            <p className="mb-3 text-xs text-texto2">
              Descubierto por{" "}
              {seleccionado.creadoPor === userId
                ? "ti"
                : seleccionado.descubridorNombre}
            </p>
          )}
          {cargandoDetalle ? (
            <p className="text-xs text-texto2">Cargando…</p>
          ) : detalle && detalle.length > 0 ? (
            <div className="space-y-3">
              {detalle.map((p) => (
                <div
                  key={p.usuarioId}
                  className="border-t border-borde pt-2 first:border-t-0 first:pt-0"
                >
                  <p className="mb-1 text-xs font-semibold text-texto">
                    {p.nombre}{" "}
                    <span className="font-normal text-texto2">
                      · {p.total} bebidas
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.bebidas.map((b, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-borde bg-fondo px-2 py-1 text-[11px] text-texto"
                      >
                        {b.icono} {b.nombre} ×{b.cantidad}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-texto2">Sin datos.</p>
          )}
          {seleccionado.creadoPor === userId && (
            <div className="mt-3 border-t border-borde pt-3">
              {errorBorrar && (
                <p className="mb-2 text-xs text-rosa">{errorBorrar}</p>
              )}
              <button
                onClick={() => borrarSitio(seleccionado)}
                disabled={borrando}
                className="w-full rounded-lg border border-rosa/50 py-2 text-xs text-rosa disabled:opacity-50"
              >
                {borrando ? "Borrando…" : "🗑️ Borrar este sitio"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
