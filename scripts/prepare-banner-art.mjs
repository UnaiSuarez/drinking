import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Pass the generated image directory');
const images = {
  dragon: 'exec-0139f5a1-15cf-4813-aa50-60cf9b2ecc24.png',
  observatorio: 'exec-ca69ef72-db1b-42e8-9908-e4d374a6dee9.png',
  campeon: 'exec-cae71ec3-611b-4353-a8ba-34598d84bb1c.png',
  'barra-clasica': 'exec-1f4785e8-a630-44ee-b204-49bf27e46b85.png',
  azotea: 'exec-8d2f4974-7f9b-40f6-bd0b-657bac2dd22f.png',
  arcade: 'exec-497178af-575b-43d2-b273-f8aeb5e3488c.png',
  'biblioteca-arcana': 'exec-84ad4557-c8f3-4b44-8e54-ff333b6edaaa.png',
  'templo-glacial': 'exec-bf0c93e4-0d0b-49c3-a871-c1d291d6ca6c.png',
  'forja-solar': 'exec-91711c0e-d83e-4e39-a675-f7099d61ccd9.png',
  'viaje-estelar': 'exec-9ecd1111-f346-449f-8c6f-1e3da8ec89cc.png',
  'cumbre-after': 'exec-c2191c10-086d-4ebc-a5fc-53120f6ee075.png',
};
await mkdir('public/banners',{recursive:true});
for (const [id,file] of Object.entries(images)) {
  const info = await sharp(path.join(source,file)).resize(1200,400,{fit:'cover'}).webp({quality:84}).toFile(`public/banners/${id}.webp`);
  console.log(id, info.size, 'bytes');
}
