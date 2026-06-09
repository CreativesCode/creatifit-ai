// Sube todos los assets locales al Storage del proyecto Supabase nuevo.
// Uso: node scripts/upload-storage.mjs
//
// Lee SUPABASE_URL y SERVICE_ROLE_KEY de .env.local.
// Sube a bucket "CreatiFit AI", carpeta "exercises " (con espacio final),
// que es la ruta exacta que la BD y NEXT_PUBLIC_STATICS_IMAGES esperan.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "c:/Local-Disc-D/Project/CreativeCode/src/creatifit-ai";
const LOCAL_DIR = "C:/Local-Disc-D/Project/CreativeCode/CreatiFit AI/assets/3 - CreatiFitGIFs";
const BUCKET = "CreatiFit AI";
const FOLDER = "exercises "; // ¡con espacio final!
const CONCURRENCY = 6;

// --- Cargar credenciales de .env.local ---
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const MIME = { ".gif": "image/gif", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".csv": "text/csv" };

let files = readdirSync(LOCAL_DIR).filter((f) => {
  try { return statSync(join(LOCAL_DIR, f)).isFile(); } catch { return false; }
});
// Modo prueba: `node upload-storage.mjs --limit 2`
const limitArg = process.argv.indexOf("--limit");
if (limitArg !== -1) files = files.slice(0, Number(process.argv[limitArg + 1]) || 2);
console.log(`Encontrados ${files.length} archivos en local. Subiendo a ${SUPABASE_URL} / "${BUCKET}/${FOLDER}"`);

const encBucket = encodeURIComponent(BUCKET);
const encFolder = encodeURIComponent(FOLDER);

let ok = 0, fail = 0;
const failures = [];

const SKIP_EXISTING = !process.argv.includes("--force");
let skippedExisting = 0;

async function exists(name) {
  if (!SKIP_EXISTING) return false;
  const pub = `${SUPABASE_URL}/storage/v1/object/public/${encBucket}/${encFolder}/${encodeURIComponent(name)}`;
  try {
    const r = await fetch(pub, { method: "HEAD" });
    if (!r.ok) return false;
    const len = Number(r.headers.get("content-length") || 0);
    return len === statSync(join(LOCAL_DIR, name)).size; // mismo tamano = ya subido bien
  } catch { return false; }
}

async function uploadOne(name) {
  if (await exists(name)) { skippedExisting++; ok++; return; }
  const body = readFileSync(join(LOCAL_DIR, name));
  const url = `${SUPABASE_URL}/storage/v1/object/${encBucket}/${encFolder}/${encodeURIComponent(name)}`;
  const ct = MIME[extname(name).toLowerCase()] || "application/octet-stream";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": ct,
          "x-upsert": "true",
          "cache-control": "max-age=3600",
        },
        body,
      });
      if (res.ok) { ok++; return; }
      if (attempt === 4) { fail++; failures.push(`${name} -> ${res.status} ${(await res.text()).slice(0, 120)}`); }
    } catch (e) {
      if (attempt === 4) { fail++; failures.push(`${name} -> ${e.message}`); }
    }
    await new Promise((r) => setTimeout(r, 400 * attempt)); // backoff
  }
}

// Pool de concurrencia
let idx = 0;
async function worker() {
  while (idx < files.length) {
    const my = idx++;
    await uploadOne(files[my]);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\nHecho. OK=${ok} (ya existian: ${skippedExisting})  FAIL=${fail}`);
if (failures.length) {
  console.log("Fallos:");
  failures.slice(0, 30).forEach((f) => console.log("  " + f));
}
process.exit(fail > 0 ? 1 : 0);
