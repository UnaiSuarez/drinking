import sharp from 'sharp';
import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/prepare-character-skins.mjs <generated-images-dir>');

const skins = [
  ['ultimo-ronda', 'camarero-cierre', 'exec-7b8942f9-c775-4e20-a695-2e37e9edbe5a.png'],
  ['ultimo-ronda', 'dia-partido', 'exec-eeb420ea-7b66-44fd-9b99-b5b2c6b13b08.png'],
  ['ultimo-ronda', 'maestro-coctelero', 'exec-c5c9b959-5c29-437c-8e63-c4307d7e2399.png'],
  ['ultimo-ronda', 'mecanico-nocturno', 'exec-c163bf83-625a-4dc4-beea-b61a09fa0e27.png'],
  ['jefe-after', 'terraza-verano', 'exec-f0d5132a-2392-45a1-97e3-47a41c78d3bb.png'],
  ['jefe-after', 'ultimo-autobus', 'exec-7c71770d-db03-4666-9f65-c18e780d11fa.png'],
  ['jefe-after', 'dj-madrugada', 'exec-277b293c-0b6d-42b5-a9b5-ce84c24909f8.png'],
  ['jefe-after', 'senor-neon', 'exec-a6d4f714-4f66-4952-bb1b-3d069f689438.png'],
  ['narrador-noche', 'cronica-terraza', 'exec-ec184e82-f760-4b7a-82b1-67aa0ca94b20.png'],
  ['narrador-noche', 'vuelta-casa', 'exec-c4db63c3-0cc5-43c7-a9fd-ee5cfe80cff1.png'],
  ['narrador-noche', 'presentador-gala', 'exec-4173822a-801f-4d71-8248-d9ba98e6b853.png'],
  ['narrador-noche', 'reportero-medianoche', 'exec-e5e5bc93-1377-4d66-a76b-652ee38709c8.png'],
  ['silencioso-letal', 'turno-biblioteca', 'exec-962c02a9-9861-4592-bb04-a8f541c14331.png'],
  ['silencioso-letal', 'paseo-nocturno', 'exec-8886517d-6a01-414e-9b1c-bc29c4da24a6.png'],
  ['silencioso-letal', 'maestro-ajedrez', 'exec-68945b9e-7a2c-4b74-bc48-f2acb25f93d2.png'],
  ['silencioso-letal', 'astronomo-after', 'exec-06181a37-5609-4e87-a5f7-40d65ae7a499.png'],
  ['guardian-cubata', 'turno-terraza', 'exec-54fdede1-e96e-486d-a040-4db3df261ee9.png'],
  ['guardian-cubata', 'paseo-barrio', 'exec-bdb9a7fd-0f49-42e9-894c-e7d0e4a484a9.png'],
  ['guardian-cubata', 'capitan-cubierta', 'exec-afb28d68-d98e-4ebb-93bc-b2b113a177cf.png'],
  ['guardian-cubata', 'motero-medianoche', 'exec-e73cb266-1e31-428d-a31e-53c36262e9cb.png'],
];

for (const [character, skin, filename] of skins) {
  const input = resolve(source, filename);
  const output = resolve('public', 'personajes', character, 'skins');
  await mkdir(output, { recursive: true });
  const { width, height } = await sharp(input).metadata();
  if (!width || !height) throw new Error(`Cannot read dimensions: ${input}`);

  await sharp(input).resize(768, 1152, { fit: 'cover' }).webp({ quality: 85, effort: 5 })
    .toFile(join(output, `${skin}-completo.webp`));

  const size = Math.floor(Math.min(width * 0.72, height));
  await sharp(input).extract({
    left: Math.floor((width - size) / 2),
    top: 0,
    width: size,
    height: size,
  }).resize(640, 640).webp({ quality: 88, effort: 5 })
    .toFile(join(output, `${skin}.webp`));
}

console.log(`Prepared ${skins.length} full-body portraits and ${skins.length} avatars.`);
