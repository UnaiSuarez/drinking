import {
  CARTAS_COFRES,
  COFRES_TIPOS,
  MONEDA_COFRES,
  type CartaCofre,
  type CartaRareza,
  type CofreTipo,
} from "@/lib/cofresDesign";
import { PERSONAJES_OCULTOS, type PersonajeOculto, type TiendaState } from "@/lib/tienda";

export type InventarioState = {
  cofres: Record<string, number>;
  cartas: Record<string, number>;
  cartasActivas: CartaActiva[];
  personajeFragmentos: Record<string, number>;
  personajesOcultos: string[];
  podiosPremiados: string[];
  historialAperturas: Array<{
    id: string;
    cofre: string;
    fecha: string;
    recompensas: string[];
  }>;
};

export type CartaActiva = {
  id: string;
  cartaId: string;
  nocheId: string;
  usuarioId: string;
  usuarioNombre: string;
  objetivoId?: string;
  objetivoNombre?: string;
  usadaEn: string;
  expiraEn?: string;
};

export const FRAGMENTOS_PERSONAJE_NECESARIOS = 3;

export type RecompensaCofre =
  | {
      id: string;
      tipo: "monedas";
      nombre: string;
      cantidad: number;
      rareza: CartaRareza;
      imagen: string;
      descripcion: string;
    }
  | {
      id: string;
      tipo: "carta";
      cartaId: string;
      nombre: string;
      rareza: CartaRareza;
      imagen: string;
      descripcion: string;
      oculta: boolean;
    }
  | {
      id: string;
      tipo: "fragmentoPersonaje";
      personajeId: string;
      nombre: string;
      rareza: "unica";
      imagen: string;
      descripcion: string;
      fragmentos: number;
      necesarios: number;
    };

function numeroSeguro(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor)
    ? Math.max(0, Math.floor(valor))
    : 0;
}

function mapaCantidades(raw: unknown, idsValidos: Set<string>) {
  const salida: Record<string, number> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return salida;

  for (const [id, cantidad] of Object.entries(raw)) {
    if (!idsValidos.has(id)) continue;
    const n = numeroSeguro(cantidad);
    if (n > 0) salida[id] = n;
  }

  return salida;
}

export function parseInventarioState(raw: unknown): InventarioState {
  const base = (raw ?? {}) as {
    inventario?: Partial<InventarioState>;
  };
  const inventario = base.inventario ?? {};
  const cofresValidos = new Set(COFRES_TIPOS.map((cofre) => cofre.id));
  const cartasValidas = new Set(CARTAS_COFRES.map((carta) => carta.id));

  const personajesOcultos = Array.isArray(inventario.personajesOcultos)
    ? inventario.personajesOcultos.filter(
        (id): id is string => typeof id === "string"
      )
    : [];
  const personajeFragmentos = mapaCantidades(
    inventario.personajeFragmentos,
    new Set(PERSONAJES_OCULTOS.map((personaje) => personaje.id))
  );
  const cartasActivas = Array.isArray(inventario.cartasActivas)
    ? inventario.cartasActivas
        .filter((entrada) => entrada && typeof entrada === "object")
        .map((entrada) => entrada as CartaActiva)
        .filter(
          (entrada) =>
            typeof entrada.id === "string" &&
            typeof entrada.cartaId === "string" &&
            typeof entrada.nocheId === "string" &&
            typeof entrada.usuarioId === "string" &&
            typeof entrada.usuarioNombre === "string" &&
            typeof entrada.usadaEn === "string"
        )
        .slice(0, 80)
    : [];
  const podiosPremiados = Array.isArray(inventario.podiosPremiados)
    ? inventario.podiosPremiados.filter(
        (id): id is string => typeof id === "string"
      )
    : [];

  const historialAperturas = Array.isArray(inventario.historialAperturas)
    ? inventario.historialAperturas
        .filter((entrada) => entrada && typeof entrada === "object")
        .map((entrada) => entrada as InventarioState["historialAperturas"][number])
        .filter(
          (entrada) =>
            typeof entrada.id === "string" &&
            typeof entrada.cofre === "string" &&
            typeof entrada.fecha === "string" &&
            Array.isArray(entrada.recompensas)
        )
        .slice(0, 20)
    : [];

  return {
    cofres: mapaCantidades(inventario.cofres, cofresValidos),
    cartas: mapaCantidades(inventario.cartas, cartasValidas),
    cartasActivas,
    personajeFragmentos,
    personajesOcultos,
    podiosPremiados,
    historialAperturas,
  };
}

export function totalItems(mapa: Record<string, number>) {
  return Object.values(mapa).reduce((total, cantidad) => total + cantidad, 0);
}

