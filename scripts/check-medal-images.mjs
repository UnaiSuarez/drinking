import { readdir } from "node:fs/promises";
import assert from "node:assert/strict";

const origin = process.argv[2] || "http://localhost:3002";
const files = (await readdir("public/medals/ai/items-main")).filter((name) => name.endsWith(".webp"));
for (const name of files) {
  const src = "/medals/ai/items-main/" + name + "?v=2";
  const response = await fetch(origin + "/_next/image?" + new URLSearchParams({ url: src, w: "128", q: "75" }), {
    headers: { Accept: "image/webp" },
  });
  assert.equal(response.status, 200, name);
  assert.match(response.headers.get("content-type"), /^image\//, name);
  assert.ok((await response.arrayBuffer()).byteLength > 0, name);
}
console.log(`PASS: ${files.length} optimized medal images, including their version query.`);
