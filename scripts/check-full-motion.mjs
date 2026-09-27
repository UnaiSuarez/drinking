import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, imports = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)((id) => {
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, loaded, loaded.exports);
  return loaded.exports;
}

const observers = [];
class Observer {
  constructor(callback) { this.callback = callback; observers.push(this); }
  observe(element) { this.element = element; }
  disconnect() { this.disconnected = true; }
}
globalThis.ResizeObserver = Observer;
globalThis.IntersectionObserver = Observer;
const listeners = new Map();
globalThis.document = {
  hidden: false,
  createElement: () => ({ style: {}, remove() { this.removed = true; } }),
  addEventListener: (name, fn) => listeners.set(name, fn),
  removeEventListener: (name, fn) => { assert.equal(listeners.get(name), fn); listeners.delete(name); },
};
globalThis.window = { matchMedia: () => ({ matches: false }) };
Object.defineProperty(globalThis, "navigator", { value: { hardwareConcurrency: 8 }, configurable: true });
let width = 240;
let height = 320;
let reads = 0;
const children = [];
const host = {
  get clientWidth() { reads++; return width; },
  get clientHeight() { reads++; return height; },
  appendChild: (element) => children.push(element),
};
const timelines = [];
const tweens = [];
let sets = 0;
const gsap = {
  utils: { random: (min, max) => (min + max) / 2 },
  set: () => { sets++; },
  quickSetter: (el, key) => (value) => { el.style[key] = value; },
  to: (el, options) => { tweens.push({ el, options }); },
  timeline: (options) => {
    const timeline = {
      options, isPaused: options.paused,
      to() { return this; },
      paused(value) { this.isPaused = value; },
      kill() { this.killed = true; },
    };
    timelines.push(timeline);
    return timeline;
  },
};
const bounds = load("src/lib/effectBounds.ts");
const fx = load("src/lib/cofreFx.ts", {
  gsap,
  "@/lib/effectBounds": bounds,
  "@/lib/animationSettings": { animationMode: () => "full" },
});
const stop = fx.particulasAscendentes(host, { colores: ["#fff"], cantidad: 30 });
assert.equal(children.length, 30, "Keep the full particle count");
assert.equal(reads, 2, "Measure once, not once per particle");
assert.ok(timelines.every((tl) => tl.isPaused));
observers[1].callback([{ isIntersecting: true }]);
assert.ok(timelines.every((tl) => !tl.isPaused));
document.hidden = true;
listeners.get("visibilitychange")();
assert.ok(timelines.every((tl) => tl.isPaused));
document.hidden = false;
listeners.get("visibilitychange")();
assert.ok(timelines.every((tl) => !tl.isPaused));
width = 390; height = 844;
observers[0].callback();
assert.equal(reads, 4);
timelines[0].options.onComplete();
assert.equal(reads, 4, "Recycling a particle must not read layout");
assert.equal(children.length, 30, "Reuse particle nodes");
observers[1].callback([{ isIntersecting: false }]);
assert.ok(timelines.slice(1).every((tl) => tl.isPaused));
stop();
assert.ok(children.every((el) => el.removed));
assert.ok(observers.every((observer) => observer.disconnected));
assert.equal(listeners.size, 0);
const count = timelines.length;
timelines.at(-1).options.onComplete();
assert.equal(timelines.length, count, "No restart after disposal");

fx.vortice(host, { x: 120, y: 160, colores: ["#fff"], cantidad: 60 });
assert.equal(tweens.length, 60);
const before = sets;
for (const tween of tweens) {
  for (const t of [0, 0.5, 1]) {
    tween.el.t = t;
    tween.options.onUpdate();
  }
  tween.options.onComplete();
}
assert.equal(sets, before, "No new gsap.set operations during spiral frames");
assert.ok(children.slice(30).every((el) => el.removed && el.style.transform.includes("translate3d")));
console.log("Full animation checks passed: counts, layout cache, visibility, reuse and cleanup.");