function elegirPonderado<T extends string>(
  pesos: Record<T, number>,
  random = Math.random
): T {
  const entradas = Object.entries(pesos) as Array<[T, number]>;
  const total = entradas.reduce((acc, [, peso]) => acc + peso, 0);
  let tirada = random() * total;

  for (const [clave, peso] of entradas) {
    tirada -= peso;
    if (tirada <= 0) return clave;
  }

  return entradas[entradas.length - 1][0];
}

function elegirAleatorio<T>(items: T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)];
}

function cartasPorRareza(rareza: CartaRareza) {
  return CARTAS_COFRES.filter((carta) => carta.rareza === rareza);
}

function cantidadMonedas(cofre: CofreTipo, premium: boolean, random = Math.random) {
  const rangos: Record<CofreTipo["id"], [number, number]> = {
    comun: [20, 65],
    epico: [75, 190],
    legendario: [180, 460],
  };
  const [min, max] = rangos[cofre.id];
  const extra = premium ? Math.round(max * 0.55) : 0;
  return Math.round(min + random() * (max - min) + extra);
}

function recompensaMonedas(
  cofre: CofreTipo,
  premium: boolean,
  random = Math.random
): RecompensaCofre {
  const cantidad = cantidadMonedas(cofre, premium, random);
  return {
    id: `monedas-${crypto.randomUUID()}`,
    tipo: "monedas",
    nombre: `${cantidad} chapas`,
    cantidad,
    rareza: premium ? "epica" : cofre.id === "legendario" ? "rara" : "comun",
    imagen: cantidad >= 100 ? MONEDA_COFRES.montonImagen : MONEDA_COFRES.imagen,
    descripcion: "Chapas directas para gastar en tienda.",
  };
}

function recompensaCarta(
  rareza: CartaRareza,
  random = Math.random
): RecompensaCofre {
  const carta = elegirAleatorio(cartasPorRareza(rareza), random);
  return recompensaDesdeCarta(carta);
}

function recompensaDesdeCarta(carta: CartaCofre): RecompensaCofre {
  return {
    id: `carta-${carta.id}-${crypto.randomUUID()}`,
    tipo: "carta",
    cartaId: carta.id,
    nombre: carta.nombre,
    rareza: carta.rareza,
    imagen: carta.imagen,
    descripcion: carta.descripcion,
    oculta: Boolean(carta.oculta),
  };
}

function recompensaPersonaje(
  inventario: InventarioState,
  random = Math.random
): RecompensaCofre | null {
  const pendientes = PERSONAJES_OCULTOS.filter(
    (personaje) => !inventario.personajesOcultos.includes(personaje.id)
  );
  const personaje = elegirAleatorio(
    pendientes.length > 0 ? pendientes : PERSONAJES_OCULTOS,
    random
  );

  if (!personaje) return null;

  return {
    id: `fragmento-${personaje.id}-${crypto.randomUUID()}`,
    tipo: "fragmentoPersonaje",
    personajeId: personaje.id,
    nombre: `Fragmento: ${personaje.nombre}`,
    rareza: "unica",
    imagen: personaje.imagen,
    descripcion: "Fragmento de personaje oculto. Reune 3 para desbloquearlo.",
    fragmentos: 1,
    necesarios: FRAGMENTOS_PERSONAJE_NECESARIOS,
  };
}

function resultadoSlot(
  cofre: CofreTipo,
  inventario: InventarioState,
  premium: boolean,
  random = Math.random
): RecompensaCofre {
  const tipo = premium
    ? elegirPonderado(
        {
          monedas: 15,
          epica: 45,
          legendaria: 34,
          personajeOculto: 6,
        },
        random
      )
    : elegirPonderado(cofre.ratios, random);

  if (tipo === "monedas") return recompensaMonedas(cofre, premium, random);
  if (tipo === "personajeOculto") {
    return recompensaPersonaje(inventario, random) ?? recompensaMonedas(cofre, true, random);
  }

  return recompensaCarta(tipo, random);
}

export function generarAperturaCofre(
  cofreId: CofreTipo["id"],
  inventario: InventarioState,
  random = Math.random
) {
  const cofre = COFRES_TIPOS.find((item) => item.id === cofreId);
  if (!cofre) throw new Error(`Cofre desconocido: ${cofreId}`);

  return Array.from({ length: cofre.cartas }, (_, index) =>
    resultadoSlot(cofre, inventario, cofre.id === "legendario" && index === 0, random)
  );
}

