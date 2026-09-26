import sharp from "sharp";

for (const size of [192, 512]) {
  await sharp("public/icon.svg").resize(size, size).png().toFile(`public/icon-${size}.png`);
}
await sharp("public/icon.svg").resize(180, 180).png().toFile("public/apple-touch-icon.png");
const inset = await sharp("public/icon.svg").resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0d0e1a" } })
  .composite([{ input: inset, gravity: "centre" }]).png().toFile("public/icon-maskable.png");
