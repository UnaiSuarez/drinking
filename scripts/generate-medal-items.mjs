import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SPRITES_FILE = path.join(ROOT, "src", "lib", "medalSprites.ts");
const SHEETS_DIR = path.join(ROOT, "public", "medals", "ai", "sheets");
const OVERRIDES_DIR = path.join(ROOT, "public", "medals", "ai", "overrides");
const OUTPUT_DIR = path.join(ROOT, "public", "medals", "ai", "items-main");

const CELL_SIZE = 362;
const OUTPUT_SIZE = 512;
const MEDAL_BOX = 360;
const ALPHA_THRESHOLD = 22;
const MIN_OUTPUT_MARGIN = 56;

function readEntries() {
  const source = fs.readFileSync(SPRITES_FILE, "utf8");
  return [...source.matchAll(/\["([^"]+)",\s*(\d+),\s*(\d+),\s*(\d+)\]/g)].map(
    ([, slug, sheet, row, col]) => ({
      slug,
      sheet: Number(sheet),
      row: Number(row),
      col: Number(col),
    })
  );
}

function overridePathFor(slug) {
  const candidates = [".png", ".webp", ".jpg", ".jpeg"].map((extension) =>
    path.join(OVERRIDES_DIR, `${slug}${extension}`)
  );

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function alphaForPixel(r, g, b, a) {
  const strongGreen = g > 130 && g - r > 48 && g - b > 48;
  const softGreen = g > 115 && g - r > 30 && g - b > 30;

  if (strongGreen && g > r * 1.22 && g > b * 1.22) return 0;
  if (softGreen && g > r * 1.12 && g > b * 1.12) return Math.floor(a * 0.16);
  return a;
}

async function readSourceImage(entry) {
  const overridePath = overridePathFor(entry.slug);
  if (overridePath) {
    const raw = await sharp(overridePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return { raw, sourcePath: overridePath, isOverride: true };
  }

  const sheetPath = path.join(
    SHEETS_DIR,
    `sheet-${String(entry.sheet).padStart(2, "0")}.png`
  );
  const raw = await sharp(sheetPath)
    .extract({
      left: (entry.col - 1) * CELL_SIZE,
      top: (entry.row - 1) * CELL_SIZE,
      width: CELL_SIZE,
      height: CELL_SIZE,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { raw, sourcePath: sheetPath, isOverride: false };
}

function findComponents(data, width, height, channels) {
  const total = width * height;
  const seen = new Uint8Array(total);
  const queueX = new Int32Array(total);
  const queueY = new Int32Array(total);
  const components = [];

  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      const startIndex = startY * width + startX;
      if (seen[startIndex] || data[startIndex * channels + 3] <= ALPHA_THRESHOLD) {
        continue;
      }

      let head = 0;
      let tail = 0;
      let area = 0;
      let minX = startX;
      let minY = startY;
      let maxX = startX;
      let maxY = startY;
      const pixels = [];

      seen[startIndex] = 1;
      queueX[tail] = startX;
      queueY[tail] = startY;
      tail++;

      while (head < tail) {
        const x = queueX[head];
        const y = queueY[head];
        head++;
        area++;

        const pixelIndex = y * width + x;
        pixels.push(pixelIndex);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

            const neighborIndex = ny * width + nx;
            if (
              seen[neighborIndex] ||
              data[neighborIndex * channels + 3] <= ALPHA_THRESHOLD
            ) {
              continue;
            }

            seen[neighborIndex] = 1;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail++;
          }
        }
      }

      components.push({ area, minX, minY, maxX, maxY, pixels });
    }
  }

  return components.sort((a, b) => b.area - a.area);
}

function keepOnlyMainMedal(data, width, height, channels) {
  const components = findComponents(data, width, height, channels);
  const main = components[0];
  if (!main) return null;

  for (const component of components.slice(1)) {
    for (const pixelIndex of component.pixels) {
      data[pixelIndex * channels + 3] = 0;
    }
  }

  return main;
}

function boundsForAlpha(data, width, height, channels) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) {
    return { left: 0, top: 0, width, height };
  }

  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function generateMedal(entry) {
  const { raw } = await readSourceImage(entry);

  const data = Buffer.from(raw.data);
  const { width, height, channels } = raw.info;

  for (let index = 0; index < data.length; index += channels) {
    data[index + 3] = alphaForPixel(
      data[index],
      data[index + 1],
      data[index + 2],
      data[index + 3]
    );
  }

  keepOnlyMainMedal(data, width, height, channels);

  const bounds = boundsForAlpha(data, width, height, channels);
  const medalPng = await sharp(data, {
    raw: { width, height, channels },
  })
    .extract(bounds)
    .resize({
      width: MEDAL_BOX,
      height: MEDAL_BOX,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const offset = Math.floor((OUTPUT_SIZE - MEDAL_BOX) / 2);
  const outputPath = path.join(OUTPUT_DIR, `${entry.slug}.webp`);

  await sharp({
    create: {
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: medalPng, left: offset, top: offset }])
    .webp({ quality: 94, alphaQuality: 100 })
    .toFile(outputPath);

  return outputPath;
}

async function assertNoOutputClips(outputPath) {
  const raw = await sharp(outputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const data = raw.data;
  const { width, height, channels } = raw.info;
  const bounds = boundsForAlpha(data, width, height, channels);
  const margin = Math.min(
    bounds.left,
    bounds.top,
    width - bounds.left - bounds.width,
    height - bounds.top - bounds.height
  );

  if (margin < MIN_OUTPUT_MARGIN) {
    throw new Error(
      `${path.basename(outputPath)} has only ${margin}px of transparent margin`
    );
  }
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const entries = readEntries();
for (const entry of entries) {
  const outputPath = await generateMedal(entry);
  await assertNoOutputClips(outputPath);
}

console.log(`Generated ${entries.length} medals in ${path.relative(ROOT, OUTPUT_DIR)}`);
