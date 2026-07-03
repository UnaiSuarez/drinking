export type LogroFamiliaEscalonada = {
  id: string;
  titulo: string;
  aliases?: string[];
  descripcion: string;
  unidad: string;
  stat: "cervezas" | "chupitos" | "cubatas" | "racha" | "noches";
  fases: {
    slug: string;
    etiqueta: string;
    umbral: number;
  }[];
};

export const LOGRO_FAMILIAS_ESCALONADAS: LogroFamiliaEscalonada[] = [
  {
    id: "cervecero",
    titulo: "Cervecero",
    descripcion: "Acumula cervezas históricas. Caña suma 1; pinta o litro suma 2.",
    unidad: "cervezas eq.",
    stat: "cervezas",
    fases: [
      { slug: "cervecero-i", etiqueta: "I", umbral: 50 },
      { slug: "cervecero-ii", etiqueta: "II", umbral: 150 },
      { slug: "cervecero-iii", etiqueta: "III", umbral: 300 },
      { slug: "cervecero-iv", etiqueta: "IV", umbral: 500 },
    ],
  },
  {
    id: "centurion",
    titulo: "Centurión del Chupito",
    aliases: ["Centurión"],
    descripcion: "Los chupitos se van contando. Roma no se cayó en una ronda.",
    unidad: "chupitos",
    stat: "chupitos",
    fases: [
      { slug: "centurion-i", etiqueta: "I", umbral: 25 },
      { slug: "centurion-ii", etiqueta: "II", umbral: 100 },
      { slug: "centurion-iii", etiqueta: "III", umbral: 300 },
      { slug: "centurion-iv", etiqueta: "IV", umbral: 700 },
    ],
  },
  {
    id: "coctelero",
    titulo: "Coctelero",
    descripcion: "Sube de rango a base de cubatas y mezclas históricas.",
    unidad: "cubatas",
    stat: "cubatas",
    fases: [
      { slug: "coctelero-i", etiqueta: "I", umbral: 25 },
      { slug: "coctelero-ii", etiqueta: "II", umbral: 75 },
      { slug: "coctelero-iii", etiqueta: "III", umbral: 150 },
      { slug: "coctelero-iv", etiqueta: "IV", umbral: 300 },
    ],
  },
  {
    id: "en-racha",
    titulo: "En Racha",
    descripcion: "Encadena noches cerradas asistiendo dentro de la misma sala.",
    unidad: "noches seguidas",
    stat: "racha",
    fases: [
      { slug: "en-racha-i", etiqueta: "I", umbral: 3 },
      { slug: "en-racha-ii", etiqueta: "II", umbral: 5 },
      { slug: "en-racha-iii", etiqueta: "III", umbral: 10 },
    ],
  },
  {
    id: "veterano",
    titulo: "Veterano",
    descripcion: "Cada noche cerrada suma al historial de batalla.",
    unidad: "noches",
    stat: "noches",
    fases: [
      { slug: "veterano-i", etiqueta: "I", umbral: 10 },
      { slug: "veterano-ii", etiqueta: "II", umbral: 40 },
      { slug: "veterano-iii", etiqueta: "III", umbral: 90 },
      { slug: "veterano-iv", etiqueta: "IV", umbral: 175 },
    ],
  },
];

export const LOGROS_ESCALONADOS_SLUGS = new Set(
  LOGRO_FAMILIAS_ESCALONADAS.flatMap((familia) =>
    familia.fases.map((fase) => fase.slug)
  )
);
