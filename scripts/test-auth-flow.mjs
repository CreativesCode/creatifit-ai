// Prueba E2E de auth + RLS. Crea un usuario de prueba, valida trigger de perfil,
// inserta/lee un plan con su JWT, comprueba aislamiento y borra el usuario.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const email = "rls-test-" + Math.floor(Math.random() * 1e9) + "@example.com";
const password = "Test123456!";
let userId, jwt;
const log = (...a) => console.log(...a);

async function j(res) { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } }

// 1) Crear usuario confirmado (admin)
let r = await fetch(`${URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, email_confirm: true }),
});
let body = await j(r);
userId = body.id;
log(`1) Crear usuario: HTTP ${r.status}  id=${userId}`);

// 2) Verificar perfil auto-creado (trigger) via service_role
r = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}&select=id,email`, {
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
});
body = await j(r);
log(`2) Perfil auto-creado por trigger: ${Array.isArray(body) && body.length === 1 ? "SI ✅" : "NO ❌ " + JSON.stringify(body)}`);

// 3) Login -> JWT de usuario
r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
body = await j(r);
jwt = body.access_token;
log(`3) Login: HTTP ${r.status}  jwt=${jwt ? "obtenido ✅" : "FALLO ❌"}`);

// 4) Insertar un plan con el JWT del usuario (RLS WITH CHECK)
const planId = "test_plan_" + Math.floor(Math.random() * 1e9);
r = await fetch(`${URL}/rest/v1/plans`, {
  method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ id: planId, user_id: userId, weeks: 8, version: 1, source_hash: planId, payload: { days: [] } }),
});
body = await j(r);
log(`4) Insertar plan (usuario): HTTP ${r.status} ${r.status === 201 ? "✅" : "❌ " + JSON.stringify(body)}`);

// 5) Leer planes con el JWT (debe ver el suyo)
r = await fetch(`${URL}/rest/v1/plans?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } });
body = await j(r);
log(`5) Leer planes (usuario): ve ${Array.isArray(body) ? body.length : "?"} plan(es) ${Array.isArray(body) && body.length === 1 ? "✅" : "❌"}`);

// 6) Aislamiento: anon sin sesion NO debe ver el plan
r = await fetch(`${URL}/rest/v1/plans?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
body = await j(r);
log(`6) Aislamiento anon (sin login): ve ${Array.isArray(body) ? body.length : "?"} plan(es) ${Array.isArray(body) && body.length === 0 ? "✅ (0, correcto)" : "❌"}`);

// 7) Limpieza: borrar usuario (cascade a profile/plans)
r = await fetch(`${URL}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
log(`7) Limpieza usuario de prueba: HTTP ${r.status} ${r.ok ? "✅" : "❌"}`);
