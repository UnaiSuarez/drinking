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
  | "liga-challenger"
  // Marcos de nivel (ciclo 0, antes del primer prestigio). Exclusivos: no
  // están en la tienda, solo se consiguen subiendo de nivel.
  | "acero"
  | "zafiro"
  | "rubi"
  | "esmeralda"
  | "platino"
  // Marcos de nivel (ciclo 1+, tras el primer prestigio). Mismos hitos de
  // nivel, otro estilo, para que se note que ya has prestigiado.
  | "obsidiana"
  | "amatista"
  | "topacio"
  | "granate"
  | "corona"
  // Marcos de prestigio (uno por cada ascenso, del 1 al 5). Exclusivos.
  | "eclipse"
  | "supernova"
  | "quasar"
  | "singularidad"
  | "infinito";

/**
 * Orden de "peor a mejor" para mostrar marcos en galerías (Inventario,
 * mejorMarco()). Sigue la misma progresión de rareza que TIENDA_MARCOS
 * (común → rara → épica → legendaria), con los marcos de nivel/prestigio
 * intercalados en el tramo que les corresponde y la liga al final, como su
 * propia escalera independiente.
 */
export const MARCO_ORDEN: MarcoPerfil[] = [
  // Común
  "madera",
  "cobre",
  "espuma",
  "pegatinas",
  "pixel",
  // Rara
  "plata",
  "hielo",
  "disco",
  "prisma",
  "glitch",
  // Épica
  "vip",
  "cosmico",
  "magma",
  "aureola",
  "portal",
  "reliquia",
  // Legendaria
  "trono",
  "tormenta",
  "neon",
  "llamas",
  "challenger",
  "oro",
  // Nivel, ciclo 0
  "acero",
  "zafiro",
  "rubi",
  "esmeralda",
  "platino",
  // Nivel, ciclo 1+
  "obsidiana",
  "amatista",
  "topacio",
  "granate",
  "corona",
  // Prestigio
  "eclipse",
  "supernova",
  "quasar",
  "singularidad",
  "infinito",
  // Liga (escalera propia de la temporada)
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
  acero: {
    nombre: "Acero de Barra",
    descripcion: "Nivel 10. Exclusivo: no se vende, solo se sube de nivel.",
  },
  zafiro: {
    nombre: "Zafiro de Ronda",
    descripcion: "Nivel 20. Exclusivo: no se vende, solo se sube de nivel.",
  },
  rubi: {
    nombre: "Rubí de Barra",
    descripcion: "Nivel 30. Exclusivo: no se vende, solo se sube de nivel.",
  },
  esmeralda: {
    nombre: "Esmeralda Nocturna",
    descripcion: "Nivel 40. Exclusivo: no se vende, solo se sube de nivel.",
  },
  platino: {
    nombre: "Platino de Cierre",
    descripcion: "Nivel 50. Exclusivo: no se vende, solo se sube de nivel.",
  },
  obsidiana: {
    nombre: "Obsidiana Renacida",
    descripcion: "Nivel 10 tras tu primer prestigio. Exclusivo, no se vende.",
  },
  amatista: {
    nombre: "Amatista Renacida",
    descripcion: "Nivel 20 tras tu primer prestigio. Exclusivo, no se vende.",
  },
  topacio: {
    nombre: "Topacio Renacido",
    descripcion: "Nivel 30 tras tu primer prestigio. Exclusivo, no se vende.",
  },
  granate: {
    nombre: "Granate Renacido",
    descripcion: "Nivel 40 tras tu primer prestigio. Exclusivo, no se vende.",
  },
  corona: {
    nombre: "Corona Renacida",
    descripcion: "Nivel 50 tras tu primer prestigio. Exclusivo, no se vende.",
  },
  eclipse: {
    nombre: "Eclipse",
    descripcion: "Recompensa del 1er prestigio. Exclusivo, no se vende.",
  },
  supernova: {
    nombre: "Supernova",
    descripcion: "Recompensa del 2º prestigio. Exclusivo, no se vende.",
  },
  quasar: {
    nombre: "Quásar",
    descripcion: "Recompensa del 3er prestigio. Exclusivo, no se vende.",
  },
  singularidad: {
    nombre: "Singularidad",
    descripcion: "Recompensa del 4º prestigio. Exclusivo, no se vende.",
  },
  infinito: {
    nombre: "Infinito",
    descripcion: "Recompensa del 5º prestigio. Exclusivo, no se vende.",
  },
};

/**
 * Un marco nuevo cada 10 niveles hasta el 50. Al llegar al nivel se añade
 * al inventario (ver recompensar_niveles_xp en Postgres); no se equipa
 * solo, el jugador elige ponérselo desde la tienda/inventario como
 * cualquier otro marco. Son exclusivos de nivel: no están en la tienda.
 *
 * Cambian de estilo la primera vez que haces prestigio: MARCO_NIVEL_HITOS_0
 * son los del ciclo 0 (antes de prestigiar nunca), MARCO_NIVEL_HITOS_1 los
 * de cualquier ciclo 1 o superior. marcosNivelHitos(ciclo) da la lista que
 * corresponde; marcoPorNivel() da el hito más alto ya alcanzado en ese
 * ciclo, usado solo como referencia (p. ej. la animación de subida de
 * nivel), nunca como marco equipado por defecto.
 */
export const MARCO_NIVEL_HITOS_0: { nivel: number; marco: MarcoPerfil }[] = [
  { nivel: 10, marco: "acero" },
  { nivel: 20, marco: "zafiro" },
  { nivel: 30, marco: "rubi" },
  { nivel: 40, marco: "esmeralda" },
  { nivel: 50, marco: "platino" },
];

export const MARCO_NIVEL_HITOS_1: { nivel: number; marco: MarcoPerfil }[] = [
  { nivel: 10, marco: "obsidiana" },
  { nivel: 20, marco: "amatista" },
  { nivel: 30, marco: "topacio" },
  { nivel: 40, marco: "granate" },
  { nivel: 50, marco: "corona" },
];

/** Todos los hitos de nivel posibles, de cualquier ciclo: para validar qué
 * marcos son legítimos en el inventario de un jugador (ver tienda.ts). */
export const MARCO_NIVEL_HITOS_TODOS = [...MARCO_NIVEL_HITOS_0, ...MARCO_NIVEL_HITOS_1];

export function marcosNivelHitos(ciclo: number): { nivel: number; marco: MarcoPerfil }[] {
  return ciclo >= 1 ? MARCO_NIVEL_HITOS_1 : MARCO_NIVEL_HITOS_0;
}

export const MARCO_PRESTIGIO_HITOS: { prestigio: number; marco: MarcoPerfil }[] = [
  { prestigio: 1, marco: "eclipse" },
  { prestigio: 2, marco: "supernova" },
  { prestigio: 3, marco: "quasar" },
  { prestigio: 4, marco: "singularidad" },
  { prestigio: 5, marco: "infinito" },
];

export function marcoPorNivel(nivel: number, ciclo = 0): MarcoPerfil {
  let actual: MarcoPerfil = "madera";
  for (const hito of marcosNivelHitos(ciclo)) {
    if (nivel >= hito.nivel) actual = hito.marco;
  }
  return actual;
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
