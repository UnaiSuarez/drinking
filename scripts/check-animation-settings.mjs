import assert from "node:assert/strict";
import { animationMode, savedAnimationMode, saveAnimationMode, subscribeAnimations, ANIMATION_KEY } from "../src/lib/animationSettings.ts";

assert.equal(animationMode(), "minimal");
const storage = new Map();
let reduce = false;
const target = new EventTarget();
const media = new EventTarget();
Object.defineProperty(media, "matches", { get: () => reduce });
globalThis.window = Object.assign(target, { matchMedia: () => media });
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
globalThis.document = { documentElement: { dataset: {} } };
assert.equal(savedAnimationMode(), null);
assert.equal(animationMode(), "balanced");
let notifications = 0;
const unsubscribe = subscribeAnimations(() => notifications++);
for (const mode of ["minimal", "balanced", "full"]) {
  saveAnimationMode(mode);
  assert.equal(animationMode(), mode);
  assert.equal(document.documentElement.dataset.animationMode, mode);
}
assert.equal(notifications, 3);
reduce = true;
assert.equal(animationMode(), "minimal");
assert.equal(savedAnimationMode(), "full");
reduce = false;
storage.set(ANIMATION_KEY, "invalid");
assert.equal(animationMode(), "full");
localStorage.getItem = () => { throw new Error("blocked"); };
localStorage.setItem = () => { throw new Error("blocked"); };
saveAnimationMode("minimal");
assert.equal(animationMode(), "minimal");
unsubscribe();
console.log("Animation preferences: defaults, modes, reduced motion, notifications and storage fallback passed.");
