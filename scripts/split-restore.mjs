// Divide restore_public.sql para completar una restauracion parcial:
//  - exercises_data.tsv  : filas de la tabla exercises (para \copy resistente)
//  - part_exercises.sql  : meta-comando \copy que carga ese TSV
//  - part_postdata.sql   : TODO lo posterior al ultimo bloque COPY
//                          (setval, constraints, indices, triggers, RLS, policies, grants)
// Asume que `exercises` es el ultimo bloque COPY del archivo (orden alfabetico de pg_dump).

import { readFileSync, writeFileSync } from "node:fs";

const IN = "C:/Users/rober/AppData/Local/Temp/restore_public.sql";
const lines = readFileSync(IN, "utf8").split(/\r?\n/);

let copyStart = -1, dataStart = -1, dataEnd = -1, colList = "";
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^COPY public\.exercises (\(.+\)) FROM stdin;/);
  if (m) { copyStart = i; colList = m[1]; dataStart = i + 1; }
  if (copyStart !== -1 && dataStart !== -1 && i >= dataStart && lines[i] === "\\.") { dataEnd = i; break; }
}
if (copyStart === -1 || dataEnd === -1) {
  console.error("No se encontro el bloque COPY de exercises"); process.exit(1);
}

const rows = lines.slice(dataStart, dataEnd);

// Trocear en lotes para que ningun \copy sea un statement largo (evita timeouts del pooler).
const CHUNK = 250;
const tmp = "C:/Users/rober/AppData/Local/Temp";
let sql = "SET statement_timeout = 0;\n";
let nChunks = 0;
for (let s = 0; s < rows.length; s += CHUNK) {
  const part = rows.slice(s, s + CHUNK);
  const fpath = `${tmp}/exercises_chunk_${nChunks}.tsv`;
  writeFileSync(fpath, part.join("\n") + "\n");
  sql += `\\copy public.exercises ${colList} FROM '${fpath}' WITH (FORMAT text)\n`;
  nChunks++;
}
writeFileSync(`${tmp}/part_exercises.sql`, sql);

const postdata = lines.slice(dataEnd + 1).join("\n");
writeFileSync("C:/Users/rober/AppData/Local/Temp/part_postdata.sql", "SET statement_timeout = 0;\n" + postdata + "\n");

console.log(`exercises: ${rows.length} filas en ${nChunks} lotes -> part_exercises.sql`);
console.log(`columnas: ${colList.slice(0, 80)}...`);
console.log(`post-data: ${lines.length - dataEnd - 1} lineas -> part_postdata.sql`);
