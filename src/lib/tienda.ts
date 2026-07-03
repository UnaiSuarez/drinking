import {
  AVATAR_PREDETERMINADO,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/lib/avatar";
import { type MarcoPerfil } from "@/lib/marcos";

export type TiendaRareza = "comun" | "rara" | "epica" | "legendaria" | "unica";

export type TiendaState = {
  gastadas: number;
  bonus: number;
  marcos: MarcoPerfil[];
  avatares: string[];
  marcoEquipado: MarcoPerfil | null;
  avatarEquipado: string | null;
};

export type TiendaMarco = {
  id: MarcoPerfil;
  nombre: string;
  descripcion: string;
  precio: number;
  rareza: TiendaRareza;
};

export type TiendaAvatar = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  rareza: TiendaRareza;
  imagen: string;
  config: AvatarConfig;
};

export type PersonajeOculto = TiendaAvatar & {
  desbloqueo: string;
  placeholderImagen: string;
};

function avatarIA(
  imagen: string,
  animacion: AvatarConfig["avatarAnimacion"] = "ninguna",
  base: Partial<AvatarConfig> = {}
): AvatarConfig {
  return {
    ...AVATAR_PREDETERMINADO,
    ...base,
    avatarImagen: imagen,
    avatarAnimacion: animacion,
  };
}

export const TIENDA_MARCOS: TiendaMarco[] = [
  {
    id: "cobre",
    nombre: "Cobre de Barra",
    descripcion: "Común, limpio y con brillo de primera ronda.",
    precio: 45,
    rareza: "comun",
  },
  {
    id: "espuma",
    nombre: "Espuma Fresca",
    descripcion: "Común, claro y con aire de caña recién tirada.",
    precio: 60,
    rareza: "comun",
  },
  {
    id: "pegatinas",
    nombre: "Pegatinas de Garito",
    descripcion: "Común, caótico y barato con mucho carácter.",
    precio: 75,
    rareza: "comun",
  },
  {
    id: "pixel",
    nombre: "Arcade Pixel",
    descripcion: "Común, cuadrado y perfecto para la pantalla de perfil.",
    precio: 80,
    rareza: "comun",
  },
  {
    id: "hielo",
    nombre: "Hielo Neón",
    descripcion: "Raro, cristal azul limpio y brillante.",
    precio: 120,
    rareza: "rara",
  },
  {
    id: "disco",
    nombre: "Disco Ball",
    descripcion: "Raro, animado con destellos de pista.",
    precio: 145,
    rareza: "rara",
  },
  {
    id: "prisma",
    nombre: "Prisma Neón",
    descripcion: "Raro, cristal multicolor con chispas.",
    precio: 165,
    rareza: "rara",
  },
  {
    id: "glitch",
    nombre: "Glitch del Ranking",
    descripcion: "Raro, animado como si rompiera la clasificación.",
    precio: 180,
    rareza: "rara",
  },
  {
    id: "vip",
    nombre: "Entrada VIP",
    descripcion: "Épico, dorado de discoteca con aire de reservado.",
    precio: 220,
    rareza: "epica",
  },
  {
    id: "cosmico",
    nombre: "Cósmico",
    descripcion: "Épico, animado con aura espacial.",
    precio: 260,
    rareza: "epica",
  },
  {
    id: "magma",
    nombre: "Magma de After",
    descripcion: "Épico, caliente y animado con llama viva.",
    precio: 290,
    rareza: "epica",
  },
  {
    id: "aureola",
    nombre: "Aureola Premium",
    descripcion: "Épico, brillo noble para perfiles con clase.",
    precio: 320,
    rareza: "epica",
  },
  {
    id: "portal",
    nombre: "Portal Prisma IA",
    descripcion: "Épico IA, cristal dimensional con aura animada.",
    precio: 360,
    rareza: "epica",
  },
  {
    id: "reliquia",
    nombre: "Reliquia Lunar IA",
    descripcion: "Épico IA, plata antigua con polvo de estrellas.",
    precio: 390,
    rareza: "epica",
  },
  {
    id: "trono",
    nombre: "Trono Dorado IA",
    descripcion: "Legendario IA, corona, gemas y destellos reales.",
    precio: 560,
    rareza: "legendaria",
  },
  {
    id: "tormenta",
    nombre: "Tormenta Challenger IA",
    descripcion: "Legendario IA, metal de campeón con rayos animados.",
    precio: 650,
    rareza: "legendaria",
  },
];

