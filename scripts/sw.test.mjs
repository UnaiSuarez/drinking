import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://ranking.test";

function harness() {
  const handlers = {};
  const stored = new Map();
  let offline = false;
  let fetched = 0;
  let skipped = 0;
  const cache = {
    add: async (path) => stored.set(origin + path, new Response("offline")),
    match: async (r) => stored.get(typeof r === "string" ? origin + r : r.url)?.clone(),
    put: async (r, response) => stored.set(r.url, response),
    keys: async () => [...stored.keys()].map((url) => new Request(url)),
    delete: async (r) => stored.delete(r.url),
  };
  vm.runInNewContext(source, {
    URL, Response, importScripts() {},
    self: {
      APP_BUILD: "test",
      location: { origin },
      addEventListener: (type, fn) => { handlers[type] = fn; },
      skipWaiting: async () => { skipped++; },
      clients: { claim: async () => {} },
    },
    caches: { open: async () => cache, match: cache.match, keys: async () => [] },
    fetch: async () => { fetched++; if (offline) throw Error("offline"); return new Response("network"); },
  });
  async function fire(type, extra = {}) {
    const work = [];
    let result;
    handlers[type]({ ...extra, waitUntil: (p) => work.push(p), respondWith: (p) => { result = p; } });
    const response = await result;
    await Promise.all(work);
    return response;
  }
  const request = (path, overrides = {}) => ({ url: origin + path, method: "GET", mode: "cors", ...overrides });
  return { fire, request, stored, offline: () => { offline = true; }, fetched: () => fetched, skipped: () => skipped };
}

test("private data and mutations never enter the service worker cache", async () => {
  const h = harness();
  for (const path of ["/api/perfil", "/perfil/123?_rsc=x", "/auth/confirm", "/_next/image?url=x"]) {
    assert.equal(await h.fire("fetch", { request: h.request(path) }), undefined);
  }
  assert.equal(await h.fire("fetch", { request: h.request("/", { method: "POST" }) }), undefined);
  assert.equal(h.fetched(), 0);
  assert.equal(h.stored.size, 0);
});

test("navigation stays network-only and falls back offline", async () => {
  const h = harness();
  await h.fire("install");
  const request = h.request("/perfil/123", { mode: "navigate" });
  assert.equal(await (await h.fire("fetch", { request })).text(), "network");
  assert.equal(h.stored.size, 1);
  h.offline();
  assert.equal(await (await h.fire("fetch", { request })).text(), "offline");
});

test("static chunks are cached and the cache stays bounded", async () => {
  const h = harness();
  await h.fire("install");
  const request = h.request("/_next/static/a.js");
  await h.fire("fetch", { request });
  await h.fire("fetch", { request });
  assert.equal(h.fetched(), 1);
  for (let i = 0; i < 85; i++) await h.fire("fetch", { request: h.request("/_next/static/" + i + ".js") });
  assert.equal(h.stored.size, 81);
  assert.ok(h.stored.has(origin + "/offline.html"));
});

test("an update waits for explicit activation", async () => {
  const h = harness();
  await h.fire("install");
  assert.equal(h.skipped(), 0);
  await h.fire("message", { data: { type: "UNKNOWN" } });
  assert.equal(h.skipped(), 0);
  await h.fire("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(h.skipped(), 1);
});
