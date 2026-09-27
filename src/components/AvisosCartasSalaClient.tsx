"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CARTAS_COFRES } from "@/lib/cofresDesign";
import { PERSONAJES_OCULTOS } from "@/lib/tienda";

type Pendiente = { carta_id: string; creado_por: string; creado_en: string } | null;
type EventoCarta = { carta_id: string; usuario_id: string; objetivo_id: string | null };

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

/** Franja siempre visible arriba de la sala (no depende de abrir ningún
 * desplegable): tu habilidad de personaje, y cualquier efecto de carta
 * activo o que te acabe de llegar, con aviso en tiempo real. */
export default function AvisosCartasSalaClient({
  salaId,
  userId,
  miembros,
}: {
  salaId: string;
  userId: string;
  miembros: { id: string; nombre: string }[];
}) {
  const supabase = createClient();
  const [cargando, setCargando] = useState(true);
  const [pendiente, setPendiente] = useState<Pendiente>(null);
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
    const tienda = objetoConfig(config.tienda);
    setPendiente((pend as Pendiente) ?? null);
    setFiebreHasta((objetoConfig(sala?.config).fiebre_hasta as string | undefined) ?? null);
    setAvatarEquipado((tienda.avatarEquipado as string | undefined) ?? null);
    setCargando(false);
  }, [supabase, salaId, userId]);

  useEffect(() => {
    const t = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    const canal = supabase
      .channel(`avisos-sala-${salaId}-${userId}`)
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
          if (evento.objetivo_id === userId) void cargar();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, salaId, userId]);

  const habilidad = avatarEquipado ? HABILIDADES_SALA[avatarEquipado] : undefined;
  const personaje = avatarEquipado ? PERSONAJES_OCULTOS.find((p) => p.id === avatarEquipado) : undefined;
  const fiebreActiva = fiebreHasta && new Date(fiebreHasta) > new Date();

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

  if (cargando || (!habilidad && !fiebreActiva && !pendiente && !aviso)) return null;

  return (
    <div key={`${pendiente?.carta_id ?? ""}-${aviso ?? ""}`} className="subir-podio mb-8 space-y-3">
      {habilidad && (
        <section className="rounded-2xl border border-oro/40 bg-oro/10 p-4">
          <p className="mb-1 font-titulo text-sm text-oro">✨ {habilidad.nombre}</p>
          <p className="mb-1 text-xs leading-snug text-oro/90">{habilidad.texto}</p>
          {personaje?.habilidades && (
            <p className="mb-3 text-[11px] leading-snug text-oro/70">
              Pasiva de {personaje.nombre}: {personaje.habilidades.pasivaSala}
            </p>
          )}
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
      {fiebreActiva && fiebreHasta && (
        <p className="rounded-xl bg-rosa/10 px-3 py-2 text-xs text-rosa">
          🔥 Fiebre de sala activa hasta las {new Date(fiebreHasta).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}: XP extra para quien registre algo.
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-xl bg-rosa/10 px-3 py-2 text-xs text-rosa">{aviso}</p>
      )}
      {pendiente && (
        <p className="rounded-xl bg-ambar/10 px-3 py-2 text-xs text-ambar">
          Tienes un efecto listo para tu próxima bebida suelta: {nombrePendiente(pendiente.carta_id)}.
        </p>
      )}
    </div>
  );
}
