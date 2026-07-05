"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CARTAS_COFRES, type CartaCofre } from "@/lib/cofresDesign";
import {
  cartasActivasDeNoche,
  cartaPorId,
  chapasPorCartaEconomia,
  parseInventarioState,
  usarCartaEnNoche,
  type CartaActiva,
} from "@/lib/inventario";
import {
  calcularLogrosNoche,
  LOGROS_EN_VIVO,
  SLUG_LOGRO_EN_VIVO,
  type LogroNoche,
} from "@/lib/logros";
import {
  claseTambaleo,
  estadoPorBebidas,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/lib/avatar";
import { parseTiendaState } from "@/lib/tienda";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import MedalIcon from "@/components/MedalIcon";
import CartaDetalleModal from "@/components/CartaDetalleModal";

export type Bebida = {
  id: number;
  nombre: string;
  icono: string;
  puntos: number;
};
export type Jugador = {
  id: string;
  nombre: string;
  avatarConfig: AvatarConfig;
  avatarConfigRaw: unknown;
};
export type Registro = {
  id: string;
  usuario_id: string;
  bebida_tipo_id: number;
  ts: string;
  retroactivo?: boolean;
};
export type Voto = { votante_id: string; votado_id: string };
export type PenalizacionTipo = {
  id: number;
  slug: string;
  nombre: string;
  icono: string;
  pl: number;
};
export type Penalizacion = {
  id: string;
  usuario_id: string;
  penalizacion_id: number;
  otorgada_por: string;
};

type EstadoNoche = "activa" | "cerrando" | "cerrada";

type Noche = {
  id: string;
  sala_id: string;
  estado: EstadoNoche;
  inicio: string;
  fin_programado: string;
  fin_gracia: string | null;
  votacion_categoria: string | null;
};

const DURACION_GRACIA_MS = 5 * 60 * 1000;
const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

const RETOS_NOCHE = [
  {
    slug: "ronda_torera",
    icono: "🥃",
    nombre: "Ronda Torera",
    nombres: ["Chupito", "Shot especial"],
    umbral: 5,
  },
  {
    slug: "media_docena",
    icono: "🍺",
    nombre: "Media Docena",
    nombres: ["Cerveza", "Pinta"],
    umbral: 6,
  },
  {
    slug: "poker_copas",
    icono: "🍹",
    nombre: "Póker de Copas",
    nombres: ["Cubata"],
    umbral: 4,
  },
] as const;

// Ruleta del Bar se gasta a si misma y activa al azar una de estas cartas
// comunes/raras ya implementadas, reutilizando su efecto real.
const RULETA_OPCIONES = ["ronda-relampago", "ultimo-aviso", "confeti-caos"];

function elegirRuletaBar(random: () => number = Math.random): string {
  return RULETA_OPCIONES[Math.floor(random() * RULETA_OPCIONES.length)];
}

// Cartas que mutan el inventario de OTRO jugador: se resuelven siempre en el
// servidor (RPC) para que no se puedan falsificar desde el cliente.
const CARTAS_RPC_CRUZADAS = new Set(["mano-larga", "cambio-de-vaso"]);

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function puntosBaseRegistro(registro: Registro, bebidasMap: Map<number, Bebida>) {
  const puntos = bebidasMap.get(registro.bebida_tipo_id)?.puntos ?? 0;
  // Lo que se registra en el tiempo extra de cierre (bebidas olvidadas) cuenta
  // como mucho 1 punto, igual que calcula finalizar_noche en el cierre real.
  return registro.retroactivo ? Math.min(puntos, 1) : puntos;
}

function enVentana(activa: CartaActiva, registro: Registro) {
  const ts = new Date(registro.ts).getTime();
  const inicio = new Date(activa.usadaEn).getTime();
  const fin = activa.expiraEn ? new Date(activa.expiraEn).getTime() : Infinity;
  return ts >= inicio && ts <= fin;
}

function esPrimerRegistroEnVentana(
  activa: CartaActiva,
  registro: Registro,
  registros: Registro[]
) {
  if (!enVentana(activa, registro)) return false;
  return !registros.some(
    (otro) =>
      otro.usuario_id === registro.usuario_id &&
      otro.id !== registro.id &&
      enVentana(activa, otro) &&
      new Date(otro.ts).getTime() < new Date(registro.ts).getTime()
  );
}

function esPrimerRegistroDelObjetivo(
  activa: CartaActiva,
  registro: Registro,
  registros: Registro[]
) {
  if (!activa.objetivoId || activa.objetivoId !== registro.usuario_id) {
    return false;
  }
  return esPrimerRegistroEnVentana(activa, registro, registros);
}

function rangoPropioEnVentana(
  activa: CartaActiva,
  registro: Registro,
  registros: Registro[]
) {
  if (!enVentana(activa, registro)) return Infinity;
  return registros.filter(
    (otro) =>
      otro.usuario_id === registro.usuario_id &&
      enVentana(activa, otro) &&
      new Date(otro.ts).getTime() <= new Date(registro.ts).getTime()
  ).length;
}

function tipoDistintoDelAnterior(registro: Registro, registros: Registro[]) {
  const propios = registros
    .filter((r) => r.usuario_id === registro.usuario_id)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const idx = propios.findIndex((r) => r.id === registro.id);
  const anterior = idx > 0 ? propios[idx - 1] : null;
  return !anterior || anterior.bebida_tipo_id !== registro.bebida_tipo_id;
}

function puntosRegistro(
  registro: Registro,
  registros: Registro[],
  bebidasMap: Map<number, Bebida>,
  cartasActivas: CartaActiva[]
) {
  const bebida = bebidasMap.get(registro.bebida_tipo_id);
  const nombreBebida = normalizar(`${bebida?.nombre ?? ""} ${bebida?.icono ?? ""}`);
  const puntos = puntosBaseRegistro(registro, bebidasMap);
  let multiplicador = 1;
  let bonus = 0;

  for (const activa of cartasActivas) {
    if (!enVentana(activa, registro)) continue;
    if (activa.cartaId === "noche-x10") multiplicador = Math.max(multiplicador, 10);
    if (activa.cartaId === "ultimo-aviso") bonus += 1;
    if (
      (activa.cartaId === "happy-hour-salvaje" ||
        activa.cartaId === "ronda-relampago") &&
      esPrimerRegistroEnVentana(activa, registro, registros)
    ) {
      bonus += 2;
    }
    if (
      activa.cartaId === "doble-o-nada" &&
      activa.usuarioId === registro.usuario_id &&
      esPrimerRegistroEnVentana(activa, registro, registros)
    ) {
      multiplicador = Math.max(multiplicador, 2);
    }
    if (
      activa.cartaId === "cubata-obligatorio" &&
      esPrimerRegistroDelObjetivo(activa, registro, registros) &&
      (nombreBebida.includes("cubata") ||
        nombreBebida.includes("coctel") ||
        nombreBebida.includes("cocktail") ||
        nombreBebida.includes("combinado"))
    ) {
      bonus += 5;
    }
    if (
      activa.cartaId === "chupito-castigo" &&
      esPrimerRegistroDelObjetivo(activa, registro, registros) &&
      (nombreBebida.includes("chupit") ||
        nombreBebida.includes("shot") ||
        nombreBebida.includes("tequila") ||
        nombreBebida.includes("jager"))
    ) {
      bonus += 3;
    }
    if (
      activa.cartaId === "pirata-del-hielo" &&
      activa.usuarioId === registro.usuario_id &&
      esPrimerRegistroEnVentana(activa, registro, registros) &&
      puntos === 0
    ) {
      bonus += 1;
    }
    if (
      activa.cartaId === "ticket-barra-libre" &&
      activa.usuarioId === registro.usuario_id &&
      esPrimerRegistroEnVentana(activa, registro, registros) &&
      tipoDistintoDelAnterior(registro, registros)
    ) {
      bonus += 4;
    }
    if (
      activa.cartaId === "triple-amenaza" &&
      activa.usuarioId === registro.usuario_id &&
      rangoPropioEnVentana(activa, registro, registros) <= 3 &&
      tipoDistintoDelAnterior(registro, registros)
    ) {
      bonus += 3;
    }
    if (
      activa.cartaId === "luna-llena" &&
      (nombreBebida.includes("chupit") || nombreBebida.includes("shot"))
    ) {
      bonus += 4;
    }
    if (
      activa.cartaId === "remontada-imposible" &&
      activa.usuarioId === registro.usuario_id &&
      activa.condicionCumplida &&
      rangoPropioEnVentana(activa, registro, registros) <= 2
    ) {
      bonus += 6;
    }
  }

  return puntos * multiplicador + bonus;
}

function calcularRanking(
  jugadores: Jugador[],
  registros: Registro[],
  jugadoresMap: Map<string, string>,
  bebidasMap: Map<number, Bebida>,
  cartasActivas: CartaActiva[]
) {
  const totales = new Map<string, { bebidas: number; puntos: number }>();
  for (const j of jugadores) totales.set(j.id, { bebidas: 0, puntos: 0 });

  for (const r of registros) {
    const t = totales.get(r.usuario_id);
    if (t) {
      t.bebidas += 1;
      t.puntos += puntosRegistro(r, registros, bebidasMap, cartasActivas);
    }
  }
  return [...totales.entries()]
    .map(([id, t]) => {
      const j = jugadores.find((x) => x.id === id);
      return {
        id,
        nombre: jugadoresMap.get(id) ?? "???",
        avatarConfig: j?.avatarConfig ?? parseAvatarConfig(null),
        ...t,
      };
    })
    .sort((a, b) => b.puntos - a.puntos || b.bebidas - a.bebidas);
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatearRestante(ms: number): string {
  if (ms <= 0) return "¡Tiempo!";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatearMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NocheLive({
  noche,
  salaNombre,
  bebidas,
  jugadoresIniciales,
  registrosIniciales,
  votosIniciales,
  confirmacionesIniciales,
  penalizacionesTipo,
  penalizacionesIniciales,
  logrosVistosIniciales,
  userId,
  esAdmin,
}: {
  noche: Noche;
  salaNombre: string;
  bebidas: Bebida[];
  jugadoresIniciales: Jugador[];
  registrosIniciales: Registro[];
  votosIniciales: Voto[];
  confirmacionesIniciales: string[];
  penalizacionesTipo: PenalizacionTipo[];
  penalizacionesIniciales: Penalizacion[];
  logrosVistosIniciales: string[];
  userId: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [jugadores, setJugadores] = useState<Jugador[]>(jugadoresIniciales);
  const [registros, setRegistros] = useState<Registro[]>(registrosIniciales);
  const [bloqueada, setBloqueada] = useState(false);
  const [estadoNoche, setEstadoNoche] = useState<EstadoNoche>(noche.estado);
  const [finProgramado, setFinProgramado] = useState(noche.fin_programado);
  const [finGracia, setFinGracia] = useState<string | null>(noche.fin_gracia);
  const [categoria, setCategoria] = useState<string | null>(
    noche.votacion_categoria
  );
  const [votos, setVotos] = useState<Voto[]>(votosIniciales);
  const [votando, setVotando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [masUnos, setMasUnos] = useState<{ id: number; icono: string }[]>([]);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [cartaDetalle, setCartaDetalle] = useState<CartaCofre | null>(null);
  const [panelExtender, setPanelExtender] = useState(false);
  const [horasExtra, setHorasExtra] = useState("2");
  const [extendiendo, setExtendiendo] = useState(false);
  const [errorExtender, setErrorExtender] = useState<string | null>(null);
  const [usandoCarta, setUsandoCarta] = useState<string | null>(null);
  const [objetivosCarta, setObjetivosCarta] = useState<Record<string, string>>({});
  const [cartaADuplicar, setCartaADuplicar] = useState("");
  const [mensajeCarta, setMensajeCarta] = useState<string | null>(null);
  const [confirmaciones, setConfirmaciones] = useState<string[]>(
    confirmacionesIniciales
  );
  const [confirmando, setConfirmando] = useState(false);
  const [penalizaciones, setPenalizaciones] = useState<Penalizacion[]>(
    penalizacionesIniciales
  );
  const [objetivoPenalizacion, setObjetivoPenalizacion] = useState("");
  const [tipoPenalizacion, setTipoPenalizacion] = useState("");
  const [marcandoPenalizacion, setMarcandoPenalizacion] = useState(false);
  const contadorMasUno = useRef(0);

  // Logros en directo: cola de popups + set de los ya mostrados/persistidos
  // esta noche (sembrado con lo que ya está en logros_usuario, para no repetir
  // el popup cada vez que se recarga la página).
  const [colaLogros, setColaLogros] = useState<LogroNoche[]>([]);
  const [logroActual, setLogroActual] = useState<LogroNoche | null>(null);
  const logrosVistosRef = useRef<Set<string>>(new Set(logrosVistosIniciales));

  const unido = jugadores.some((j) => j.id === userId);
  const finMs = new Date(finProgramado).getTime();
  const terminada = ahora >= finMs;
  const graciaMs = finGracia ? new Date(finGracia).getTime() : null;
  const enGracia = estadoNoche === "cerrando";
  const graciaActiva = enGracia && graciaMs !== null && ahora < graciaMs;
  // Pasados los 5 min de gracia normal se entra en el tiempo extra: modo
  // "añade lo que se te olvidó", donde cada bebida cuenta solo 1 punto.
  const graciaExpirada = enGracia && graciaMs !== null && ahora >= graciaMs;
  const cercaFin = finMs - ahora <= 5 * 60 * 1000;
  const cercaGracia =
    graciaMs !== null && Math.abs(graciaMs - ahora) <= 5 * 60 * 1000;
  const relojRapido = cercaFin || cercaGracia;
  const puedeRegistrar =
    unido && !bloqueada && ((estadoNoche === "activa" && !terminada) || enGracia);

  const inicioMs = new Date(noche.inicio).getTime();
  const pasaron24h = ahora - inicioMs >= VEINTICUATRO_HORAS_MS;
  const confirmadosSet = useMemo(() => new Set(confirmaciones), [confirmaciones]);
  const yoConfirme = confirmadosSet.has(userId);
  const todosConfirmados =
    jugadores.length > 0 && jugadores.every((j) => confirmadosSet.has(j.id));
  const puedeRevelarPodio = esAdmin || todosConfirmados || pasaron24h;

  const bebidasMap = useMemo(
    () => new Map(bebidas.map((b) => [b.id, b])),
    [bebidas]
  );
  const jugadoresMap = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j.nombre])),
    [jugadores]
  );
  const miJugador = jugadores.find((j) => j.id === userId) ?? null;
  const miInventario = useMemo(
    () => parseInventarioState(miJugador?.avatarConfigRaw),
    [miJugador?.avatarConfigRaw]
  );
  const cartasActivas = useMemo(
    () =>
      cartasActivasDeNoche(
        jugadores.map((jugador) => jugador.avatarConfigRaw),
        noche.id,
        ahora
      ),
    [jugadores, noche.id, ahora]
  );
  const cartasUsables = useMemo(
    () =>
      CARTAS_COFRES.filter((carta) => (miInventario.cartas[carta.id] ?? 0) > 0),
    [miInventario.cartas]
  );

  // Reloj: se acelera a cada segundo cuando se acerca algún límite relevante
  useEffect(() => {
    const t = setInterval(
      () => setAhora(new Date().getTime()),
      relojRapido ? 1000 : 15000
    );
    return () => clearInterval(t);
  }, [relojRapido]);

  const cargarJugador = useCallback(
    async (usuarioId: string) => {
      const { data } = await supabase
        .from("perfiles")
        .select("id, nombre, avatar_config")
        .eq("id", usuarioId)
        .single();
      if (data) {
        const jugador: Jugador = {
          id: data.id,
          nombre: data.nombre,
          avatarConfig: parseAvatarConfig(data.avatar_config),
          avatarConfigRaw: data.avatar_config,
        };
        setJugadores((prev) =>
          prev.some((j) => j.id === jugador.id)
            ? prev.map((j) => (j.id === jugador.id ? jugador : j))
            : [...prev, jugador]
        );
      }
    },
    [supabase]
  );

  // Realtime
  useEffect(() => {
    const canal = supabase
      .channel(`noche-${noche.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "registros",
          filter: `noche_id=eq.${noche.id}`,
        },
        (payload) => {
          const nuevo = payload.new as Registro & { anulado: boolean };
          if (nuevo.anulado) return;
          setRegistros((prev) =>
            prev.some((r) => r.id === nuevo.id) ? prev : [...prev, nuevo]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "registros",
        },
        (payload) => {
          const borrado = payload.old as { id: string };
          setRegistros((prev) => prev.filter((r) => r.id !== borrado.id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "noche_jugadores",
          filter: `noche_id=eq.${noche.id}`,
        },
        (payload) => {
          const nuevo = payload.new as { usuario_id: string };
          cargarJugador(nuevo.usuario_id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "perfiles",
        },
        (payload) => {
          const actualizado = payload.new as {
            id: string;
            nombre: string;
            avatar_config: unknown;
          };
          setJugadores((prev) =>
            prev.map((jugador) =>
              jugador.id === actualizado.id
                ? {
                    ...jugador,
                    nombre: actualizado.nombre ?? jugador.nombre,
                    avatarConfig: parseAvatarConfig(actualizado.avatar_config),
                    avatarConfigRaw: actualizado.avatar_config,
                  }
                : jugador
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "noches",
          filter: `id=eq.${noche.id}`,
        },
        (payload) => {
          const actualizada = payload.new as {
            estado: EstadoNoche;
            fin_programado: string;
            fin_gracia: string | null;
            votacion_categoria: string | null;
          };
          setFinProgramado(actualizada.fin_programado);
          if (actualizada.estado === "cerrada") {
            router.push(`/noche/${noche.id}/podio`);
          } else if (actualizada.estado === "cerrando") {
            setEstadoNoche("cerrando");
            setFinGracia(actualizada.fin_gracia);
            setCategoria(actualizada.votacion_categoria);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "noche_votos",
          filter: `noche_id=eq.${noche.id}`,
        },
        (payload) => {
          const voto = payload.new as Voto;
          if (!voto?.votante_id) return;
          setVotos((prev) => [
            ...prev.filter((v) => v.votante_id !== voto.votante_id),
            voto,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "noche_confirmaciones",
          filter: `noche_id=eq.${noche.id}`,
        },
        (payload) => {
          const nueva = payload.new as { usuario_id: string };
          setConfirmaciones((prev) =>
            prev.includes(nueva.usuario_id) ? prev : [...prev, nueva.usuario_id]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "noche_penalizaciones",
          filter: `noche_id=eq.${noche.id}`,
        },
        (payload) => {
          const nueva = payload.new as Penalizacion;
          setPenalizaciones((prev) =>
            prev.some((p) => p.id === nueva.id) ? prev : [...prev, nueva]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "noche_penalizaciones",
        },
        (payload) => {
          const borrada = payload.old as { id: string };
          setPenalizaciones((prev) => prev.filter((p) => p.id !== borrada.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, noche.id, router, cargarJugador]);

  // Detecta logros "estables" según van llegando registros y encola el popup
  useEffect(() => {
    if (!unido) return;
    const misRegs = registros.filter((r) => r.usuario_id === userId);
    const puntos = misRegs.reduce((acc, r) => acc + puntosBaseRegistro(r, bebidasMap), 0);
    const tiposDistintos = new Set(misRegs.map((r) => r.bebida_tipo_id)).size;
    const timestamps = misRegs.map((r) => new Date(r.ts).getTime());
    const ordenTotal = [...registros].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    const primero = ordenTotal[0];
    const esPrimero20 =
      !!primero &&
      primero.usuario_id === userId &&
      new Date(primero.ts).getHours() < 20;

    const detectados = calcularLogrosNoche({
      esGanador: false,
      bebidas: misRegs.length,
      puntos,
      tiposDistintos,
      timestamps,
      esPrimerRegistroDeLaNocheAntesDe20h: esPrimero20,
    }).filter((l) => LOGROS_EN_VIVO.includes(l.nombre));

    const nuevos = detectados.filter(
      (l) => !logrosVistosRef.current.has(l.nombre)
    );
    if (nuevos.length > 0) {
      nuevos.forEach((l) => {
        logrosVistosRef.current.add(l.nombre);
        const slug = SLUG_LOGRO_EN_VIVO[l.nombre];
        if (slug) {
          // Se persiste ya durante la noche (el servidor revalida la
          // condición), así aparece al momento en "desbloqueados" y no vuelve
          // a saltar el popup si recargas la página.
          void supabase.rpc("registrar_logro_en_vivo", {
            p_noche: noche.id,
            p_slug: slug,
          });
        }
      });
      setColaLogros((prev) => [...prev, ...nuevos]);
    }
  }, [registros, userId, unido, bebidasMap, supabase, noche.id]);

  // Saca el siguiente logro de la cola cuando no hay ninguno mostrándose
  useEffect(() => {
    if (logroActual || colaLogros.length === 0) return;
    const t = setTimeout(() => {
      setColaLogros((prev) => {
        const [siguiente, ...resto] = prev;
        if (siguiente) setLogroActual(siguiente);
        return resto;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [colaLogros, logroActual]);

  useEffect(() => {
    if (!logroActual) return;
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    const t = setTimeout(() => setLogroActual(null), 3200);
    return () => clearTimeout(t);
  }, [logroActual]);

  async function unirme() {
    const { error } = await supabase
      .from("noche_jugadores")
      .insert({ noche_id: noche.id, usuario_id: userId });
    if (!error) {
      setJugadores((prev) =>
        prev.some((j) => j.id === userId)
          ? prev
          : [
              ...prev,
              {
                id: userId,
                nombre: "Tú",
                avatarConfig: parseAvatarConfig(null),
                avatarConfigRaw: null,
              },
            ]
      );
      cargarJugador(userId);
    }
  }

  async function registrarBebida(bebida: Bebida) {
    if (!puedeRegistrar) return;
    // Si alguien te ha lanzado Selfie Obligatoria y sigue activa, se pide un
    // comentario rápido; si se deja en blanco, finalizar_noche penaliza esta
    // bebida con -2 PL.
    const selfieActiva = cartasActivas.find(
      (activa) =>
        activa.cartaId === "selfie-obligatoria" && activa.objetivoId === userId
    );
    const comentario = selfieActiva
      ? window.prompt(
          "Alguien te ha lanzado Selfie Obligatoria. Añade un comentario a esta bebida (o perderás 2 PL):"
        )
      : null;
    const { data, error } = await supabase
      .from("registros")
      .insert({
        noche_id: noche.id,
        usuario_id: userId,
        bebida_tipo_id: bebida.id,
        ...(comentario ? { comentario } : {}),
      })
      .select("id, usuario_id, bebida_tipo_id, ts, retroactivo")
      .single();
    if (error || !data) {
      // La noche se cerró (o el periodo de gracia venció) antes de que llegara
      // este registro: la política de la base de datos lo ha rechazado.
      setBloqueada(true);
      router.refresh();
      return;
    }
    // Actualización optimista: no esperamos a que llegue el evento de
    // Realtime para que el contador suba, así se ve al instante.
    setRegistros((prev) =>
      prev.some((r) => r.id === data.id) ? prev : [...prev, data as Registro]
    );
    if (navigator.vibrate) navigator.vibrate(40);
    const idAnim = contadorMasUno.current++;
    setMasUnos((prev) => [...prev, { id: idAnim, icono: bebida.icono }]);
    setTimeout(
      () => setMasUnos((prev) => prev.filter((m) => m.id !== idAnim)),
      900
    );
  }

  async function usarCarta(carta: CartaCofre) {
    if (!unido || !miJugador) return;
    const objetivoId = objetivosCarta[carta.id];
    const objetivo = jugadores.find((jugador) => jugador.id === objetivoId);
    if (carta.alcance === "objetivo" && !objetivo) {
      setMensajeCarta("Elige a quién va dirigida la carta.");
      return;
    }
    if (carta.id === "copia-de-seguridad" && !cartaADuplicar) {
      setMensajeCarta("Elige qué carta quieres duplicar.");
      return;
    }

    setUsandoCarta(carta.id);
    setMensajeCarta(null);

    // Mano Larga y Cambio de Vaso mutan el inventario de OTRO jugador: se
    // resuelven siempre vía RPC (no se puede falsificar el robo/cambio
    // escribiendo directamente en tu propio avatar_config).
    if (CARTAS_RPC_CRUZADAS.has(carta.id) && objetivo) {
      const rpc = carta.id === "mano-larga" ? "usar_mano_larga" : "usar_cambio_de_vaso";
      const { data, error } = await supabase.rpc(rpc, {
        p_noche: noche.id,
        p_objetivo: objetivo.id,
      });
      setUsandoCarta(null);
      if (error) {
        setMensajeCarta(error.message);
        return;
      }
      setMensajeCarta(
        carta.id === "mano-larga"
          ? `Le robaste "${cartaPorId(data?.carta)?.nombre ?? data?.carta}" a ${objetivo.nombre}.`
          : `Le cambiaste la carta activa a ${objetivo.nombre}.`
      );
      router.refresh();
      return;
    }

    if (carta.id === "meteorito-de-caos") {
      const { error } = await supabase.rpc("usar_meteorito_caos", {
        p_noche: noche.id,
      });
      setUsandoCarta(null);
      if (error) {
        setMensajeCarta(error.message);
        return;
      }
      setMensajeCarta("¡Meteorito de Caos! Todos los bonus activos han desaparecido.");
      router.refresh();
      return;
    }

    // Se recalcula el ranking al vuelo (en vez de leer el memoizado más
    // abajo) para que las condiciones "en vivo" (Remontada Imposible,
    // Coronación Secreta, Sombra del After) y las cartas de chapas usen la
    // posición justo en el momento de usar la carta.
    const rankingActual = calcularRanking(
      jugadores,
      registros,
      jugadoresMap,
      bebidasMap,
      cartasActivas
    );
    const miPosicionAhora = rankingActual.findIndex((r) => r.id === userId) + 1;
    const enPodioAhora = miPosicionAhora >= 1 && miPosicionAhora <= 3;
    const posicionMediana = Math.ceil(rankingActual.length / 2);

    const condicionCumplida =
      carta.id === "remontada-imposible"
        ? rankingActual.length > 0 &&
          rankingActual[rankingActual.length - 1]?.id === userId
        : carta.id === "coronacion-secreta"
          ? !enPodioAhora
          : carta.id === "sombra-del-after"
            ? miPosicionAhora > posicionMediana
            : undefined;

    // Ruleta del Bar se gasta ella misma pero lo que queda activo (y lo que
    // procesará finalizar_noche) es una de estas tres cartas ya
    // implementadas, sorteada al azar.
    const cartaIdEfectiva =
      carta.id === "ruleta-del-bar" ? elegirRuletaBar() : carta.id;

    const resultado = usarCartaEnNoche({
      inventario: miInventario,
      cartaId: carta.id,
      cartaIdEfectiva,
      nocheId: noche.id,
      usuarioId: userId,
      usuarioNombre: miJugador.nombre,
      objetivoId: objetivo?.id,
      objetivoNombre: objetivo?.nombre,
      condicionCumplida,
    });

    if (!resultado) {
      setMensajeCarta("No tienes esa carta disponible.");
      setUsandoCarta(null);
      return;
    }

    const configActual = objetoConfig(miJugador.avatarConfigRaw);
    let nextConfig: Record<string, unknown> = {
      ...configActual,
      inventario: resultado.inventario,
    };

    // Cartas de chapas: la recompensa se aplica ya en el cliente, igual que
    // al abrir un cofre (no dependen del cierre de la noche).
    if (carta.id === "jackpot-siete" || carta.id === "lluvia-de-chapas") {
      const tienda = parseTiendaState(configActual);
      const chapas = chapasPorCartaEconomia(carta.id, miPosicionAhora);
      nextConfig = {
        ...nextConfig,
        tienda: { ...tienda, bonus: tienda.bonus + chapas },
      };
    }

    // Copia de Seguridad: duplica en el propio inventario la carta elegida
    // (solo toca tu propio avatar_config, seguro de resolver en el cliente).
    if (carta.id === "copia-de-seguridad" && cartaADuplicar) {
      const inv = resultado.inventario;
      nextConfig = {
        ...nextConfig,
        inventario: {
          ...inv,
          cartas: {
            ...inv.cartas,
            [cartaADuplicar]: (inv.cartas[cartaADuplicar] ?? 0) + 1,
          },
        },
      };
    }

    const { error } = await supabase
      .from("perfiles")
      .update({ avatar_config: nextConfig })
      .eq("id", userId);

    if (error) {
      setMensajeCarta("No se pudo usar la carta. Prueba otra vez.");
    } else {
      setJugadores((prev) =>
        prev.map((jugador) =>
          jugador.id === userId
            ? {
                ...jugador,
                avatarConfig: parseAvatarConfig(nextConfig),
                avatarConfigRaw: nextConfig,
              }
            : jugador
        )
      );
      setMensajeCarta(
        carta.id === "ruleta-del-bar"
          ? `¡La ruleta eligió: ${cartaPorId(cartaIdEfectiva)?.nombre ?? cartaIdEfectiva}!`
          : objetivo
            ? `${carta.nombre} enviada a ${objetivo.nombre}.`
            : `${carta.nombre} activada.`
      );
      if (carta.id === "copia-de-seguridad") setCartaADuplicar("");
      if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
    }
    setUsandoCarta(null);
  }

  async function deshacerUltima() {
    const miUltimo = [...registros]
      .reverse()
      .find((r) => r.usuario_id === userId);
    if (!miUltimo) return;
    await supabase.from("registros").delete().eq("id", miUltimo.id);
    setRegistros((prev) => prev.filter((r) => r.id !== miUltimo.id));
  }

  /** El admin alarga el tiempo restante de la noche (mientras siga activa). */
  async function extenderNoche() {
    const horas = Number(horasExtra);
    if (!Number.isFinite(horas) || horas <= 0) {
      setErrorExtender("Pon un número de horas válido.");
      return;
    }
    setExtendiendo(true);
    setErrorExtender(null);
    const { error } = await supabase.rpc("extender_noche", {
      p_noche: noche.id,
      p_horas: horas,
    });
    setExtendiendo(false);
    if (error) {
      setErrorExtender(error.message);
      return;
    }
    setFinProgramado(
      new Date(finMs + horas * 3600 * 1000).toISOString()
    );
    setPanelExtender(false);
  }

  /** Inicia el periodo de gracia de 5 minutos (todavía no calcula el podio). */
  async function iniciarCierre() {
    setCerrando(true);
    setErrorCierre(null);
    const { error } = await supabase.rpc("cerrar_noche", {
      p_noche: noche.id,
    });
    setCerrando(false);
    if (error) {
      setErrorCierre(error.message);
      return;
    }
    setConfirmandoCierre(false);
    setEstadoNoche("cerrando");
    // Optimista: el valor real llega enseguida por realtime y lo sobreescribe.
    setFinGracia(new Date(Date.now() + DURACION_GRACIA_MS).toISOString());
  }

  /** Emite o cambia tu voto de la categoría de la noche. */
  async function votar(votadoId: string) {
    if (votadoId === userId || !enGracia) return;
    setVotando(true);
    const { error } = await supabase.from("noche_votos").upsert({
      noche_id: noche.id,
      votante_id: userId,
      votado_id: votadoId,
    });
    setVotando(false);
    if (!error) {
      if (navigator.vibrate) navigator.vibrate(30);
      setVotos((prev) => [
        ...prev.filter((v) => v.votante_id !== userId),
        { votante_id: userId, votado_id: votadoId },
      ]);
    }
  }

  /** Marca que ya no tienes más bebidas olvidadas que añadir. */
  async function confirmarSinMasBebidas() {
    if (yoConfirme || confirmando) return;
    setConfirmando(true);
    const { error } = await supabase.from("noche_confirmaciones").insert({
      noche_id: noche.id,
      usuario_id: userId,
    });
    setConfirmando(false);
    if (!error) {
      setConfirmaciones((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
      if (navigator.vibrate) navigator.vibrate(30);
    }
  }

  /** Marca a alguien con una penalización (ha vomitado, KO...) durante el cierre. */
  async function marcarPenalizacion() {
    if (!objetivoPenalizacion || !tipoPenalizacion) return;
    setMarcandoPenalizacion(true);
    const { data, error } = await supabase
      .from("noche_penalizaciones")
      .insert({
        noche_id: noche.id,
        usuario_id: objetivoPenalizacion,
        penalizacion_id: Number(tipoPenalizacion),
        otorgada_por: userId,
      })
      .select("id, usuario_id, penalizacion_id, otorgada_por")
      .single();
    setMarcandoPenalizacion(false);
    if (!error && data) {
      setPenalizaciones((prev) =>
        prev.some((p) => p.id === data.id) ? prev : [...prev, data]
      );
      setObjetivoPenalizacion("");
      setTipoPenalizacion("");
    }
  }

  /** Quita una penalización que tú mismo pusiste, por si fue un error. */
  async function quitarPenalizacion(id: string) {
    await supabase.from("noche_penalizaciones").delete().eq("id", id);
    setPenalizaciones((prev) => prev.filter((p) => p.id !== id));
  }

  /** Cierra de verdad tras el periodo de gracia y calcula el podio. */
  async function finalizarNoche() {
    setCerrando(true);
    setErrorCierre(null);
    const { error } = await supabase.rpc("finalizar_noche", {
      p_noche: noche.id,
    });
    if (!error) {
      fetch("/api/notificar-liga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaId: noche.sala_id }),
      }).catch((err) => {
        // el push es un extra: el podio ya está calculado igualmente
        console.error("notificar-liga:", err);
      });
      router.push(`/noche/${noche.id}/podio`);
    } else {
      setCerrando(false);
      setErrorCierre(error.message);
    }
  }

  const misRegistros = registros.filter((r) => r.usuario_id === userId);
  const miUltimoRegistro = misRegistros[misRegistros.length - 1];
  const puedoDeshacer =
    miUltimoRegistro &&
    ahora - new Date(miUltimoRegistro.ts).getTime() < 30000;

  const ranking = useMemo(
    () => calcularRanking(jugadores, registros, jugadoresMap, bebidasMap, cartasActivas),
    [jugadores, registros, bebidasMap, jugadoresMap, cartasActivas]
  );

  const feed = useMemo(() => [...registros].reverse().slice(0, 20), [registros]);
  const misPuntos =
    ranking.find((r) => r.id === userId) ?? { bebidas: 0, puntos: 0 };

  const progresoRetos = useMemo(() => {
    return RETOS_NOCHE.map((reto) => {
      const total = misRegistros.filter((r) => {
        const nombre = bebidasMap.get(r.bebida_tipo_id)?.nombre;
        return nombre ? (reto.nombres as readonly string[]).includes(nombre) : false;
      }).length;
      const actual = total === 0 ? 0 : ((total - 1) % reto.umbral) + 1;
      return { ...reto, actual };
    });
  }, [misRegistros, bebidasMap]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-32 pt-6">
      {logroActual && (
        <div className="fixed inset-x-0 top-6 z-50 mx-auto flex max-w-md justify-center px-5">
          <div className="subir-podio flex items-center gap-3 rounded-2xl border-2 border-ambar bg-tarjeta px-5 py-4 glow-ambar">
            <MedalIcon
              icono={logroActual.icono}
              nombre={logroActual.nombre}
              rareza={logroActual.rareza}
              className="h-14 w-14"
            />
            <div>
              <p className="font-titulo text-xs text-texto2">
                ¡Logro desbloqueado!
              </p>
              <p className="font-titulo text-lg text-ambar">
                {logroActual.nombre}
              </p>
            </div>
          </div>
        </div>
      )}

      <header className="mb-4 flex items-center justify-between">
        <div>
          <Link href={`/sala/${noche.sala_id}`} className="text-sm text-texto2">
            ← {salaNombre}
          </Link>
          <h1 className="font-titulo text-2xl text-ambar">
            {enGracia ? "⏳ Cerrando la noche…" : "🌙 Noche en curso"}
          </h1>
        </div>
        {!enGracia && (
          <div className="rounded-xl border border-borde bg-tarjeta px-3 py-2 text-center">
            <p className="text-[10px] uppercase text-texto2">Queda</p>
            <p className="font-titulo text-cian">
              {formatearRestante(finMs - ahora)}
            </p>
          </div>
        )}
      </header>

      {esAdmin && estadoNoche === "activa" && (
        <div className="mb-6">
          {panelExtender ? (
            <div className="rounded-2xl border border-cian/50 bg-tarjeta p-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={horasExtra}
                  onChange={(e) => setHorasExtra(e.target.value)}
                  className="w-20 rounded-xl border border-borde bg-fondo px-3 py-2 text-center text-sm text-texto"
                />
                <span className="text-sm text-texto2">horas más</span>
                <button
                  onClick={extenderNoche}
                  disabled={extendiendo}
                  className="flex-1 rounded-xl bg-cian py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
                >
                  {extendiendo ? "..." : "Añadir"}
                </button>
                <button
                  onClick={() => setPanelExtender(false)}
                  className="rounded-xl border border-borde px-3 py-2 text-sm text-texto2 active:scale-95"
                >
                  ✕
                </button>
              </div>
              {errorExtender && (
                <p className="mt-2 text-xs text-rosa">{errorExtender}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setPanelExtender(true)}
              className="rounded-xl border border-cian/50 px-3 py-2 text-xs text-cian active:scale-95"
            >
              ⏱️ Extender tiempo
            </button>
          )}
        </div>
      )}

      {!enGracia && !terminada && finMs - ahora <= 5 * 60 * 1000 && (
        <div className="pulso-neon mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-4 text-center">
          <p className="font-titulo text-lg text-rosa">
            ⏳ ¡Últimos minutos!
          </p>
          <p className="font-titulo text-4xl text-rosa">
            {formatearMMSS(finMs - ahora)}
          </p>
          <p className="text-xs text-texto2">
            Al llegar a 0 se bloquean los registros y cualquiera podrá
            revelar el podio
          </p>
        </div>
      )}

      {graciaActiva && (
        <div className="pulso-neon mb-6 rounded-3xl border-2 border-ambar bg-tarjeta p-4 text-center">
          <p className="font-titulo text-lg text-ambar">
            ⏳ Gracia de cierre
          </p>
          <p className="font-titulo text-4xl text-ambar">
            {formatearMMSS((graciaMs ?? ahora) - ahora)}
          </p>
          <p className="text-xs text-texto2">
            Un admin ha cerrado la noche. Todavía puedes registrar a valor
            normal antes de pasar al tiempo extra.
          </p>
        </div>
      )}

      {/* Votación relámpago y penalizaciones, disponibles durante todo el cierre */}
      {enGracia && unido && categoria && (
        <section className="mb-6 rounded-3xl border-2 border-cian bg-tarjeta p-5 glow-cian">
          <p className="text-center font-titulo text-xs uppercase tracking-wide text-texto2">
            🗳️ Votación de la noche
          </p>
          <p className="mb-4 text-center font-titulo text-xl text-cian">
            {categoria}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {jugadores
              .filter((j) => j.id !== userId)
              .map((j) => {
                const miVoto = votos.find(
                  (v) => v.votante_id === userId
                )?.votado_id;
                const votado = miVoto === j.id;
                return (
                  <button
                    key={j.id}
                    onClick={() => votar(j.id)}
                    disabled={votando}
                    className={`rounded-2xl border-2 px-3 py-4 font-titulo transition active:scale-95 disabled:opacity-60 ${
                      votado
                        ? "border-cian bg-cian text-fondo"
                        : "border-borde bg-fondo text-texto"
                    }`}
                  >
                    {votado && "✓ "}
                    {j.nombre}
                  </button>
                );
              })}
          </div>
          {jugadores.length <= 1 ? (
            <p className="mt-3 text-center text-xs text-texto2">
              No hay a quién votar esta noche 🦗
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-texto2">
              {votos.length}/{jugadores.length} han votado · +5 PL por voto
              recibido · puedes cambiarlo hasta que acabe el tiempo
            </p>
          )}
        </section>
      )}

      {graciaExpirada && (
        <div className="mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-5 text-center glow-rosa">
          <p className="font-titulo text-xl text-rosa">
            🕐 Tiempo extra: añade lo olvidado
          </p>
          <p className="text-sm text-texto2">
            Ya pasó la gracia normal. Todavía puedes registrar bebidas que se
            te olvidaron, pero ahora cada una cuenta solo 1 punto.
          </p>
          {unido && (
            <div className="mt-4">
              {yoConfirme ? (
                <p className="text-sm text-lima">
                  ✓ Ya confirmaste que no te falta nada.
                </p>
              ) : (
                <button
                  onClick={confirmarSinMasBebidas}
                  disabled={confirmando}
                  className="w-full rounded-2xl bg-rosa py-3 font-titulo text-fondo active:scale-95 disabled:opacity-50"
                >
                  {confirmando ? "Confirmando…" : "Ya no tengo más bebidas que añadir"}
                </button>
              )}
              <p className="mt-2 text-xs text-texto2">
                {confirmadosSet.size}/{jugadores.length} han confirmado · el
                podio se revela cuando confirméis todos o lo haga un admin
              </p>
            </div>
          )}
        </div>
      )}

      {/* Penalizaciones tipo "ha vomitado", disponibles durante todo el cierre */}
      {enGracia && unido && (
        <section className="mb-6 rounded-3xl border border-borde bg-tarjeta p-4">
          <p className="mb-3 font-titulo text-lg text-texto">
            🚨 Cosas que han pasado
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <select
              value={objetivoPenalizacion}
              onChange={(event) => setObjetivoPenalizacion(event.target.value)}
              className="rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
            >
              <option value="">¿Quién?</option>
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
                </option>
              ))}
            </select>
            <select
              value={tipoPenalizacion}
              onChange={(event) => setTipoPenalizacion(event.target.value)}
              className="rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
            >
              <option value="">¿Qué ha pasado?</option>
              {penalizacionesTipo.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.icono} {tipo.nombre} ({tipo.pl} PL)
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={marcarPenalizacion}
            disabled={!objetivoPenalizacion || !tipoPenalizacion || marcandoPenalizacion}
            className="w-full rounded-xl bg-rosa py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-45"
          >
            {marcandoPenalizacion ? "Marcando…" : "Marcar"}
          </button>

          {penalizaciones.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {penalizaciones.map((p) => {
                const tipo = penalizacionesTipo.find((t) => t.id === p.penalizacion_id);
                if (!tipo) return null;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-fondo px-3 py-2 text-xs text-texto2"
                  >
                    <span>
                      {tipo.icono} {jugadoresMap.get(p.usuario_id) ?? "???"}{" "}
                      {tipo.nombre.toLowerCase()} ({tipo.pl} PL)
                    </span>
                    {p.otorgada_por === userId && (
                      <button
                        onClick={() => quitarPenalizacion(p.id)}
                        className="text-rosa underline"
                      >
                        quitar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {!unido ? (
        <button
          onClick={unirme}
          className="mb-6 w-full rounded-3xl bg-lima p-8 font-titulo text-3xl text-fondo transition active:scale-95"
        >
          🍻 ¡UNIRME A LA NOCHE!
        </button>
      ) : (
        <>
          {/* Mi contador */}
          <div className="relative mb-5 rounded-3xl border border-borde bg-tarjeta p-5 text-center glow-ambar">
            {masUnos.map((m) => (
              <span
                key={m.id}
                className="mas-uno pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-3xl"
              >
                {m.icono} +1
              </span>
            ))}
            <p className="text-xs uppercase tracking-wide text-texto2">
              Tus bebidas esta noche
            </p>
            <p className="font-titulo text-7xl text-ambar">
              {misPuntos.bebidas}
            </p>
            <p className="text-sm text-texto2">{misPuntos.puntos} puntos</p>
            {puedoDeshacer && (
              <button
                onClick={deshacerUltima}
                className="mt-2 rounded-xl border border-rosa px-4 py-2 text-sm text-rosa active:scale-95"
              >
                ↩️ Deshacer última
              </button>
            )}
          </div>

          {/* Botones de bebida */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {bebidas.map((b) => (
              <button
                key={b.id}
                onClick={() => registrarBebida(b)}
                disabled={!puedeRegistrar}
                className="flex min-h-28 flex-col items-center justify-center rounded-3xl border border-borde bg-tarjeta py-4 transition active:scale-90 active:border-ambar disabled:opacity-40"
              >
                <span className="text-5xl">{b.icono}</span>
                <span className="mt-1 font-titulo text-sm text-texto">
                  {b.nombre}
                </span>
                <span className="mt-0.5 text-[11px] text-texto2">
                  {b.puntos} {b.puntos === 1 ? "punto" : "puntos"}
                </span>
              </button>
            ))}
          </div>

          {progresoRetos.some((r) => r.actual > 0) && (
            <section className="mb-6 rounded-3xl border border-borde bg-tarjeta p-4">
              <h2 className="mb-3 font-titulo text-lg text-texto">
                🎯 Progreso de esta noche
              </h2>
              <div className="space-y-3">
                {progresoRetos
                  .filter((r) => r.actual > 0)
                  .map((r) => (
                    <div key={r.slug}>
                      <div className="mb-1 flex items-center justify-between text-xs text-texto2">
                        <span>
                          {r.icono} {r.nombre}
                        </span>
                        <span>
                          {r.actual}/{r.umbral}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-fondo">
                        <div
                          className="h-full rounded-full bg-ambar transition-all"
                          style={{
                            width: `${(r.actual / r.umbral) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          <section className="mb-6 rounded-3xl border border-borde bg-tarjeta p-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-titulo text-lg text-texto">
                  🎴 Cartas de noche
                </h2>
                <p className="text-xs text-texto2">
                  Se gastan al usarlas y afectan a esta noche.
                </p>
              </div>
              <Link href="/inventario" className="text-xs text-cian underline">
                Inventario
              </Link>
            </div>

            {mensajeCarta && (
              <p className="mb-3 rounded-xl bg-fondo px-3 py-2 text-xs text-cian">
                {mensajeCarta}
              </p>
            )}

            {cartasUsables.length === 0 ? (
              <p className="rounded-2xl border border-borde bg-fondo/60 p-4 text-center text-sm text-texto2">
                No tienes cartas jugables ahora mismo.
              </p>
            ) : (
              <ul className="space-y-3">
                {cartasUsables.slice(0, 6).map((carta) => {
                  const cantidad = miInventario.cartas[carta.id] ?? 0;
                  const requiereObjetivo = carta.alcance === "objetivo";
                  return (
                    <li
                      key={carta.id}
                      className="rounded-2xl border border-borde bg-fondo/60 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => setCartaDetalle(carta)}
                        className="flex w-full gap-3 text-left outline-none"
                      >
                        <Image
                          src={carta.imagen}
                          alt={carta.nombre}
                          width={768}
                          height={768}
                          className="h-16 w-16 rounded-xl object-cover"
                          sizes="64px"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="font-titulo text-sm text-texto">
                              {carta.nombre}
                            </p>
                            <span className="rounded-full bg-tarjeta px-2 py-0.5 font-titulo text-xs text-ambar">
                              x{cantidad}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug text-texto2">
                            {carta.efecto}
                          </p>
                        </div>
                      </button>

                      {requiereObjetivo && (
                        <select
                          value={objetivosCarta[carta.id] ?? ""}
                          onChange={(event) =>
                            setObjetivosCarta((prev) => ({
                              ...prev,
                              [carta.id]: event.target.value,
                            }))
                          }
                          className="mt-3 w-full rounded-xl border border-borde bg-tarjeta px-3 py-2 text-sm text-texto"
                        >
                          <option value="">Elegir objetivo</option>
                          {jugadores
                            .filter((jugador) => jugador.id !== userId)
                            .map((jugador) => (
                              <option key={jugador.id} value={jugador.id}>
                                {jugador.nombre}
                              </option>
                            ))}
                        </select>
                      )}

                      {carta.id === "copia-de-seguridad" && (
                        <select
                          value={cartaADuplicar}
                          onChange={(event) => setCartaADuplicar(event.target.value)}
                          className="mt-3 w-full rounded-xl border border-borde bg-tarjeta px-3 py-2 text-sm text-texto"
                        >
                          <option value="">Elegir carta a duplicar</option>
                          {CARTAS_COFRES.filter(
                            (c) =>
                              c.id !== "copia-de-seguridad" &&
                              (c.rareza === "comun" || c.rareza === "rara") &&
                              (miInventario.cartas[c.id] ?? 0) > 0
                          ).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} (x{miInventario.cartas[c.id] ?? 0})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        disabled={
                          usandoCarta === carta.id ||
                          (requiereObjetivo && !objetivosCarta[carta.id]) ||
                          (carta.id === "copia-de-seguridad" && !cartaADuplicar)
                        }
                        onClick={() => usarCarta(carta)}
                        className="mt-3 w-full rounded-xl bg-cian py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-45"
                      >
                        {usandoCarta === carta.id ? "Usando..." : "Usar carta"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {terminada && estadoNoche === "activa" && (
        <div className="mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-5 text-center glow-rosa">
          <p className="font-titulo text-xl text-rosa">⏰ ¡Se acabó el tiempo!</p>
          <p className="text-sm text-texto2">
            Cualquiera puede cerrar la noche y revelar el podio.
          </p>
        </div>
      )}

      {bloqueada && (
        <div className="mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-5 text-center glow-rosa">
          <p className="font-titulo text-xl text-rosa">🔒 Noche cerrada</p>
          <p className="text-sm text-texto2">Cargando el podio…</p>
        </div>
      )}

      {/* Ranking en vivo */}
      {cartasActivas.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-titulo text-lg text-texto">
            ✨ Efectos activos
          </h2>
          <ul className="space-y-2">
            {cartasActivas.slice(0, 8).map((activa) => {
              const carta = cartaPorId(activa.cartaId);
              if (!carta) return null;
              return (
                <li
                  key={activa.id}
                  className="rounded-2xl border border-cian/40 bg-tarjeta px-4 py-3"
                >
                  <p className="font-titulo text-sm text-cian">
                    {carta.nombre}
                  </p>
                  <p className="text-xs text-texto2">
                    {activa.usuarioNombre}
                    {activa.objetivoNombre
                      ? ` → ${activa.objetivoNombre}`
                      : " ha activado la carta"}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 font-titulo text-lg text-texto">
          📊 Ranking en vivo
        </h2>
        {ranking.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-4 text-center text-sm text-texto2">
            Nadie se ha unido todavía…
          </p>
        ) : (
          <ul className="space-y-2">
            {ranking.map((j, i) => (
              <li
                key={j.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  i === 0 && j.puntos > 0
                    ? "border-oro bg-tarjeta"
                    : "border-borde bg-tarjeta"
                }`}
              >
                <span className="flex items-center gap-2 text-texto">
                  <span className="font-titulo text-texto2">{i + 1}.</span>
                  <AvatarFramePreview
                    config={j.avatarConfig}
                    estado={estadoPorBebidas(j.bebidas)}
                    marco={i === 0 && j.puntos > 0 ? "oro" : "madera"}
                    titulo={j.nombre}
                    subtitulo={`${j.puntos} pts · ${j.bebidas} bebidas`}
                    triggerClassName={`h-10 w-10 ${claseTambaleo(j.bebidas)}`}
                    previewClassName="h-72 w-72"
                    asSpan
                  />
                  <span>
                    {j.nombre}
                    {j.id === userId && (
                      <span className="ml-1 text-xs text-texto2">(tú)</span>
                    )}
                    {i === 0 && j.puntos > 0 && " 👑"}
                  </span>
                </span>
                <span className="font-titulo text-ambar">
                  {j.puntos} pts
                  <span className="ml-2 text-xs text-texto2">
                    ({j.bebidas} 🍺)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Feed en vivo */}
      <section className="mb-6">
        <h2 className="mb-3 font-titulo text-lg text-texto">💬 Feed</h2>
        {feed.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-4 text-center text-sm text-texto2">
            El primer trago inaugura la noche 🥂
          </p>
        ) : (
          <ul className="space-y-1.5">
            {feed.map((r) => {
              const b = bebidasMap.get(r.bebida_tipo_id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-tarjeta px-4 py-2 text-sm"
                >
                  <span className="text-texto">
                    <span className="text-cian">
                      {jugadoresMap.get(r.usuario_id) ?? "???"}
                    </span>{" "}
                    {b?.icono} {b?.nombre}
                    {r.retroactivo && (
                      <span className="ml-1 text-texto2" title="Añadida en el tiempo extra: 1 punto">
                        🕐
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-texto2">
                    {new Date(r.ts).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Barra inferior de cierre */}
      {unido && estadoNoche === "activa" && (esAdmin || terminada) && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-fondo via-fondo to-transparent px-5 pb-5 pt-8">
          {errorCierre && (
            <p className="mb-2 rounded-xl bg-tarjeta px-4 py-2 text-center text-sm text-rosa">
              {errorCierre}
            </p>
          )}
          {confirmandoCierre ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmandoCierre(false)}
                className="flex-1 rounded-2xl border border-borde bg-tarjeta py-4 text-texto2 active:scale-95"
              >
                Aún no
              </button>
              <button
                onClick={iniciarCierre}
                disabled={cerrando}
                className="flex-1 rounded-2xl bg-rosa py-4 font-titulo text-fondo active:scale-95 disabled:opacity-50"
              >
                {cerrando ? "Cerrando…" : "Sí, cerrar 🏁"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmandoCierre(true)}
              className="w-full rounded-2xl border-2 border-rosa bg-tarjeta py-4 font-titulo text-lg text-rosa active:scale-95"
            >
              🏁 Cerrar la noche
            </button>
          )}
        </div>
      )}

      {unido && estadoNoche === "cerrando" && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-fondo via-fondo to-transparent px-5 pb-5 pt-8">
          {errorCierre && (
            <p className="mb-2 rounded-xl bg-tarjeta px-4 py-2 text-center text-sm text-rosa">
              {errorCierre}
            </p>
          )}
          {puedeRevelarPodio && graciaExpirada ? (
            <button
              onClick={finalizarNoche}
              disabled={cerrando}
              className="w-full rounded-2xl bg-rosa py-4 font-titulo text-xl text-fondo active:scale-95 disabled:opacity-50"
            >
              {cerrando ? "Calculando…" : "¡Revelar podio! 🏆"}
            </button>
          ) : puedeRevelarPodio ? (
            <button
              onClick={finalizarNoche}
              disabled={cerrando}
              className="w-full rounded-2xl border-2 border-ambar bg-tarjeta py-3 text-sm text-ambar active:scale-95 disabled:opacity-50"
            >
              {cerrando ? "Calculando…" : "Saltarse la espera y revelar ya"}
            </button>
          ) : (
            <p className="text-center text-xs text-texto2">
              {graciaExpirada
                ? `Esperando a que confirméis todos (${confirmadosSet.size}/${jugadores.length}) o a que un admin revele el podio…`
                : "Esperando a que acabe la gracia de cierre…"}
            </p>
          )}
        </div>
      )}

      {cartaDetalle && (
        <CartaDetalleModal
          carta={cartaDetalle}
          cantidad={miInventario.cartas[cartaDetalle.id] ?? 0}
          bloqueada={false}
          onClose={() => setCartaDetalle(null)}
        />
      )}
    </main>
  );
}
