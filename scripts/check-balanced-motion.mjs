import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

const css = postcss.parse(readFileSync(new URL("../src/app/balanced-motion.css", import.meta.url), "utf8"));
const keyframes = new Set();
css.walkAtRules("keyframes", (rule) => {
  keyframes.add(rule.params);
  rule.walkDecls((declaration) => {
    assert.ok(["transform", "opacity"].includes(declaration.prop), `${rule.params}: expensive animated property ${declaration.prop}`);
  });
});
for (const name of ["balanced-drop", "balanced-flip", "balanced-light", "balanced-orbit", "balanced-flame", "balanced-flash", "balanced-sweep"]) {
  assert.ok(keyframes.has(name), `Missing effect ${name}`);
}
const selectors = [];
css.walkRules((rule) => selectors.push(rule.selector));
for (const kind of ["portal", "electric", "fire", "cristal", "disco", "prisma", "cosmic", "dust", "halo", "crown", "shine", "glitch"]) {
  assert.ok(selectors.some((selector) => selector.includes(`[data-kind="${kind}"]`)), `Missing frame style ${kind}`);
}
assert.ok(css.toString().includes("animation-play-state: var(--balanced-play)"));
console.log("Balanced motion: all frame styles, essential reveals and compositor-only keyframes passed.");
