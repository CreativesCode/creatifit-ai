// Genera todos los assets de marca (favicon, app icon, launcher Android, splash)
// a partir del mark "Anillos de actividad" del rediseño, usando sharp.
//
//   node scripts/generate-brand-assets.mjs
//
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => join(ROOT, p);
const ensure = (p) => mkdirSync(dirname(p), { recursive: true });

// ---- Geometría del mark (viewBox 0 0 100 100) ----
const C1 = 2 * Math.PI * 38;
const C2 = 2 * Math.PI * 23;
const DA1 = `${(0.72 * C1).toFixed(2)} ${C1.toFixed(2)}`;
const DA2 = `${(0.6 * C2).toFixed(2)} ${C2.toFixed(2)}`;

// Mark como grupo SVG. color = relleno/trazo ('#fff' mono o 'grad' para gradiente).
function markGroup(color) {
  const outer = color === "grad" ? "url(#g1)" : color;
  const inner = color === "grad" ? "url(#g2)" : color;
  return `
    <circle cx="50" cy="50" r="38" fill="none" stroke="${outer}" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${DA1}" transform="rotate(48 50 50)"/>
    <circle cx="50" cy="50" r="23" fill="none" stroke="${inner}" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${DA2}" transform="rotate(-130 50 50)"
      opacity="${color === "grad" ? 1 : 0.85}"/>
    <circle cx="50" cy="50" r="6.5" fill="${outer}"/>`;
}

const GRADS = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7C5CFF"/><stop offset="0.5" stop-color="#B14BF4"/><stop offset="1" stop-color="#F0469C"/>
  </linearGradient>
  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7C5CFF"/><stop offset="0.5" stop-color="#B14BF4"/><stop offset="1" stop-color="#F0469C"/>
  </linearGradient>
  <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6A5BFF"/><stop offset="0.5" stop-color="#3FB6F0"/><stop offset="1" stop-color="#25E0E5"/>
  </linearGradient>`;

// Tile completo: fondo (rect redondeado / círculo / full-bleed) + mark blanco centrado.
// shape: 'rounded' | 'circle' | 'bleed'   markFrac: tamaño del mark respecto al lienzo.
function iconSvg({ size = 512, shape = "rounded", markFrac = 0.62, bg = "grad" } = {}) {
  const k = (size * markFrac) / 100;
  const off = (size - 100 * k) / 2;
  const r = size * 0.26;
  let bgEl;
  const fill = bg === "grad" ? "url(#bg)" : bg;
  if (shape === "circle") bgEl = `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${fill}"/>`;
  else if (shape === "bleed") bgEl = `<rect width="${size}" height="${size}" fill="${fill}"/>`;
  else bgEl = `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${GRADS}</defs>
    ${bgEl}
    <g transform="translate(${off} ${off}) scale(${k})">${markGroup("#fff")}</g>
  </svg>`;
}

// Mark sobre fondo transparente (para foreground adaptive Android, en zona segura).
function foregroundSvg(size) {
  // canvas 108dp; zona segura central 72dp (~0.667). Mark al ~46% del lienzo.
  const markFrac = 0.46;
  const k = (size * markFrac) / 100;
  const off = (size - 100 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${GRADS}</defs>
    <g transform="translate(${off} ${off}) scale(${k})">${markGroup("grad")}</g>
  </svg>`;
}

// Splash: fondo oscuro de marca + mark + wordmark.
function splashSvg(size = 1280) {
  const k = (size * 0.16) / 100;
  const cx = size / 2;
  const markY = size * 0.4;
  const off = cx - 50 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${GRADS}
      <radialGradient id="mesh" cx="35%" cy="28%" r="60%">
        <stop offset="0" stop-color="#1E1730"/><stop offset="1" stop-color="#08060F"/>
      </radialGradient>
      <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#F0469C"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#mesh)"/>
    <g transform="translate(${off} ${markY - 50 * k}) scale(${k})">${markGroup("grad")}</g>
    <text x="${cx}" y="${size * 0.58}" text-anchor="middle"
      font-family="'Space Grotesk','Segoe UI',sans-serif" font-weight="700"
      font-size="${size * 0.07}" letter-spacing="-2">
      <tspan fill="#F5F2FF">creati</tspan><tspan fill="url(#word)">fit</tspan>
    </text>
  </svg>`;
}

const png = async (svg, path, w, h) => {
  ensure(path);
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(path);
  console.log("✓", path.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
};

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function main() {
  // ---- Web (Next.js + public) ----
  const iconSvgFile = iconSvg({ size: 512, shape: "rounded" });
  ensure(out("src/app/icon.svg"));
  writeFileSync(out("src/app/icon.svg"), iconSvgFile);
  console.log("✓ src/app/icon.svg");
  ensure(out("public/logo.svg"));
  writeFileSync(out("public/logo.svg"), iconSvgFile);
  console.log("✓ public/logo.svg");

  await png(iconSvg({ size: 180, shape: "rounded" }), out("src/app/apple-icon.png"), 180, 180);
  await png(iconSvg({ size: 512, shape: "rounded" }), out("public/logo.png"), 512, 512);
  await png(iconSvg({ size: 512, shape: "rounded" }), out("public/icon-512.png"), 512, 512);
  await png(iconSvg({ size: 192, shape: "rounded" }), out("public/icon-192.png"), 192, 192);
  await png(iconSvg({ size: 32, shape: "rounded" }), out("public/favicon-32x32.png"), 32, 32);

  // ---- Android launcher (legacy square + round) ----
  const baseSquare = 48; // mdpi
  for (const [d, m] of Object.entries(DENS)) {
    const s = Math.round(baseSquare * m);
    await png(iconSvg({ size: s, shape: "rounded" }), out(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`), s, s);
    await png(iconSvg({ size: s, shape: "circle" }), out(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`), s, s);
  }

  // ---- Android adaptive foreground (108dp lienzo completo) ----
  const baseFg = 108;
  for (const [d, m] of Object.entries(DENS)) {
    const s = Math.round(baseFg * m);
    await png(foregroundSvg(s), out(`android/app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`), s, s);
  }

  // ---- Splash ----
  await png(splashSvg(1280), out("android/app/src/main/res/drawable/splash.png"), 1280, 1280);

  console.log("\nListo. Recuerda: npx cap sync  para propagar a Android.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
