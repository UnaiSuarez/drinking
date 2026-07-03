export type MedalSprite = {
  sheet: number;
  row: number;
  col: number;
  src: string;
};

const ENTRIES: Array<[string, number, number, number]> = [
  // Add new season medals here as [slug, sheet, row, col], then run
  // `node scripts/generate-medal-items.mjs`. If a sheet cell is imperfect,
  // place a full source image at public/medals/ai/overrides/<slug>.png.
  ["ronda-torera", 1, 1, 1],
  ["media-docena", 1, 1, 2],
  ["poker-de-copas", 1, 1, 3],
  ["combo", 1, 1, 4],
  ["happy-hour", 1, 2, 1],
  ["kamikaze", 1, 2, 2],
  ["sprint", 1, 2, 3],
  ["turbo", 1, 2, 4],
  ["degustador", 1, 3, 1],
  ["buho", 1, 3, 2],
  ["madrugador", 1, 3, 3],
  ["hidratado", 1, 3, 4],
  ["el-fantasma", 2, 1, 1],
  ["gallina", 2, 1, 2],
  ["desaparecido-en-combate", 2, 1, 3],
  ["sobrio-designado", 2, 1, 4],
  ["eterno-segundon", 2, 2, 1],
  ["en-horas-bajas", 2, 2, 2],
  ["la-remontada", 2, 2, 3],
  ["tricampeon", 2, 2, 4],
  ["dinastia", 2, 3, 1],
  ["gemelos", 2, 3, 2],
  ["cumpleanero-legendario", 2, 3, 3],
  ["cumpleanero-responsable", 2, 3, 4],
  ["grillo", 3, 1, 1],
  ["el-caballo-negro", 3, 1, 2],
  ["lunes-de-oficina", 3, 1, 3],
  ["la-siesta", 3, 1, 4],
  ["cervecero-i", 3, 2, 1],
  ["cervecero-ii", 3, 2, 2],
  ["cervecero-iii", 3, 2, 3],
  ["cervecero-iv", 3, 2, 4],
  ["centurion-i", 3, 3, 1],
  ["centurion-ii", 3, 3, 2],
  ["centurion-iii", 3, 3, 3],
  ["centurion-iv", 3, 3, 4],
  ["coctelero-i", 4, 1, 1],
  ["coctelero-ii", 4, 1, 2],
  ["coctelero-iii", 4, 1, 3],
  ["coctelero-iv", 4, 1, 4],
  ["el-oceano", 4, 2, 1],
  ["monumento-nacional", 4, 2, 2],
  ["enciclopedia-etilica", 4, 2, 3],
  ["en-racha-i", 4, 2, 4],
  ["en-racha-ii", 4, 3, 1],
  ["en-racha-iii", 4, 3, 2],
  ["fijo-de-la-casa", 4, 3, 3],
  ["escalador", 4, 3, 4],
  ["campeon-de-temporada", 5, 1, 1],
  ["lento-pero-seguro", 5, 1, 2],
  ["veterano-i", 5, 1, 3],
  ["veterano-ii", 5, 1, 4],
  ["veterano-iii", 5, 2, 1],
  ["veterano-iv", 5, 2, 2],
  ["el-jackpot", 5, 2, 3],
  ["el-espejo", 5, 2, 4],
  ["cenicienta", 5, 3, 1],
  ["licantropo", 5, 3, 2],
  ["el-perfecto", 5, 3, 3],
  ["111", 5, 3, 4],
  ["ano-nuevo-congelado", 6, 1, 1],
  ["leyenda-suicida", 6, 1, 2],
  ["francotirador", 6, 1, 3],
  ["el-muro", 6, 1, 4],
  ["secreto-raro", 6, 2, 2],
  ["secreto-epico", 6, 2, 3],
  ["secreto-legendario", 6, 2, 4],
  ["general-repetible-comun", 6, 3, 1],
  ["general-repetible-raro", 6, 3, 2],
  ["general-epico", 6, 3, 3],
  ["general-legendario", 6, 3, 4],
];

const SPRITES = new Map(
  ENTRIES.map(([slug, sheet, row, col]) => [
    slug,
    { sheet, row, col, src: `/medals/ai/items-main/${slug}.webp?v=2` },
  ])
);

const ALIASES: Record<string, string> = {
  "ganador-de-la-noche": "campeon-de-temporada",
  ganador: "campeon-de-temporada",
  campeon: "campeon-de-temporada",
  buho: "buho",
  "b u h o": "buho",
  "poker-de-copas": "poker-de-copas",
  "poquer-de-copas": "poker-de-copas",
  "ano-nuevo-congelado": "ano-nuevo-congelado",
  "año-nuevo-congelado": "ano-nuevo-congelado",
  "en-racha": "en-racha-i",
  cervecero: "cervecero-i",
  centurion: "centurion-i",
  coctelero: "coctelero-i",
  veterano: "veterano-i",
};

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function medalSpriteFor(params: {
  slug?: string;
  nombre?: string;
}): MedalSprite | null {
  const candidatos = [params.slug, params.nombre]
    .filter((v): v is string => Boolean(v))
    .map(normalizar);

  for (const candidato of candidatos) {
    const directo = SPRITES.get(candidato);
    if (directo) return directo;
    const alias = ALIASES[candidato];
    if (alias) return SPRITES.get(alias) ?? null;
  }

  return null;
}
