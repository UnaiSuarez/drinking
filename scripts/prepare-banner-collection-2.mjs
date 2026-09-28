import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Pass the generated images directory');
const items = JSON.parse(await readFile(new URL('./banner-art-collection-2.json', import.meta.url), 'utf8'));
for (const item of items) {
  const result = await sharp(path.join(source, item.file)).resize(1200, 400, {fit:'cover'}).webp({quality:84}).toFile(`public/banners/${item.id}.webp`);
  console.log(item.id, result.size);
}