export const TIENDA_AVATARES: TiendaAvatar[] = [
  {
    id: "dj-neon",
    nombre: "DJ Neón",
    descripcion: "Retrato IA con cascos, pelo eléctrico y aura neón.",
    precio: 140,
    rareza: "rara",
    imagen: "/avatars/ai/items/dj-neon.webp",
    config: avatarIA("/avatars/ai/items/dj-neon.webp", "neon"),
  },
  {
    id: "rey-barra",
    nombre: "Rey de la Barra",
    descripcion: "Retrato IA con corona y sonrisa de rondas pendientes.",
    precio: 150,
    rareza: "rara",
    imagen: "/avatars/ai/items/rey-barra.webp",
    config: avatarIA("/avatars/ai/items/rey-barra.webp", "brillos"),
  },
  {
    id: "pirata-resaca",
    nombre: "Pirata de Resaca",
    descripcion: "Retrato IA con parche, barba y actitud de abordaje.",
    precio: 160,
    rareza: "rara",
    imagen: "/avatars/ai/items/pirata-resaca.webp",
    config: avatarIA("/avatars/ai/items/pirata-resaca.webp"),
  },
  {
    id: "alien-cubata",
    nombre: "Alien Cubata",
    descripcion: "Retrato IA con copa luminosa y energía de otra liga.",
    precio: 260,
    rareza: "epica",
    imagen: "/avatars/ai/items/alien-cubata.webp",
    config: avatarIA("/avatars/ai/items/alien-cubata.webp", "aura"),
  },
  {
    id: "camarero-rookie",
    nombre: "Camarero Rookie",
    descripcion: "Común IA, simpático y listo para servir caos.",
    precio: 60,
    rareza: "comun",
    imagen: "/avatars/ai/items/camarero-rookie.webp",
    config: avatarIA("/avatars/ai/items/camarero-rookie.webp"),
  },
  {
    id: "karaoke-caos",
    nombre: "Karaoke Caos",
    descripcion: "Común IA, micro neón y cero vergüenza.",
    precio: 70,
    rareza: "comun",
    imagen: "/avatars/ai/items/karaoke-caos.webp",
    config: avatarIA("/avatars/ai/items/karaoke-caos.webp"),
  },
  {
    id: "tuno-botellin",
    nombre: "Tuno del Botellín",
    descripcion: "Común IA, canción dudosa y sonrisa peligrosa.",
    precio: 80,
    rareza: "comun",
    imagen: "/avatars/ai/items/tuno-botellin.webp",
    config: avatarIA("/avatars/ai/items/tuno-botellin.webp"),
  },
  {
    id: "detective-resaca",
    nombre: "Detective de Resaca",
    descripcion: "Raro IA, investiga quién pidió la última.",
    precio: 150,
    rareza: "rara",
    imagen: "/avatars/ai/items/detective-resaca.webp",
    config: avatarIA("/avatars/ai/items/detective-resaca.webp"),
  },
  {
    id: "hechicera-hielo",
    nombre: "Hechicera del Hielo",
    descripcion: "Rara IA, fría, brillante y muy de late night.",
    precio: 170,
    rareza: "rara",
    imagen: "/avatars/ai/items/hechicera-hielo.webp",
    config: avatarIA("/avatars/ai/items/hechicera-hielo.webp", "brillos"),
  },
  {
    id: "astronauta-after",
    nombre: "Astronauta del After",
    descripcion: "Raro IA, vuelve de otra órbita con copa azul.",
    precio: 185,
    rareza: "rara",
    imagen: "/avatars/ai/items/astronauta-after.webp",
    config: avatarIA("/avatars/ai/items/astronauta-after.webp", "neon"),
  },
  {
    id: "samurai-sake",
    nombre: "Samurái del Sake",
    descripcion: "Épico IA, disciplina milenaria y última ronda.",
    precio: 280,
    rareza: "epica",
    imagen: "/avatars/ai/items/samurai-sake.webp",
    config: avatarIA("/avatars/ai/items/samurai-sake.webp", "brillos"),
  },
  {
    id: "reina-neon",
    nombre: "Reina del Neón",
    descripcion: "Épica IA, corona cyber y aura de pista.",
    precio: 320,
    rareza: "epica",
    imagen: "/avatars/ai/items/reina-neon.webp",
    config: avatarIA("/avatars/ai/items/reina-neon.webp", "neon"),
  },
  {
    id: "angel-agua",
    nombre: "Ángel del Agua",
    descripcion: "Legendario IA, hidratación sagrada con aura dorada.",
    precio: 520,
    rareza: "legendaria",
    imagen: "/avatars/ai/items/angel-agua.webp",
    config: avatarIA("/avatars/ai/items/angel-agua.webp", "aura"),
  },
  {
    id: "dios-ultimo-trago",
    nombre: "Dios del Último Trago",
    descripcion: "Legendario IA, copa mítica, oro y rayos de final boss.",
    precio: 650,
    rareza: "legendaria",
    imagen: "/avatars/ai/items/dios-ultimo-trago.webp",
    config: avatarIA("/avatars/ai/items/dios-ultimo-trago.webp", "rayos"),
  },
];

