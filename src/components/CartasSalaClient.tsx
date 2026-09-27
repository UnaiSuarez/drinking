"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CARTAS_COFRES, type CartaCofre } from "@/lib/cofresDesign";
import CartaArte from "@/components/CartaArte";

type EventoCarta = { carta_id: string; objetivo_id: string | null };
type CartaDelObjetivo = { id: string; nombre: string; cantidad: number };

const CARTAS_SALA = CARTAS_COFRES.filter((c) => c.contexto === "sala");
const CARTAS_ROBABLES = CARTAS_COFRES.filter((c) => c.rareza === "comun" || c.rareza === "rara");

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export default function CartasSalaClient({
  salaId,
  userId,
  miembros,
}: {
  salaId: string;
  userId: string;
  miembros: { id: string; nombre: string }[];
}) {
  const supabase = createClient();
  const [cartas, setCartas] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [objetivos, setObjetivos] = useState<Record<string, string>>({});
  const [apuesta, setApuesta] = useState("10");
  const [regalo, setRegalo] = useState("10");
  const [cartaRobada, setCartaRobada] = useState("");
  const [cartasDelObjetivo, setCartasDelObjetivo] = useState<CartaDelObjetivo[]>([]);
  const [cargandoObjetivo, setCargandoObjetivo] = useState(false);
  const [cartaDuplicada, setCartaDuplicada] = useState("");
  const [espionaje, setEspionaje] = useState<{ nombre: string; cartas: Record<string, number> } | null>(null);

  const cargar = useCallback(async () => {
    const { data: perfil } = await supabase.from("perfiles").select("avatar_config").eq("id", userId).single();
    const inventario = objetoConfig(objetoConfig(perfil?.avatar_config).inventario);
    const cartasInv = (inventario.cartas as Record<string, number> | undefined) ?? {};
    setCartas(cartasInv);
    setCargando(false);
  }, [supabase, userId]);

  useEffect(() => {
    const t = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(t);
  }, [cargar]);

  // Si alguien te roba una carta (Chuleta), tu inventario cambia sin que tú
  // hagas nada: hay que refrescarlo sin esperar a que actúes.
  useEffect(() => {
    const canal = supabase
      .channel(`cartas-inventario-${salaId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos_carta_sala", filter: `sala_id=eq.${salaId}` },
        (payload) => {
          const evento = payload.new as EventoCarta;
          if (evento.objetivo_id === userId) void cargar();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, salaId, userId, cargar]);

  const misCartas = useMemo(
    () => CARTAS_SALA.filter((carta) => (cartas[carta.id] ?? 0) > 0),
    [cartas]
  );
  const cartasPropiasDuplicables = useMemo(
    () =>
      CARTAS_COFRES.filter(
        (carta) =>
          (carta.rareza === "comun" || carta.rareza === "rara") &&
          carta.contexto !== "sala" &&
          (cartas[carta.id] ?? 0) > 0
      ),
    [cartas]
  );
  const otrosMiembros = miembros.filter((m) => m.id !== userId);

  async function elegirObjetivo(cartaId: string, objetivoId: string) {
    setObjetivos((actual) => ({ ...actual, [cartaId]: objetivoId }));
    if (cartaId !== "chuleta") return;
    setCartaRobada("");
    setCartasDelObjetivo([]);
    if (!objetivoId) return;
    setCargandoObjetivo(true);
    const { data } = await supabase.from("perfiles").select("avatar_config").eq("id", objetivoId).single();
    const inventario = objetoConfig(objetoConfig(data?.avatar_config).inventario);
    const cartasObjetivo = (inventario.cartas as Record<string, number> | undefined) ?? {};
    const robables = CARTAS_ROBABLES.filter((c) => (cartasObjetivo[c.id] ?? 0) > 0).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      cantidad: cartasObjetivo[c.id] ?? 0,
    }));
    setCartasDelObjetivo(robables);
    setCargandoObjetivo(false);
  }

  async function usar(carta: CartaCofre) {
    if (ocupada) return;
    setOcupada(carta.id);
    setMensaje(null);
    setEspionaje(null);
    const objetivo = objetivos[carta.id];
    let resultado: { data: unknown; error: { message: string } | null };
    switch (carta.id) {
      case "ronda-pagada":
        resultado = await supabase.rpc("usar_carta_pendiente_sala", { p_sala: salaId, p_carta_id: carta.id, p_objetivo: objetivo });
        break;
      case "ronda-extra":
      case "confesion-de-barra":
      case "copa-doble":
      case "autografo":
      case "ronda-de-la-noche":
      case "cazador-de-rarezas":
      case "cata-a-ciegas":
        resultado = await supabase.rpc("usar_carta_pendiente_sala", { p_sala: salaId, p_carta_id: carta.id });
        break;
      case "chuleta":
        resultado = await supabase.rpc("usar_chuleta_sala", { p_sala: salaId, p_objetivo: objetivo, p_carta_robada: cartaRobada });
        break;
      case "regalo-anonimo":
        resultado = await supabase.rpc("usar_regalo_anonimo_sala", { p_sala: salaId, p_objetivo: objetivo, p_cantidad: Number(regalo) || 0 });
        break;
      case "espia-de-barra":
        resultado = await supabase.rpc("usar_espia_barra_sala", { p_sala: salaId, p_objetivo: objetivo });
        break;
      case "chapa-doble-o-nada":
        resultado = await supabase.rpc("usar_chapa_doble_sala", { p_sala: salaId, p_apuesta: Number(apuesta) || 0 });
        break;
      case "duplicado-expres":
        resultado = await supabase.rpc("usar_duplicado_expres_sala", { p_sala: salaId, p_carta_objetivo: cartaDuplicada });
        break;
      case "fiebre-de-sala":
        resultado = await supabase.rpc("usar_fiebre_sala", { p_sala: salaId });
        break;
      case "barra-libre-para-todos":
        resultado = await supabase.rpc("usar_barra_libre_sala", { p_sala: salaId });
        break;
      default:
        setOcupada(null);
        return;
    }
    const { data, error } = resultado;
    if (error) {
      setMensaje(`Error: ${error.message}`);
    } else {
      if (carta.id === "espia-de-barra" && data && typeof data === "object") {
        const nombre = miembros.find((m) => m.id === objetivo)?.nombre ?? "ese jugador";
        setEspionaje({ nombre, cartas: ((data as { cartas?: Record<string, number> }).cartas) ?? {} });
      } else if (carta.id === "chapa-doble-o-nada" && data && typeof data === "object") {
        const gana = (data as { gana?: boolean }).gana;
        setMensaje(gana ? "¡Cara! Chapas duplicadas." : "Cruz... chapas perdidas.");
      } else if (carta.id === "chuleta") {
        setCartaRobada("");
        setCartasDelObjetivo([]);
        setMensaje("Hecho ✓");
      } else {
        setMensaje("Hecho ✓");
      }
      await cargar();
    }
    setOcupada(null);
  }

  if (cargando) return null;

  return (
    <section className="mb-8">
      <details className="group rounded-2xl border border-borde bg-tarjeta">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-titulo text-xl text-texto">
          🎴 Cartas de sala ({misCartas.length})
          <span aria-hidden="true" className="text-base text-texto2 transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-borde p-4 pt-3">
          {mensaje && (
            <p role="status" className="mb-3 rounded-xl bg-fondo px-3 py-2 text-sm text-cian">{mensaje}</p>
          )}
          {espionaje && (
            <div className="mb-3 rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-texto">
              <p className="mb-1 font-titulo text-cian">Cartas de {espionaje.nombre}:</p>
              {Object.entries(espionaje.cartas).filter(([, n]) => n > 0).length === 0 ? (
                <p className="text-texto2">No tiene ninguna.</p>
              ) : (
                <ul className="space-y-0.5">
                  {Object.entries(espionaje.cartas).filter(([, n]) => n > 0).map(([id, n]) => (
                    <li key={id}>{CARTAS_COFRES.find((c) => c.id === id)?.nombre ?? id} x{n}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {misCartas.length === 0 ? (
            <p className="text-sm text-texto2">
              Aún no tienes cartas de sala. Se consiguen en cofres, igual que las demás.
            </p>
          ) : (
            <ul className="space-y-3">
              {misCartas.map((carta) => {
                const cantidad = cartas[carta.id] ?? 0;
                const necesitaObjetivo = carta.alcance === "objetivo";
                const objetivoElegido = objetivos[carta.id] ?? "";
                const esChuleta = carta.id === "chuleta";
                const listoParaUsar =
                  !necesitaObjetivo ||
                  (Boolean(objetivoElegido) && objetivoElegido !== userId && (!esChuleta || Boolean(cartaRobada)));
                return (
                  <li key={carta.id} className="rounded-xl border border-borde bg-fondo/60 p-3">
                    <div className="flex gap-3">
                      <CartaArte
                        imagen={carta.imagen}
                        icono={carta.icono}
                        rareza={carta.rareza}
                        alt={carta.nombre}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        sizes="56px"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="font-titulo text-sm text-texto">{carta.nombre}</p>
                          <span className="rounded-full bg-tarjeta px-2 py-0.5 font-titulo text-xs text-ambar">x{cantidad}</span>
                        </div>
                        <p className="text-[11px] leading-snug text-texto2">{carta.efecto}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {necesitaObjetivo && (
                        <select
                          value={objetivoElegido}
                          onChange={(event) => void elegirObjetivo(carta.id, event.target.value)}
                          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                        >
                          <option value="">Elige a quién...</option>
                          {otrosMiembros.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      )}
                      {esChuleta && objetivoElegido && (
                        cargandoObjetivo ? (
                          <p className="text-xs text-texto2">Mirando qué tiene...</p>
                        ) : cartasDelObjetivo.length === 0 ? (
                          <p className="text-xs text-texto2">Ese jugador no tiene ninguna carta que se pueda robar.</p>
                        ) : (
                          <select
                            value={cartaRobada}
                            onChange={(event) => setCartaRobada(event.target.value)}
                            className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                          >
                            <option value="">Elige qué carta robarle...</option>
                            {cartasDelObjetivo.map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre} (x{c.cantidad})</option>
                            ))}
                          </select>
                        )
                      )}
                      {carta.id === "regalo-anonimo" && (
                        <input
                          type="number"
                          min={1}
                          value={regalo}
                          onChange={(event) => setRegalo(event.target.value)}
                          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                          placeholder="Chapas a enviar"
                        />
                      )}
                      {carta.id === "chapa-doble-o-nada" && (
                        <input
                          type="number"
                          min={1}
                          value={apuesta}
                          onChange={(event) => setApuesta(event.target.value)}
                          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                          placeholder="Chapas a apostar"
                        />
                      )}
                      {carta.id === "duplicado-expres" && (
                        <select
                          value={cartaDuplicada}
                          onChange={(event) => setCartaDuplicada(event.target.value)}
                          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                        >
                          <option value="">Elige qué carta duplicar...</option>
                          {cartasPropiasDuplicables.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre} (x{cartas[c.id]})</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        disabled={
                          Boolean(ocupada) ||
                          !listoParaUsar ||
                          (carta.id === "duplicado-expres" && !cartaDuplicada)
                        }
                        onClick={() => void usar(carta)}
                        className="w-full rounded-lg bg-cian px-3 py-2 font-titulo text-xs text-fondo disabled:opacity-50"
                      >
                        {ocupada === carta.id ? "Usando..." : "Usar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}
