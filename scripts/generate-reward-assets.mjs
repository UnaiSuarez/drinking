import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const cardsOutDir = path.join(root, "public", "cards", "ai", "items");
const chestsOutDir = path.join(root, "public", "chests", "ai", "items");
const darkBackground = { r: 5, g: 9, b: 28, alpha: 1 };

const cardSheets = [
  {
    source: path.join(root, "public", "cards", "ai", "sheets", "sheet-01.png"),
    cols: 3,
    rows: 4,
    outputSize: 768,
    xBounds: [0, 397, 817, 1254],
    yBounds: [0, 341, 662, 964, 1254],
    items: [
      "cubata-obligatorio",
      "chupito-castigo",
      "ronda-relampago",
      "escudo-resaca",
      "cambio-de-vaso",
      "todos-al-bar",
      "selfie-obligatoria",
      "pirata-del-hielo",
      "ticket-barra-libre",
      "ultimo-aviso",
      "salpicon-puntos",
      "brindis-forzado",
    ],
  },
  {
    source: path.join(root, "public", "cards", "ai", "sheets", "sheet-02.png"),
    cols: 3,
    rows: 4,
    outputSize: 768,
    xBounds: [0, 410, 791, 1254],
    yBounds: [0, 333, 640, 933, 1254],
    items: [
      "doble-o-nada",
      "triple-amenaza",
      "noche-x10",
      "happy-hour-salvaje",
      "candado-de-barra",
      "mano-larga",
      "copia-de-seguridad",
      "espejo-borracho",
      "remontada-imposible",
      "maldicion-del-lider",
      "inmunidad-vip",
      "ruleta-del-bar",
    ],
  },
  {
    source: path.join(root, "public", "cards", "ai", "sheets", "sheet-03.png"),
    cols: 3,
    rows: 4,
    outputSize: 768,
    xBounds: [0, 414, 833, 1254],
    yBounds: [0, 367, 700, 979, 1254],
    items: [
      "trono-del-campeon",
      "tormenta-challenger",
      "jackpot-siete",
      "luna-llena",
      "confeti-caos",
      "sombra-del-after",
      "dado-maldito",
      "brindis-prohibido",
      "coronacion-secreta",
      "lluvia-de-chapas",
      "meteorito-de-caos",
      "caliz-final-boss",
    ],
  },
];

const chestSheets = [
  {
    source: path.join(root, "public", "chests", "ai", "sheets", "rewards-sheet-01.png"),
    cols: 4,
    rows: 2,
    outputSize: 768,
    items: [
      "cofre-comun",
      "cofre-epico",
      "cofre-legendario",
      "chapa",
      "chapas-monton",
      "card-back-comun",
      "card-back-epica",
      "card-back-legendaria",
    ],
  },
];

async function cropSheet(
  { source, cols, rows, outputSize, items, xBounds, yBounds },
  outDir
) {
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudo leer la hoja ${source}`);
  }

  const inset = 6;
  let total = 0;

  for (let index = 0; index < items.length; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const left = xBounds?.[col] ?? Math.round((col * metadata.width) / cols);
    const right =
      xBounds?.[col + 1] ?? Math.round(((col + 1) * metadata.width) / cols);
    const top = yBounds?.[row] ?? Math.round((row * metadata.height) / rows);
    const bottom =
      yBounds?.[row + 1] ?? Math.round(((row + 1) * metadata.height) / rows);
    const outputPath = path.join(outDir, `${items[index]}.webp`);

    await sharp(source)
      .extract({
        left: left + inset,
        top: top + inset,
        width: right - left - inset * 2,
        height: bottom - top - inset * 2,
      })
      .resize(outputSize, outputSize, {
        fit: "contain",
        background: darkBackground,
      })
      .webp({ quality: 92 })
      .toFile(outputPath);

    total += 1;
  }

  return total;
}

await fs.mkdir(cardsOutDir, { recursive: true });
await fs.mkdir(chestsOutDir, { recursive: true });

let total = 0;
for (const sheet of cardSheets) total += await cropSheet(sheet, cardsOutDir);
for (const sheet of chestSheets) total += await cropSheet(sheet, chestsOutDir);

console.log(`Generados ${total} assets de cofres/cartas.`);
