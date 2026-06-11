// Supabase Edge Function: admin-api
//
// Backend del panel de administración (/admin). Usa la SERVICE ROLE key para
// saltarse RLS y poder ver/gestionar TODAS las cuentas. Cada acción (salvo el
// bootstrap inicial) exige que quien llama sea un usuario con `profiles.is_admin`.
//
// ¿Por qué una Edge Function y no RLS directo desde el cliente?
//   - Listar todos los usuarios requiere ignorar RLS (service role).
//   - Cambiar `tier` está bloqueado por REVOKE para `authenticated` (ver
//     add-subscription-tier.sql) -> solo el service role puede.
//   - Borrar una cuenta de verdad (auth.users) requiere la Admin API.
//
// Seguridad: se despliega con --no-verify-jwt porque la propia función valida el
// token (acciones normales) o un secret de un solo uso (bootstrap). NUNCA se
// expone la service role al cliente.
//
// Deploy:
//   supabase functions deploy admin-api --no-verify-jwt
//   supabase secrets set ADMIN_BOOTSTRAP_SECRET=<un-secreto-largo-aleatorio>
//   # SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles por defecto.
//
// Crear el primer admin (una sola vez; luego borra el secret):
//   curl -X POST https://<ref>.functions.supabase.co/admin-api \
//     -H "x-bootstrap-secret: <ADMIN_BOOTSTRAP_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"action":"bootstrapAdmin","email":"admin@creatifitai.com","password":"admin123"}'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bootstrap-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Espejo de src/lib/config/plans-config.ts y add-subscription-tier.sql.
const VALID_TIERS = new Set(["free", "pro_monthly", "pro_annual"]);

Deno.serve(async (req: Request) => {
  try {
    return await handle(req);
  } catch (e) {
    console.error("admin-api unhandled error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no disponibles");
    return json({ error: "Server misconfiguration" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const action = String(body?.action ?? "");

  // ───────────────────────────────────────────────────────────────────────────
  // Bootstrap (un solo uso): crea el primer admin. Protegido por un secret, NO
  // por el check de admin (chicken-egg: aún no hay admin). Tras usarlo, borra el
  // secret con `supabase secrets unset ADMIN_BOOTSTRAP_SECRET`.
  // ───────────────────────────────────────────────────────────────────────────
  if (action === "bootstrapAdmin") {
    const expected = Deno.env.get("ADMIN_BOOTSTRAP_SECRET");
    if (!expected || req.headers.get("x-bootstrap-secret") !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || password.length < 6) {
      return json({ error: "email inválido o password < 6 caracteres" }, 400);
    }

    // ¿Ya existe el usuario? (la Admin API no tiene get-by-email, paginamos).
    let userId: string | null = null;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (data.users.length < 200) break;
    }

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      userId = data.user.id;
    } else {
      // Ya existía: garantizamos password y email confirmado.
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    }

    // El trigger on_auth_user_created crea el profile; lo aseguramos igualmente
    // y marcamos is_admin = true.
    await admin
      .from("profiles")
      .upsert({ id: userId, email, is_admin: true }, { onConflict: "id" });
    await admin.from("profiles").update({ is_admin: true }).eq("id", userId);

    return json({ ok: true, userId });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Resto de acciones: exigen un usuario autenticado y con is_admin = true.
  // ───────────────────────────────────────────────────────────────────────────
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "No autenticado" }, 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Token inválido" }, 401);
  const callerId = userData.user.id;

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", callerId)
    .single();
  if (!callerProfile?.is_admin) return json({ error: "Acceso denegado" }, 403);

  switch (action) {
    // Listado de usuarios con su tier y número de planes.
    case "list": {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, email, name, tier, is_admin, created_at")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      // Conteo de planes por usuario (una sola consulta + agregado en memoria).
      const { data: plans, error: plansErr } = await admin
        .from("plans")
        .select("user_id");
      if (plansErr) return json({ error: plansErr.message }, 500);

      const counts: Record<string, number> = {};
      for (const p of plans ?? []) {
        const uid = (p as { user_id: string }).user_id;
        if (uid) counts[uid] = (counts[uid] ?? 0) + 1;
      }

      const users = (profiles ?? []).map((p) => ({
        ...p,
        plan_count: counts[(p as { id: string }).id] ?? 0,
      }));
      return json({ users });
    }

    // Asignar/forzar tier (free | pro_monthly | pro_annual) sin pasar por pago.
    case "setTier": {
      const userId = String(body?.userId ?? "");
      const tier = String(body?.tier ?? "");
      if (!userId || !VALID_TIERS.has(tier)) {
        return json({ error: "Parámetros inválidos" }, 400);
      }
      const { error } = await admin
        .from("profiles")
        .update({ tier, subscription_updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // Eliminar la cuenta por completo. Borra auth.users -> cascada a profiles,
    // intake, plans y workout_logs (ON DELETE CASCADE).
    case "deleteUser": {
      const userId = String(body?.userId ?? "");
      if (!userId) return json({ error: "userId requerido" }, 400);
      if (userId === callerId) {
        return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    default:
      return json({ error: "Acción desconocida" }, 400);
  }
}
