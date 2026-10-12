// Genera imágenes estáticas (primer fotograma, WebP) de cada GIF de ejercicio y
// las sube al Storage junto a los originales, sin tocar ni borrar los GIF.
//
//   exercise-thumbs/<archivo>.webp   160 px  -> listas y miniaturas
//   exercise-posters/<archivo>.webp  480 px  -> sesión y detalle en modo ahorro de datos
//
// El nombre es el del GIF con ".webp" añadido (p. ej. "Squat.gif.webp"), así la
// app lo deriva de `exercises.gif_url` sin cambios en la base de datos.
//
// Uso:
//   node scripts/build-exercise-thumbs.mjs --dry            (solo mide, no sube)
//   node scripts/build-exercise-thumbs.mjs [--limit N] [--force] [--names lista.json]
//
// --names: JSON con los nombres exactos de `exercises.gif_url`. Los que no
// estén en LOCAL_DIR con ese mismo nombre se descargan del Storage (carpeta
// "exercises "), que es lo que la app muestra de verdad.
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en el entorno (o en .env.local) y los GIF
// originales en LOCAL_DIR. Sin --force no vuelve a subir lo que ya existe.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DIR =
  process.env.EXERCISE_GIFS_DIR ||
  "C:/Local-Disc-D/Project/CreativeCode/CreatiFit AI/assets/3 - CreatiFitGIFs";
const BUCKET = "CreatiFit AI";
const VARIANTS = [
  { folder: "exercise-thumbs", size: 160, quality: 60 },
  { folder: "exercise-posters", size: 480, quality: 68 },
];
// El Storage del plan gratuito corta con 429 por encima de unas pocas subidas a la vez.
const CONCURRENCY = 3;
const IMAGE_EXT = new Set([".gif", ".png", ".jpg", ".jpeg"]);

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const namesIdx = args.indexOf("--names");
const namesFile = namesIdx >= 0 ? args[namesIdx + 1] : null;

let fileEnv = {};
try {
  fileEnv = Object.fromEntries(
    readFileSync(join(ROOT, ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
} catch {
  /* sin .env.local: todo debe venir del entorno */
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const localNames = new Set(
  readdirSync(LOCAL_DIR)
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .filter((f) => statSync(join(LOCAL_DIR, f)).isFile())
);
const files = (namesFile ? JSON.parse(readFileSync(namesFile, "utf8")) : [...localNames]).slice(0, limit);

// Bytes del original: del disco si el nombre coincide exactamente (el sistema
// de archivos de Windows no distingue mayúsculas, el Storage sí), si no del Storage.
async function readSource(file) {
  if (localNames.has(file)) return readFileSync(join(LOCAL_DIR, file));
  const url = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encodeURIComponent("exercises ")}/${encodeURIComponent(file)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`no está en disco ni en Storage (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

const objectUrl = (folder, name) =>
  `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(BUCKET)}/${folder}/${encodeURIComponent(name)}`;

// Nombres ya subidos en una carpeta (para reanudar sin repetir trabajo).
async function listExisting(folder) {
  const names = new Set();
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: `${folder}/`, limit: 1000, offset }),
    });
    if (!r.ok) throw new Error(`list ${folder}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    const rows = await r.json();
    rows.forEach((x) => names.add(x.name));
    if (rows.length < 1000) return names;
  }
}

async function upload(folder, name, body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(objectUrl(folder, name), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "image/webp",
          // El contenido de un nombre no cambia: un año de caché.
          "Cache-Control": "max-age=31536000",
          "x-upsert": "true",
        },
        body,
      });
      if (r.ok) return;
      throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    } catch (err) {
      if (attempt >= 5) throw err;
      await new Promise((res) => setTimeout(res, 3000 * attempt));
    }
  }
}

const existing = {};
if (!dry && !force) {
  for (const v of VARIANTS) existing[v.folder] = await listExisting(v.folder);
}

const totals = Object.fromEntries(VARIANTS.map((v) => [v.folder, { n: 0, bytes: 0, skipped: 0 }]));
let sourceBytes = 0;
const failed = [];
let done = 0;

async function processFile(file) {
  const name = `${file}.webp`;
  let src = null;
  for (const v of VARIANTS) {
    if (existing[v.folder]?.has(name)) {
      totals[v.folder].skipped++;
      continue;
    }
    if (!src) {
      src = await readSource(file);
      sourceBytes += src.length;
    }
    // `pages: 1` = solo el primer fotograma del GIF animado.
    const out = await sharp(src, { pages: 1 })
      .resize(v.size, v.size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: v.quality, effort: 5 })
      .toBuffer();
    if (!dry) await upload(v.folder, name, out);
    totals[v.folder].n++;
    totals[v.folder].bytes += out.length;
  }
}

const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        await processFile(f);
      } catch (err) {
        failed.push([f, String(err).slice(0, 160)]);
      }
      if (++done % 100 === 0) console.log(`${done}/${files.length}`);
    }
  })
);

const kb = (b) => `${(b / 1024).toFixed(0)} KB`;
console.log(`${dry ? "[dry] " : ""}archivos: ${files.length}, originales: ${(sourceBytes / 1048576).toFixed(0)} MB`);
for (const v of VARIANTS) {
  const t = totals[v.folder];
  console.log(
    `${v.folder}: ${t.n} generadas (${t.skipped} ya existían), total ${kb(t.bytes)}, media ${t.n ? kb(t.bytes / t.n) : "-"}`
  );
}
if (failed.length) {
  console.log(`fallidas: ${failed.length}`);
  failed.slice(0, 20).forEach((f) => console.log("  ", f[0], "->", f[1]));
  process.exitCode = 1;
}
