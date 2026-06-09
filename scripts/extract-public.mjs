// Extrae SOLO el schema `public` de un dump de cluster de Supabase.
// Omite auth/storage/realtime/extensions/roles (ya existen en el proyecto nuevo)
// y excluye la funcion insegura execute_sql.
//
// Uso: node scripts/extract-public.mjs <dump.sql> <salida.sql>

import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath] = process.argv;
const lines = readFileSync(inPath, "utf8").split(/\r?\n/);

// Solo cargamos DATOS de las tablas de catalogo. El resto se crean vacias
// (no interesan planes/intake/logs/usuarios viejos; la app crea datos nuevos).
const KEEP_DATA = new Set([
  "exercises",
  "exercise_categories",
  "exercise_category_relations",
  "exercise_muscles_detail",
]);

const out = [];
let i = 0;
let kept = 0, skipped = 0, dataSkipped = 0;

// Detecta cabecera pg_dump:  "--" / "-- Name: ...; Schema: X" / "--"
function headerAt(idx) {
  if (lines[idx] !== "--") return null;
  const meta = lines[idx + 1] || "";
  if (lines[idx + 2] !== "--") return null;
  const m = meta.match(/^-- (?:Data for Name|Name): (.+?); Type: (.+?); Schema: (.+?);/);
  if (!m) return null;
  return { name: m[1], type: m[2], schema: m[3] };
}

while (i < lines.length) {
  const h = headerAt(i);
  if (!h) { i++; continue; }

  // Capturar el bloque completo: desde esta cabecera hasta la siguiente cabecera.
  const block = [lines[i], lines[i + 1], lines[i + 2]];
  let j = i + 3;
  while (j < lines.length && !headerAt(j)) {
    block.push(lines[j]);
    // Si entramos en un COPY ... FROM stdin; consumir hasta la linea "\."
    if (/FROM stdin;\s*$/.test(lines[j])) {
      j++;
      while (j < lines.length && lines[j] !== "\\.") { block.push(lines[j]); j++; }
      if (j < lines.length) { block.push(lines[j]); } // la linea "\."
    }
    j++;
  }

  const isPublic = h.schema === "public";
  const isSchemaCreate = h.type === "SCHEMA";            // public ya existe
  const isExecuteSql = /execute_sql/.test(h.name);       // funcion insegura: excluir
  const isData = h.type === "TABLE DATA";
  const skipThisData = isData && !KEEP_DATA.has(h.name); // solo datos de catalogo

  if (isPublic && !isSchemaCreate && !isExecuteSql && !skipThisData) {
    out.push(block.join("\n"));
    kept++;
  } else {
    if (skipThisData) dataSkipped++;
    skipped++;
  }
  i = j;
}

const preamble = `-- Restauracion del schema public de CreatiFit AI (generado desde db_cluster backup)
SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET search_path = public, extensions;

`;

writeFileSync(outPath, preamble + out.join("\n\n") + "\n");
console.log(`Bloques public conservados: ${kept} | omitidos: ${skipped} (de ellos, datos de tablas no-catalogo: ${dataSkipped})`);
console.log(`Salida: ${outPath}`);
