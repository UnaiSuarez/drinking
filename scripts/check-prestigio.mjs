import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exported = {};
  new Function("exports", source)(exported);
  return exported;
}
const p = load("src/lib/prestigio.ts");
const m = load("src/lib/marcos.ts");
const n = load("src/lib/niveles.ts");
assert.equal(p.NIVEL_PRESTIGIO, 50);
assert.equal(n.progresoNivel(n.xpTotalParaNivel(50) - 1).nivel, 49);
assert.equal(n.progresoNivel(n.xpTotalParaNivel(50)).nivel, 50);
assert.equal(n.progresoNivel(0).nivel, 1);
assert.equal(p.claveCelebracion("u", 0), "nivel-visto:u");
assert.notEqual(p.claveCelebracion("u", 1), p.claveCelebracion("u", 2));
assert.deepEqual(p.normalizarVitrina(["a", "a", "vieja", "b", "c", "d"], ["a", "b", "c", "d"]), ["a", "b", "c"]);
assert.deepEqual(m.MARCO_NIVEL_HITOS.map((h) => h.nivel), [10, 20, 30, 40, 50]);
assert.deepEqual(m.MARCO_PRESTIGIO_HITOS.map((h) => h.marco), ["disco", "reliquia", "prisma", "trono", "llamas"]);
const sql = readFileSync("supabase/migrations/20260927124224_prestigio_nivel_50.sql", "utf8");
for (const h of m.MARCO_PRESTIGIO_HITOS) assert.ok(sql.includes(`when ${h.prestigio} then '${h.marco}'`));
assert.ok(sql.includes("for update"));
assert.ok(sql.includes("p_ciclo_actual <> v_ciclo"));
assert.ok(sql.includes("when v_ciclo = 0 then v_paso::text"));
console.log("Prestigio: nivel 50, inventario de marcos, ciclos y vitrina verificados.");
