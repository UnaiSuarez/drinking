import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import ts from "typescript";
import sharp from "sharp";

function loadModule(name) {
  const source = ts.transpileModule(readFileSync(`src/lib/${name}.ts`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exported = {};
  new Function("exports", source)(exported);
  return exported;
}

const { CARTAS_COFRES } = loadModule("cofresDesign");
const { medalSpriteFor } = loadModule("medalSprites");
for (const card of CARTAS_COFRES) {
  assert.ok(card.imagen && existsSync(`public${card.imagen}`), card.id);
}
const medals = JSON.parse(readFileSync("scripts/fixtures/medal-catalog-20260927.json", "utf8"));
for (const medal of medals) {
  const sprite = medalSpriteFor(medal);
  assert.ok(sprite, `Missing medal: ${medal.slug}`);
  assert.ok(existsSync(`public${sprite.src.split("?")[0]}`), medal.slug);
}
const { assets } = JSON.parse(readFileSync("docs/artwork-20260927.json", "utf8"));
let bytes = 0;
for (const asset of assets) {
  const metadata = await sharp(asset.output).metadata();
  assert.equal(metadata.format, "webp", asset.id);
  assert.equal(metadata.width, asset.type === "card" ? 768 : 512, asset.id);
  assert.equal(metadata.height, metadata.width, asset.id);
  if (asset.type === "medal") {
    assert.ok(metadata.hasAlpha, asset.id);
    const { data, info } = await sharp(asset.output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(data[3], 0, `Opaque background: ${asset.id}`);
    assert.ok(data.some((v, i) => i % info.channels === 3 && v === 255), asset.id);
  }
  bytes += statSync(asset.output).size;
}
console.log(`${CARTAS_COFRES.length} cards and ${medals.length} medals have valid artwork. ${assets.length} new assets: ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);
