"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CARTAS_COFRES, type CartaCofre } from "@/lib/cofresDesign";
import CartaArte from "@/components/CartaArte";

type Pendiente = { carta_id: string; creado_por: string; creado_en: string } | null;
type EventoCarta = { carta_id: string; usuario_id: string; objetivo_id: string | null };

const CARTAS_SALA = CARTAS_COFRES.filter((c) => c.contexto === "sala");
const CARTAS_ROBABLES = CARTAS_COFRES.filter((c) => c.rareza === "comun" || c.rareza === "rara");

/** Nombres bonitos para los efectos pendientes que dejan las habilidades
 * activas de sala (no son cartas, así que no están en CARTAS_COFRES). */
const NOMBRES_PENDIENTE_HABILIDAD: Record<string, string> = {
  "activa-ultima-llamada": "Última Llamada",
  "activa-cubata-punto": "Cubata en su Punto",
};

function nombrePendiente(cartaId: string): string {
  return CARTAS_COFRES.find((c) => c.id === cartaId)?.nombre ?? NOMBRES_PENDIENTE_HABILIDAD[cartaId] ?? cartaId;
}

const HABILIDADES_SALA: Record<
  string,
  { nombre: string; texto: string; rpc: string; necesitaComentario?: boolean }
> = {
  "jefe-after": {
    nombre: "Ronda de la Casa",
    texto: "1 vez al día: todos los miembros activos de la sala ganan +1 XP al instante.",
    rpc: "usar_habilidad_ronda_casa",
  },
  "ultimo-ronda": {
    nombre: "Última Llamada",
    texto: "1 vez al día: tu próxima bebida suelta en la hora siguiente da XP doble.",
    rpc: "usar_habilidad_ultima_llamada",
  },
  "narrador-noche": {
    nombre: "Titular del Día",
    texto: "1 vez al día: cuenta algo y gana 15 chapas gratis, sin gastar carta.",
    rpc: "usar_habilidad_titular_dia",
    necesitaComentario: true,
  },
  "silencioso-letal": {
    nombre: "Retirada Discreta",
    texto: "1 vez a la semana: si hoy no bebes nada, el día cuenta igual para tu racha.",
    rpc: "usar_habilidad_retirada_discreta",
  },
  "guardian-cubata": {
    nombre: "Cubata en su Punto",
    texto: "1 vez al día: tu próximo Cubata da el doble de XP.",
    rpc: "usar_habilidad_cubata_punto",
  },
};

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

/** null si el evento no le importa a nadie más (cartas que solo te afectan
 * a ti mismo), o si es deliberadamente silencioso (Espía de Barra: parte
 * de la gracia es que el objetivo no se entere). */
