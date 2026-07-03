export type MarcoPerfil =
  | "madera"
  | "plata"
  | "oro"
  | "neon"
  | "llamas"
  | "challenger"
  | "pixel"
  | "hielo"
  | "vip"
  | "cosmico"
  | "cobre"
  | "espuma"
  | "pegatinas"
  | "disco"
  | "prisma"
  | "glitch"
  | "magma"
  | "aureola"
  | "trono"
  | "portal"
  | "tormenta"
  | "reliquia"
  | "liga-bronce"
  | "liga-plata"
  | "liga-oro"
  | "liga-diamante"
  | "liga-maestro"
  | "liga-challenger";

export const MARCO_ORDEN: MarcoPerfil[] = [
  "madera",
  "plata",
  "oro",
  "neon",
  "llamas",
  "challenger",
  "pixel",
  "hielo",
  "vip",
  "cosmico",
  "cobre",
  "espuma",
  "pegatinas",
  "disco",
  "prisma",
  "glitch",
  "magma",
  "aureola",
  "trono",
  "portal",
  "tormenta",
  "reliquia",
  "liga-bronce",
  "liga-plata",
  "liga-oro",
  "liga-diamante",
  "liga-maestro",
  "liga-challenger",
];

export const MARCO_INFO: Record<
  MarcoPerfil,
  { nombre: string; descripcion: string }
> = {
  madera: {
    nombre: "Marco de barra",
    descripcion: "El marco base: recién llegado al bar.",
  },
  plata: {
    nombre: "Marco plateado",
    descripcion: "Se desbloquea al subir de nivel o entrar en Plata.",
  },
  oro: {
    nombre: "Marco dorado",
    descripcion: "Para perfiles con ritmo de podio.",
  },
  neon: {
    nombre: "Marco neón",
    descripcion: "Brilla cuando ya hay leyenda de temporada.",
  },
  llamas: {
    nombre: "Marco en llamas",
    descripcion: "Nivel alto o rango Maestro. Difícil pasar desapercibido.",
  },
  challenger: {
    nombre: "Corona Challenger",
    descripcion: "Reservado al nº1 con PL suficiente.",
  },
  pixel: {
    nombre: "Marco arcade",
    descripcion: "Marco cuadrado de recreativa, desbloqueable en tienda.",
  },
  hielo: {
    nombre: "Marco hielo neón",
    descripcion: "Cristal frío para perfiles con estilo impecable.",
  },
  vip: {
    nombre: "Marco VIP",
    descripcion: "Cordón dorado, entrada reservada y cero cola.",
  },
  cosmico: {
    nombre: "Marco cósmico",
    descripcion: "Una rareza animada para quien viene de otra galaxia.",
  },
  cobre: {
    nombre: "Marco cobre",
    descripcion: "Sencillo, brillante y con sabor a primera ronda.",
  },
  espuma: {
    nombre: "Marco espuma",
    descripcion: "Borde claro con burbujas de barra.",
  },
  pegatinas: {
    nombre: "Marco de pegatinas",
    descripcion: "Caótico, barato y con mucha personalidad.",
  },
  disco: {
    nombre: "Marco disco",
    descripcion: "Luces de pista y reflejos en movimiento.",
  },
  prisma: {
    nombre: "Marco prisma",
    descripcion: "Cristales de neón para perfiles difíciles de ignorar.",
  },
  glitch: {
    nombre: "Marco glitch",
    descripcion: "Parece que el perfil ha roto el ranking.",
  },
  magma: {
    nombre: "Marco magma",
    descripcion: "Calor épico para noches que dejan marca.",
  },
  aureola: {
    nombre: "Marco aureola",
    descripcion: "Brillo noble para quienes sobreviven con clase.",
  },
  trono: {
    nombre: "Trono dorado IA",
    descripcion: "Marco IA legendario con corona y gemas reales.",
  },
  portal: {
    nombre: "Portal prisma IA",
    descripcion: "Marco IA épico con cristales dimensionales.",
  },
  tormenta: {
    nombre: "Tormenta IA",
    descripcion: "Marco IA legendario con rayos y metal de campeón.",
  },
  reliquia: {
    nombre: "Reliquia lunar IA",
    descripcion: "Marco IA épico con plata antigua y polvo de estrellas.",
  },
  "liga-bronce": {
    nombre: "Bronce Resacoso",
    descripcion: "Piedra agrietada y cobre gastado: el inicio de la escalera.",
  },
  "liga-plata": {
    nombre: "Plata Tambaleante",
    descripcion: "Metal plateado torcido con copas cruzadas.",
  },
  "liga-oro": {
    nombre: "Oro Litrona",
    descripcion: "Oro espumoso para quien ya marca diferencia en la sala.",
  },
  "liga-diamante": {
    nombre: "Diamante Etílico",
    descripcion: "Cristales cian y luz fría para el tramo de élite.",
  },
  "liga-maestro": {
    nombre: "Maestro Cubata",
    descripcion: "Llamas, copa y presencia de dominador de temporada.",
  },
  "liga-challenger": {
    nombre: "Challenger del Vodka",
    descripcion: "Corona única del nº1: rayos, destellos y trono vacante.",
  },
};

export function marcoPorNivel(nivel: number): MarcoPerfil {
  if (nivel >= 50) return "llamas";
  if (nivel >= 25) return "neon";
  if (nivel >= 10) return "oro";
  if (nivel >= 5) return "plata";
  return "madera";
}

export function marcoPorLiga(pl: number, esTop1 = false): MarcoPerfil {
  if (pl >= 300 && esTop1) return "liga-challenger";
  if (pl >= 300) return "liga-maestro";
  if (pl >= 210) return "liga-diamante";
  if (pl >= 125) return "liga-oro";
  if (pl >= 50) return "liga-plata";
  return "liga-bronce";
}

export function mejorMarco(...marcos: MarcoPerfil[]): MarcoPerfil {
  return marcos.reduce((mejor, actual) =>
    MARCO_ORDEN.indexOf(actual) > MARCO_ORDEN.indexOf(mejor) ? actual : mejor
  );
}
