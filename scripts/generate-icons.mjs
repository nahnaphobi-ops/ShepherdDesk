// Renders the PWA / home-screen icons from public/logo.svg. Run: node scripts/generate-icons.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("public/logo.svg", "utf8");
const inner = logo.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const artwork = inner.replace(/<rect width="64" height="64" rx="14"[^>]*\/>/, "");

// Full-bleed square for maskable/Apple icons: the OS applies its own mask, so keep the art in the safe zone.
const fullBleed = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#25231f"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${artwork}</g>
</svg>`;

const jobs = [
  ["public/icons/icon-192.png", logo, 192],
  ["public/icons/icon-512.png", logo, 512],
  ["public/icons/icon-maskable-512.png", fullBleed(0.78), 512],
  ["public/icons/apple-touch-icon.png", fullBleed(0.9), 180],
];

for (const [file, svg, size] of jobs) {
  await sharp(Buffer.from(svg), { density: (72 * size) / 64 }).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
