import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public", "avatars", "ai", "items");

async function cropCellToWebp(source, cell, out, padding = 20) {
  const { data, info } = await sharp(source)
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
      if (diff > 18 && bright > 42) {
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

  await sharp(source)
    .extract({
      left: cell.left + minX,
      top: cell.top + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .resize(1024, 1024, { fit: "cover", position: "north" })
    .webp({ quality: 90 })
    .toFile(out);
}

const sheets = [
  {
    source: path.join(root, "public", "avatars", "ai", "shop-avatar-sheet.png"),
    cols: 2,
    rows: 2,
    items: [
      { slug: "dj-neon", x: 0, y: 0 },
      { slug: "rey-barra", x: 1, y: 0 },
      { slug: "pirata-resaca", x: 0, y: 1 },
      { slug: "alien-cubata", x: 1, y: 1 },
    ],
  },
  {
    source: path.join(root, "public", "avatars", "ai", "shop-avatar-sheet-02.png"),
    cols: 5,
    rows: 2,
    items: [
      { slug: "camarero-rookie", x: 0, y: 0 },
      { slug: "karaoke-caos", x: 1, y: 0 },
      { slug: "tuno-botellin", x: 2, y: 0 },
      { slug: "detective-resaca", x: 3, y: 0 },
      { slug: "hechicera-hielo", x: 4, y: 0 },
      { slug: "astronauta-after", x: 0, y: 1 },
      { slug: "samurai-sake", x: 1, y: 1 },
      { slug: "reina-neon", x: 2, y: 1 },
      { slug: "angel-agua", x: 3, y: 1 },
      { slug: "dios-ultimo-trago", x: 4, y: 1 },
    ],
  },
  {
    source: path.join(root, "public", "avatars", "ai", "secret-avatar-sheet-01.png"),
    cols: 5,
    rows: 1,
    padding: 36,
    items: [
      { slug: "ultimo-ronda", x: 0, y: 0 },
      { slug: "jefe-after", x: 1, y: 0 },
      { slug: "narrador-noche", x: 2, y: 0 },
      { slug: "silencioso-letal", x: 3, y: 0 },
      { slug: "guardian-cubata", x: 4, y: 0 },
    ],
  },
];

const standaloneItems = [
  {
    source: path.join(root, "public", "avatars", "ai", "secret-locked-source.png"),
    slug: "secret-locked",
  },
];

await fs.mkdir(outDir, { recursive: true });

let total = 0;

for (const sheet of sheets) {
  const image = sharp(sheet.source);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudo leer la hoja ${sheet.source}`);
  }

  const cellW = Math.floor(metadata.width / sheet.cols);
  const cellH = Math.floor(metadata.height / sheet.rows);

  for (const avatar of sheet.items) {
    const left = avatar.x * cellW;
    const top = avatar.y * cellH;
    const out = path.join(outDir, `${avatar.slug}.webp`);
    await cropCellToWebp(
      sheet.source,
      { left, top, width: cellW, height: cellH },
      out,
      sheet.padding ?? 20
    );
    total += 1;
  }
}

for (const item of standaloneItems) {
  await sharp(item.source)
    .resize(1024, 1024, { fit: "cover", position: "center" })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, `${item.slug}.webp`));
  total += 1;
}

console.log(`Generados ${total} avatares IA en ${outDir}`);