export const PERSONAJES_OCULTOS: PersonajeOculto[] = [
  {
    id: "ultimo-ronda",
    nombre: "El Rubio de la Última Ronda",
    descripcion: "Personaje único, sonrisa peligrosa y croquetas de emergencia.",
    desbloqueo: "Llegará en cofres con un logro secreto de última ronda.",
    precio: 0,
    rareza: "unica",
    imagen: "/avatars/ai/items/ultimo-ronda.webp",
    placeholderImagen: "/avatars/ai/items/secret-locked.webp",
    config: avatarIA("/avatars/ai/items/ultimo-ronda.webp", "ronda"),
  },
  {
    id: "jefe-after",
    nombre: "El Jefe del After",
    descripcion: "Personaje único, shaker en mano y mirada de reservado cerrado.",
    desbloqueo: "Llegará en cofres con una cadena de noches épicas.",
    precio: 0,
    rareza: "unica",
    imagen: "/avatars/ai/items/jefe-after.webp",
    placeholderImagen: "/avatars/ai/items/secret-locked.webp",
    config: avatarIA("/avatars/ai/items/jefe-after.webp", "jefe"),
  },
  {
    id: "narrador-noche",
    nombre: "El Narrador de la Noche",
    descripcion: "Personaje único, móvil arriba y prueba gráfica de todo.",
    desbloqueo: "Llegará en cofres con logros sociales especiales.",
    precio: 0,
    rareza: "unica",
    imagen: "/avatars/ai/items/narrador-noche.webp",
    placeholderImagen: "/avatars/ai/items/secret-locked.webp",
    config: avatarIA("/avatars/ai/items/narrador-noche.webp", "cronica"),
  },
  {
    id: "silencioso-letal",
    nombre: "El Silencioso Letal",
    descripcion: "Personaje único, refresco azul y subida discreta en la tabla.",
    desbloqueo: "Llegará en cofres con un logro oculto de remontada.",
    precio: 0,
    rareza: "unica",
    imagen: "/avatars/ai/items/silencioso-letal.webp",
    placeholderImagen: "/avatars/ai/items/secret-locked.webp",
    config: avatarIA("/avatars/ai/items/silencioso-letal.webp", "letal"),
  },
  {
    id: "guardian-cubata",
    nombre: "El Guardián del Cubata",
    descripcion: "Personaje único, vaso brillante y aura de no-me-lo-toques.",
    desbloqueo: "Llegará en cofres con logros de resistencia y temporada.",
    precio: 0,
    rareza: "unica",
    imagen: "/avatars/ai/items/guardian-cubata.webp",
    placeholderImagen: "/avatars/ai/items/secret-locked.webp",
    config: avatarIA("/avatars/ai/items/guardian-cubata.webp", "guardian"),
  },
];

const MARCOS_COMPRABLES = new Set(TIENDA_MARCOS.map((marco) => marco.id));
const AVATARES_COMPRABLES = new Set(TIENDA_AVATARES.map((avatar) => avatar.id));

export function calcularChapasGanadas(params: {
  xp: number;
  plHistoricos: number;
}) {
  return Math.floor(params.xp / 50) + Math.floor(params.plHistoricos / 10);
}

export function calcularSaldoChapas(params: {
  xp: number;
  plHistoricos: number;
  tienda: TiendaState;
}) {
  return Math.max(
    0,
    calcularChapasGanadas(params) + params.tienda.bonus - params.tienda.gastadas
  );
}

export function parseTiendaState(raw: unknown): TiendaState {
  const base = (raw ?? {}) as {
    tienda?: Partial<TiendaState>;
  };
  const tienda = base.tienda ?? {};
  const marcos = (tienda.marcos ?? []).filter((marco): marco is MarcoPerfil =>
    MARCOS_COMPRABLES.has(marco as MarcoPerfil)
  );
  const avatares = (tienda.avatares ?? []).filter((avatar): avatar is string =>
    AVATARES_COMPRABLES.has(avatar)
  );
  const marcoEquipado =
    tienda.marcoEquipado && marcos.includes(tienda.marcoEquipado)
      ? tienda.marcoEquipado
      : null;
  const avatarEquipado =
    tienda.avatarEquipado && avatares.includes(tienda.avatarEquipado)
      ? tienda.avatarEquipado
      : null;

  return {
    gastadas: Math.max(0, Math.floor(tienda.gastadas ?? 0)),
    bonus: Math.max(0, Math.floor(tienda.bonus ?? 0)),
    marcos,
    avatares,
    marcoEquipado,
    avatarEquipado,
  };
}

export function avatarConfigConTienda(raw: unknown) {
  return {
    ...parseAvatarConfig(raw),
    tienda: parseTiendaState(raw),
  };
}