function textoEvento(evento: EventoCarta, userId: string, miembros: { id: string; nombre: string }[]): string | null {
  if (evento.usuario_id === userId) return null;
  const nombreDe = (id: string) => miembros.find((m) => m.id === id)?.nombre ?? "alguien";
  const soyObjetivo = evento.objetivo_id === userId;
  switch (evento.carta_id) {
    case "ronda-pagada":
      return soyObjetivo ? `🎁 ${nombreDe(evento.usuario_id)} te ha pagado una ronda: tu próxima bebida suelta da XP extra.` : null;
    case "chuleta":
      return soyObjetivo ? `🥸 ${nombreDe(evento.usuario_id)} te ha robado una carta.` : null;
    case "regalo-anonimo":
      return soyObjetivo ? "🎁 Has recibido chapas de un regalo anónimo." : null;
    case "fiebre-de-sala":
      return "🔥 ¡Fiebre de sala activada! XP extra durante 24h para quien registre algo.";
    case "barra-libre-para-todos":
      return "🍾 ¡Barra libre! Has recibido un cofre común gratis.";
    default:
      return null;
  }
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
  const [pendiente, setPendiente] = useState<Pendiente>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [objetivos, setObjetivos] = useState<Record<string, string>>({});
  const [apuesta, setApuesta] = useState("10");
  const [regalo, setRegalo] = useState("10");
  const [cartaRobada, setCartaRobada] = useState(CARTAS_ROBABLES[0]?.id ?? "");
  const [cartaDuplicada, setCartaDuplicada] = useState("");
  const [espionaje, setEspionaje] = useState<{ nombre: string; cartas: Record<string, number> } | null>(null);
  const [fiebreHasta, setFiebreHasta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avatarEquipado, setAvatarEquipado] = useState<string | null>(null);
  const [comentarioHabilidad, setComentarioHabilidad] = useState("");
  const [ocupadaHabilidad, setOcupadaHabilidad] = useState(false);
  const [mensajeHabilidad, setMensajeHabilidad] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data: perfil }, { data: pend }, { data: sala }] = await Promise.all([
      supabase.from("perfiles").select("avatar_config").eq("id", userId).single(),
      supabase.rpc("mi_carta_pendiente_sala", { p_sala: salaId }),
      supabase.from("salas").select("config").eq("id", salaId).single(),
    ]);
    const config = objetoConfig(perfil?.avatar_config);
    const inventario = objetoConfig(config.inventario);
    const tienda = objetoConfig(config.tienda);
    const cartasInv = (inventario.cartas as Record<string, number> | undefined) ?? {};
    setCartas(cartasInv);
    setPendiente((pend as Pendiente) ?? null);
    setFiebreHasta((objetoConfig(sala?.config).fiebre_hasta as string | undefined) ?? null);
    setAvatarEquipado((tienda.avatarEquipado as string | undefined) ?? null);
    setCargando(false);
  }, [supabase, salaId, userId]);

  useEffect(() => {
    const t = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(t);
  }, [cargar]);

  // Tiempo real: mi propio efecto pendiente puede llegar de otro jugador
  // (Ronda Pagada), la fiebre de sala la puede activar cualquiera, y los
  // eventos de carta avisan de robos, regalos y demás sin recargar.
  useEffect(() => {
    const canal = supabase
      .channel(`cartas-sala-${salaId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartas_pendientes_sala", filter: `usuario_id=eq.${userId}` },
        () => void cargar()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaId}` },
        () => void cargar()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos_carta_sala", filter: `sala_id=eq.${salaId}` },
        (payload) => {
          const evento = payload.new as EventoCarta;
          const texto = textoEvento(evento, userId, miembros);
          if (texto) setAviso(texto);
          if (evento.objetivo_id === userId || evento.usuario_id !== userId) void cargar();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, salaId, userId]);

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
      } else {
        setMensaje("Hecho ✓");
      }
      await cargar();
    }
    setOcupada(null);
  }

  const habilidad = avatarEquipado ? HABILIDADES_SALA[avatarEquipado] : undefined;

  async function usarHabilidad() {
    if (!habilidad || ocupadaHabilidad) return;
    setOcupadaHabilidad(true);
    setMensajeHabilidad(null);
    const { error } = habilidad.necesitaComentario
      ? await supabase.rpc(habilidad.rpc, { p_sala: salaId, p_comentario: comentarioHabilidad })
      : await supabase.rpc(habilidad.rpc, { p_sala: salaId });
    if (error) {
      setMensajeHabilidad(`Error: ${error.message}`);
    } else {
      setMensajeHabilidad("Hecho ✓");
      setComentarioHabilidad("");
      await cargar();
    }
    setOcupadaHabilidad(false);
  }

  if (cargando) return null;

  return (
    <>
      {habilidad && (
        <section className="mb-8 rounded-2xl border border-oro/40 bg-oro/10 p-4">
          <p className="mb-1 font-titulo text-sm text-oro">✨ {habilidad.nombre}</p>
          <p className="mb-3 text-xs leading-snug text-oro/90">{habilidad.texto}</p>
          {mensajeHabilidad && (
            <p role="status" className="mb-3 rounded-xl bg-fondo px-3 py-2 text-xs text-cian">{mensajeHabilidad}</p>
          )}
          {habilidad.necesitaComentario && (
            <input
              type="text"
              value={comentarioHabilidad}
              onChange={(event) => setComentarioHabilidad(event.target.value)}
              placeholder="Cuenta algo..."
              className="mb-2 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
            />
          )}
          <button
            type="button"
            disabled={ocupadaHabilidad || (habilidad.necesitaComentario && !comentarioHabilidad.trim())}
            onClick={() => void usarHabilidad()}
            className="w-full rounded-lg bg-oro px-3 py-2 font-titulo text-xs text-fondo disabled:opacity-50"
          >
            {ocupadaHabilidad ? "Usando..." : "Usar habilidad"}
          </button>
        </section>
      )}
      <section className="mb-8">
      <details className="group rounded-2xl border border-borde bg-tarjeta" open>
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-titulo text-xl text-texto">
          🎴 Cartas de sala ({misCartas.length})
          <span aria-hidden="true" className="text-base text-texto2 transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-borde p-4 pt-3">
          {fiebreHasta && new Date(fiebreHasta) > new Date() && (
            <p className="mb-3 rounded-xl bg-rosa/10 px-3 py-2 text-xs text-rosa">
              🔥 Fiebre de sala activa hasta las {new Date(fiebreHasta).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}: XP extra para quien registre algo.
            </p>
          )}
          {aviso && (
            <p role="status" className="mb-3 rounded-xl bg-rosa/10 px-3 py-2 text-xs text-rosa">{aviso}</p>
          )}
          {pendiente && (
            <p className="mb-3 rounded-xl bg-ambar/10 px-3 py-2 text-xs text-ambar">
              Tienes un efecto listo para tu próxima bebida suelta: {nombrePendiente(pendiente.carta_id)}.
            </p>
          )}
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
                const listoParaUsar =
                  !necesitaObjetivo || (objetivoElegido && objetivoElegido !== userId);
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
                          onChange={(event) => setObjetivos((actual) => ({ ...actual, [carta.id]: event.target.value }))}
                          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                        >
                          <option value="">Elige a quién...</option>
                          {otrosMiembros.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      )}
                      {carta.id === "chuleta" && (
                        <select
                          value={cartaRobada}
                          onChange={(event) => setCartaRobada(event.target.value)}
                          className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
                        >
                          {CARTAS_ROBABLES.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
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
    </>
  );
}
