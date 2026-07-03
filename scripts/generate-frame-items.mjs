import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public", "frames", "ai", "items");

const sheets = [
  {
    source: path.join(root, "public", "frames", "ai", "shop-frame-sheet-01.png"),
    cols: 4,
    rows: 1,
    frames: [
      { slug: "trono", x: 0, y: 0 },
      { slug: "portal", x: 1, y: 0 },
      { slug: "tormenta", x: 2, y: 0 },
      { slug: "reliquia", x: 3, y: 0 },
    ],
  },
  {
    source: path.join(root, "public", "frames", "ai", "league-frame-sheet-01.png"),
    cols: 3,
    rows: 2,
    frames: [
      { slug: "liga-bronce", x: 0, y: 0 },
      { slug: "liga-plata", x: 1, y: 0 },
      { slug: "liga-oro", x: 2, y: 0 },
      { slug: "liga-diamante", x: 0, y: 1 },
      { slug: "liga-maestro", x: 1, y: 1 },
      { slug: "liga-challenger", x: 2, y: 1 },
    ],
  },
];

async function cropCellToWebp(sourcePath, cell, out, padding = 28) {
  const { data, info } = await sharp(sourcePath)
    .extract(cell)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const corner = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [
    corner(0, 0),
    corner(info.width - 1, 0),
    corner(0, info.height - 1),
    corner(info.width - 1, info.height - 1),
  ];
  const bg = corners
    .reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0])
    .map((v) => v / corners.length);
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const diff = Math.max(
        Math.abs(data[i] - bg[0]),
        Math.abs(data[i + 1] - bg[1]),
        Math.abs(data[i + 2] - bg[2])
      );
      const bright = data[i] + data[i + 1] + data[i + 2];
      if (diff > 18 && bright > 38) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    minX = 0;
    minY = 0;
    maxX = info.width - 1;
    maxY = info.height - 1;
  }

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(info.width - 1, maxX + padding);
  maxY = Math.min(info.height - 1, maxY + padding);

  await sharp(sourcePath)
    .extract({
      left: cell.left + minX,
      top: cell.top + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .resize(1024, 1024, { fit: "contain", background: "#0d0e1a" })
    .webp({ quality: 92 })
    .toFile(out);
}

await fs.mkdir(outDir, { recursive: true });

let total = 0;

for (const sheet of sheets) {
  const metadata = await sharp(sheet.source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudo leer la hoja ${sheet.source}`);
  }

  const cellW = Math.floor(metadata.width / sheet.cols);
  const cellH = Math.floor(metadata.height / sheet.rows);

  for (const frame of sheet.frames) {
    const left = frame.x * cellW;
    const top = frame.y * cellH;
    const out = path.join(outDir, `${frame.slug}.webp`);
    await cropCellToWebp(sheet.source, { left, top, width: cellW, height: cellH }, out);
    total += 1;
  }
}

console.log(`Generados ${total} marcos IA en ${outDir}`);
