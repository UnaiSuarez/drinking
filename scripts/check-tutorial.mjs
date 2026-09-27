import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(readFileSync("src/lib/tutorial.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
new Function("exports", source)(exported);
const { TUTORIAL_STEPS: steps, TUTORIAL_CHAPTERS: chapters, normalizeTutorialProgress: normalize } = exported;
assert.ok(steps.length >= 25);
assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
assert.equal(normalize(null).paso, "bienvenida");
assert.equal(normalize({ paso: "retired" }).paso, "bienvenida");
assert.deepEqual(normalize({ vistos: ["salas", "salas", "retired"] }).vistos, ["salas"]);
for (const estado of ["en_curso", "pausado", "completado"]) assert.equal(normalize({ estado }).estado, estado);
for (const step of steps) {
  assert.ok(chapters.includes(step.chapter));
  assert.equal(step.steps.length, 3);
  assert.ok(step.detail.length > 90);
  assert.ok(step.intro.length > 40);
  assert.ok(["home", "profile", "settings", "inventory", "shop", "levels", "challenges", "friends", "map", "medals"].includes(step.destination));
}
const seen = [];
for (const step of steps) seen.push(step.id);
assert.equal(normalize({ vistos: seen }).vistos.length, steps.length);
console.log(`Tutorial: ${steps.length} pasos, ${chapters.length} capitulos y progreso validados.`);

const tourSource = ts.transpileModule(readFileSync("src/lib/tutorialTour.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tour = {};
new Function("exports", tourSource)(tour);
const { TOUR_STEPS, normalizeTourProgress, completeTourAction } = tour;
assert.equal(new Set(TOUR_STEPS.map(s => s.chapter)).size, 3);
let progress = normalizeTourProgress({ paso: "bienvenida", estado: "completado" });
assert.equal(progress.paso, "learn-room");
assert.equal(progress.estado, "pausado");
assert.equal(normalizeTourProgress({ paso: "tour-invalid", estado: "completado" }).estado, "pausado");
assert.equal(completeTourAction(progress, "tour-cofre"), progress);
for (const step of TOUR_STEPS) {
  progress = completeTourAction(progress, step.id);
  assert.equal(completeTourAction(progress, step.id), progress);
}
assert.equal(progress.estado, "completado");
assert.equal(progress.vistos.length, TOUR_STEPS.length);
assert.equal(normalizeTourProgress(progress).estado, "completado");
assert.ok(TOUR_STEPS.some(s => s.id === "learn-place"));
assert.ok(TOUR_STEPS.some(s => s.id === "learn-unique"));
let drinksProgress = { paso: "learn-place", vistos: TOUR_STEPS.slice(0, 2).map(s => s.id), estado: "en_curso" };
drinksProgress = completeTourAction(drinksProgress, "learn-place");
assert.equal(drinksProgress.paso, "learn-normal");
assert.equal(completeTourAction(drinksProgress, "learn-unique"), drinksProgress);
drinksProgress = completeTourAction(drinksProgress, "learn-normal");
assert.equal(drinksProgress.paso, "learn-unique");
assert.equal(completeTourAction(drinksProgress, "learn-unique").paso, "learn-points");
assert.equal(normalizeTourProgress({ paso: "learn-unique", vistos: ["learn-room", "learn-water", "learn-place"] }).paso, "learn-normal");
const actionCode = readFileSync("src/app/tutorial/actions.ts", "utf8");
assert.ok(actionCode.includes("db.auth.getUser()"));
assert.ok(actionCode.includes('.eq("actualizado_at", row.actualizado_at)'));
assert.ok(!actionCode.includes(".rpc("));
for (const match of actionCode.matchAll(/\.from\("([^"]+)"\)/g)) assert.equal(match[1], "tutorial_progreso");
console.log("Entrenamiento: tres bloques, orden, duplicados, persistencia y aislamiento de tablas validados.");

let user = { id: "test-user" };
let row = { paso: "learn-card", vistos: TOUR_STEPS.slice(0, TOUR_STEPS.findIndex(s => s.id === "learn-card")).map(s => s.id), estado: "en_curso", actualizado_at: "revision-1" };
let race = false;
let writes = 0;
const db = {
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    assert.equal(table, "tutorial_progreso");
    let payload;
    const filters = {};
    const query = {
      select() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      maybeSingle: async () => ({ data: row, error: null }),
      update(value) { payload = value; return query; },
      then(resolve) {
        assert.equal(filters.usuario_id, user.id);
        assert.equal(filters.actualizado_at, row.actualizado_at);
        if (race) return Promise.resolve({ data: [], error: null }).then(resolve);
        writes++;
        row = { ...row, ...payload };
        return Promise.resolve({ data: [{ usuario_id: user.id }], error: null }).then(resolve);
      },
    };
    return query;
  },
};
const actions = {};
new Function("exports", "require", ts.transpileModule(actionCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(actions, (module) => {
  if (module === "@/lib/supabase/server") return { createClient: async () => db };
  if (module === "@/lib/tutorialTour") return tour;
  throw new Error(`Unexpected dependency: ${module}`);
});
await assert.rejects(actions.trainingAction("invented"));
user = null;
await assert.rejects(actions.trainingAction("learn-card"));
user = { id: "test-user" };
await assert.rejects(actions.trainingAction("learn-equip"));
assert.equal(writes, 0);
assert.equal((await actions.trainingAction("learn-card")).paso, "learn-close");
assert.equal(writes, 1);
await assert.rejects(actions.trainingAction("learn-card"));
assert.equal(writes, 1);
race = true;
await assert.rejects(actions.trainingAction("learn-close"));
assert.equal(writes, 1);
console.log("Servidor: autenticacion, orden, carta de un uso y conflicto entre pestanas validados.");