export function aplicarRecompensas(params: {
  inventario: InventarioState;
  tienda: TiendaState;
  cofreId: CofreTipo["id"];
  recompensas: RecompensaCofre[];
}) {
  const nextInventario: InventarioState = {
    ...params.inventario,
    cofres: { ...params.inventario.cofres },
    cartas: { ...params.inventario.cartas },
    cartasActivas: [...params.inventario.cartasActivas],
    personajeFragmentos: { ...params.inventario.personajeFragmentos },
    personajesOcultos: [...params.inventario.personajesOcultos],
    podiosPremiados: [...params.inventario.podiosPremiados],
    historialAperturas: [...params.inventario.historialAperturas],
  };
  const nextTienda: TiendaState = { ...params.tienda };

  nextInventario.cofres[params.cofreId] = Math.max(
    0,
    (nextInventario.cofres[params.cofreId] ?? 0) - 1
  );

  for (const recompensa of params.recompensas) {
    if (recompensa.tipo === "monedas") {
      nextTienda.bonus += recompensa.cantidad;
    } else if (recompensa.tipo === "carta") {
      nextInventario.cartas[recompensa.cartaId] =
        (nextInventario.cartas[recompensa.cartaId] ?? 0) + 1;
    } else {
      if (nextInventario.personajesOcultos.includes(recompensa.personajeId)) {
        nextTienda.bonus += 250;
      } else {
        const total =
          (nextInventario.personajeFragmentos[recompensa.personajeId] ?? 0) +
          recompensa.fragmentos;
        nextInventario.personajeFragmentos[recompensa.personajeId] = total;
        if (total >= recompensa.necesarios) {
          nextInventario.personajesOcultos.push(recompensa.personajeId);
        }
      }
    }
  }

  nextInventario.historialAperturas = [
    {
      id: crypto.randomUUID(),
      cofre: params.cofreId,
      fecha: new Date().toISOString(),
      recompensas: params.recompensas.map((recompensa) => recompensa.nombre),
    },
    ...nextInventario.historialAperturas,
  ].slice(0, 20);

  return { inventario: nextInventario, tienda: nextTienda };
}

export function personajeOcultoPorId(id: string): PersonajeOculto | null {
  return PERSONAJES_OCULTOS.find((personaje) => personaje.id === id) ?? null;
}

export function cartaPorId(id: string): CartaCofre | null {
  return CARTAS_COFRES.find((carta) => carta.id === id) ?? null;
}

function duracionCartaMs(cartaId: string) {
  if (cartaId === "noche-x10") return 5 * 60 * 1000;
  if (cartaId === "happy-hour-salvaje") return 60 * 60 * 1000;
  if (cartaId === "ronda-relampago") return 10 * 60 * 1000;
  if (cartaId === "ultimo-aviso") return 15 * 60 * 1000;
  if (cartaId === "cubata-obligatorio") return 45 * 60 * 1000;
  if (cartaId === "chupito-castigo") return 30 * 60 * 1000;
  if (cartaId === "doble-o-nada") return 30 * 60 * 1000;
  return 30 * 60 * 1000;
}

export function usarCartaEnNoche(params: {
  inventario: InventarioState;
  cartaId: string;
  nocheId: string;
  usuarioId: string;
  usuarioNombre: string;
  objetivoId?: string;
  objetivoNombre?: string;
  ahora?: Date;
}) {
  const carta = cartaPorId(params.cartaId);
  if (!carta) return null;
  if ((params.inventario.cartas[params.cartaId] ?? 0) <= 0) return null;

  const ahora = params.ahora ?? new Date();
  const expiraEn = new Date(ahora.getTime() + duracionCartaMs(params.cartaId));
  const activa: CartaActiva = {
    id: crypto.randomUUID(),
    cartaId: params.cartaId,
    nocheId: params.nocheId,
    usuarioId: params.usuarioId,
    usuarioNombre: params.usuarioNombre,
    objetivoId: params.objetivoId,
    objetivoNombre: params.objetivoNombre,
    usadaEn: ahora.toISOString(),
    expiraEn: expiraEn.toISOString(),
  };

  return {
    carta,
    inventario: {
      ...params.inventario,
      cartas: {
        ...params.inventario.cartas,
        [params.cartaId]: Math.max(
          0,
          (params.inventario.cartas[params.cartaId] ?? 0) - 1
        ),
      },
      cartasActivas: [activa, ...params.inventario.cartasActivas].slice(0, 80),
    },
  };
}

export function cartasActivasDeNoche(rawConfigs: unknown[], nocheId: string, ahora = Date.now()) {
  return rawConfigs
    .flatMap((raw) => parseInventarioState(raw).cartasActivas)
    .filter((activa) => {
      if (activa.nocheId !== nocheId) return false;
      if (!activa.expiraEn) return true;
      return new Date(activa.expiraEn).getTime() > ahora;
    });
}
