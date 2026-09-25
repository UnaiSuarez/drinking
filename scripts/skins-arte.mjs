// Estado del arte de skins: qué ranuras están listas y cuáles esperan imágenes.
// Uso: npm run skins:arte
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const src = readFileSync(join(raiz, "src/lib/tienda.ts"), "utf8");
const llamadas = [...src.matchAll(/(skinNormal|momentoHistorico)\(\{([^}]*)\}\)/g)].filter((m) => /id:\s*"/.test(m[2]));

let faltan = 0;
let avisos = 0;
for (const [, tipo, cuerpo] of llamadas) {
  const id = cuerpo.match(/\bid:\s*"([^"]+)"/)?.[1];
  const personaje = cuerpo.match(/personajeId:\s*"([^"]+)"/)?.[1];
  const rareza = cuerpo.match(/rareza:\s*"([^"]+)"/)?.[1] ?? (tipo === "momentoHistorico" ? "legendaria" : "?");
  const pendiente = /pendiente:\s*true/.test(cuerpo);
  const base = `public/personajes/${personaje}/skins/${id}`;
  const avatar = existsSync(join(raiz, `${base}.webp`));
  const completo = existsSync(join(raiz, `${base}-completo.webp`));
  const listo = avatar && completo;
  let estado = pendiente ? "pendiente" : "activa";
  if (pendiente && listo) { estado += "  → ya tiene arte: borra `pendiente: true`"; avisos++; }
  if (!pendiente && !listo) { estado += "  → FALTAN archivos y no está marcada pendiente"; avisos++; }
  if (pendiente && !listo) faltan++;
  console.log(`${id.padEnd(30)} ${personaje.padEnd(17)} ${rareza.padEnd(10)} avatar:${avatar ? "sí" : "no"} completo:${completo ? "sí" : "no"}  ${estado}`);
}
console.log(`\n${llamadas.length} skins · ${faltan} pendientes de arte · ${avisos} avisos`);
