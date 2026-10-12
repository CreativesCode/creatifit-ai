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
      // La API devuelve como mucho 1000 filas por petición: se lee por páginas
      // para que la lista no se corte en silencio cuando crezca.
      const PAGE = 1000;
      // deno-lint-ignore no-explicit-any
      const profiles: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await admin
          .from("profiles")
          .select("id, email, name, tier, is_admin, created_at")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) return json({ error: error.message }, 500);
        profiles.push(...(data ?? []));
        if ((data ?? []).length < PAGE) break;
      }

      // Actividad por usuario agregada en la BD (planes, sesiones, último entreno,
      // generaciones y último acceso): una fila por usuario, sin traer tablas enteras.
      // deno-lint-ignore no-explicit-any
      const activity: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error: activityErr } = await admin
          .rpc("admin_user_activity")
          .range(from, from + PAGE - 1);
        if (activityErr) return json({ error: activityErr.message }, 500);
        activity.push(...(data ?? []));
        if ((data ?? []).length < PAGE) break;
      }

      type Activity = {
        user_id: string;
        plan_count: number;
        session_count: number;
        set_count: number;
        last_workout: string | null;
        generation_count: number;
        last_sign_in: string | null;
      };
      const byUser = new Map<string, Activity>(
        ((activity ?? []) as Activity[]).map((a) => [a.user_id, a])
      );

      const users = (profiles ?? []).map((p) => {
        const a = byUser.get((p as { id: string }).id);
        return {
          ...p,
          plan_count: Number(a?.plan_count ?? 0),
          session_count: Number(a?.session_count ?? 0),
          set_count: Number(a?.set_count ?? 0),
          last_workout: a?.last_workout ?? null,
          generation_count: Number(a?.generation_count ?? 0),
          last_sign_in: a?.last_sign_in ?? null,
        };
      });
      return json({ users });
    }

    // Detalle de un usuario para dar soporte en el piloto: su cuestionario, sus
    // planes (resumidos) y sus últimas sesiones. Solo lectura.
    case "userDetail": {
      const userId = String(body?.userId ?? "");
      if (!userId) return json({ error: "userId requerido" }, 400);

      const [intakeRes, plansRes, logsRes] = await Promise.all([
        admin
          .from("intake")
          .select("objective, level, age, weight_kg, height_cm, equipment, steps_day, notes, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1),
        admin
          .from("plans")
          .select("id, weeks, created_at, payload")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10),
        admin
          .from("workout_logs")
          .select("session_id, plan_id, plan_day_id, actual_reps, weight, rpe, timestamp")
          .eq("user_id", userId)
          .order("timestamp", { ascending: false })
          .limit(600),
      ]);
      const failed = intakeRes.error ?? plansRes.error ?? logsRes.error;
      if (failed) return json({ error: failed.message }, 500);

      // deno-lint-ignore no-explicit-any
      const plans = (plansRes.data ?? []).map((p: any) => ({
        id: p.id,
        weeks: p.weeks,
        created_at: p.created_at,
        // deno-lint-ignore no-explicit-any
        days: (p.payload?.days ?? []).map((d: any) => ({
          day: String(d?.day ?? ""),
          focus: String(d?.focus ?? ""),
          // deno-lint-ignore no-explicit-any
          exercises: (d?.blocks ?? []).map((b: any) => String(b?.name ?? "")),
        })),
      }));

      type Sess = {
        session_id: string;
        plan_id: string | null;
        day: string;
        at: string;
        sets: number;
        volume: number;
        rpeSum: number;
        rpeCount: number;
      };
      const bySession = new Map<string, Sess>();
      for (const l of logsRes.data ?? []) {
        const s = bySession.get(l.session_id) ?? {
          session_id: l.session_id,
          plan_id: l.plan_id ?? null,
          day: String(l.plan_day_id ?? ""),
          at: l.timestamp,
          sets: 0,
          volume: 0,
          rpeSum: 0,
          rpeCount: 0,
        };
        s.sets++;
        s.volume += Number(l.actual_reps ?? 0) * Number(l.weight ?? 0);
        if (l.rpe) {
          s.rpeSum += Number(l.rpe);
          s.rpeCount++;
        }
        // Las filas llegan de más reciente a más antigua: `at` queda con el inicio.
        s.at = l.timestamp;
        bySession.set(l.session_id, s);
      }
      const sessions = Array.from(bySession.values())
        .slice(0, 20)
        .map((s) => ({
          session_id: s.session_id,
          plan_id: s.plan_id,
          day: s.day,
          at: s.at,
          sets: s.sets,
          volume: Math.round(s.volume),
          avg_rpe: s.rpeCount ? Math.round((s.rpeSum / s.rpeCount) * 10) / 10 : null,
        }));

      // La tabla `intake` no la escribe la app: el cuestionario viaja dentro del
      // plan (payload.meta). Se usa el del plan más reciente como respaldo.
      // deno-lint-ignore no-explicit-any
      const meta: any = (plansRes.data ?? [])[0]?.payload?.meta ?? null;
      const trueKeys = (o: unknown) =>
        o && typeof o === "object"
          ? Object.entries(o as Record<string, unknown>)
              .filter(([, v]) => v === true)
              .map(([k]) => k.replace(/_/g, " "))
          : [];
      const avoid = trueKeys(meta?.constraints);
      const fromMeta = meta
        ? {
            objective: meta.objective ?? null,
            level: meta.level ?? null,
            age: meta.age ?? null,
            weight_kg: meta.weight_kg ?? null,
            height_cm: meta.height_cm ?? null,
            equipment: Array.isArray(meta.equipment) ? meta.equipment : trueKeys(meta.equipment),
            steps_day: meta.steps_day ?? null,
            notes:
              [meta.notes, avoid.length ? `Evitar: ${avoid.join(", ")}` : null]
                .filter(Boolean)
                .join(" · ") || null,
            created_at: meta.created_at ?? (plansRes.data ?? [])[0]?.created_at,
          }
        : null;

      return json({ intake: intakeRes.data?.[0] ?? fromMeta, plans, sessions });
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

    // Mismo tier para varios usuarios a la vez (p. ej. Pro a todo el piloto).
    case "setTierBulk": {
      const tier = String(body?.tier ?? "");
      const userIds = Array.isArray(body?.userIds)
        ? (body.userIds as unknown[]).map(String).filter(Boolean)
        : [];
      if (!VALID_TIERS.has(tier) || userIds.length === 0 || userIds.length > 500) {
        return json({ error: "Parámetros inválidos" }, 400);
      }
      const { data, error } = await admin
        .from("profiles")
        .update({ tier, subscription_updated_at: new Date().toISOString() })
        .in("id", userIds)
        .select("id");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, updated: (data ?? []).length });
    }

    // Crear una cuenta lista para usar (sin correo de confirmación): el admin
    // entrega el correo y la contraseña al tester.
    case "createUser": {
      const email = String(body?.email ?? "").trim().toLowerCase();
      const password = String(body?.password ?? "");
      const name = String(body?.name ?? "").trim().slice(0, 80);
      const tier = String(body?.tier ?? "free");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "Correo no válido" }, 400);
      }
      if (password.length < 8) {
        return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      }
      if (!VALID_TIERS.has(tier)) return json({ error: "Plan no válido" }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { full_name: name } : {},
      });
      if (error || !data?.user) {
        const msg = error?.message ?? "";
        return json(
          { error: /already|registered|exists/i.test(msg) ? "Ya existe una cuenta con ese correo" : msg || "No se pudo crear la cuenta" },
          400
        );
      }
      const userId = data.user.id;
      // El trigger on_auth_user_created crea el perfil; se asegura igualmente.
      const { error: profileErr } = await admin
        .from("profiles")
        .upsert(
          { id: userId, email, name: name || null, tier, subscription_updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
      if (profileErr) return json({ error: profileErr.message }, 500);
      return json({ ok: true, userId });
    }

    // Eliminar la cuenta por completo. Borra las fotos del Storage y luego
    // auth.users -> cascada a profiles, intake, plans, workout_logs, medidas,
    // favoritos y generaciones (ON DELETE CASCADE).
    case "deleteUser": {
      const userId = String(body?.userId ?? "");
      if (!userId) return json({ error: "userId requerido" }, 400);
      if (userId === callerId) {
        return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
      }
      // No dejar el proyecto sin administradores.
      const { data: target } = await admin
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();
      if (target?.is_admin) {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_admin", true);
        if ((count ?? 0) <= 1) {
          return json({ error: "No se puede eliminar al único administrador" }, 400);
        }
      }
      const photoError = await removeUserPhotos(admin, userId);
      if (photoError) return json({ error: photoError }, 500);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    default:
      return json({ error: "Acción desconocida" }, 400);
  }
}

// Borra las fotos de progreso del usuario (bucket privado, carpeta {user_id}/).
// Las tablas se limpian solas por ON DELETE CASCADE, pero los archivos del
// Storage no: sin esto las fotos sobrevivían a la cuenta.
// deno-lint-ignore no-explicit-any
async function removeUserPhotos(admin: any, userId: string): Promise<string | null> {
  const bucket = admin.storage.from("progress-photos");
  for (let round = 0; round < 50; round++) {
    const { data, error } = await bucket.list(userId, { limit: 1000 });
    if (error) return error.message;
    if (!data || data.length === 0) return null;
    const { error: rmError } = await bucket.remove(
      data.map((o: { name: string }) => `${userId}/${o.name}`)
    );
    if (rmError) return rmError.message;
  }
  return null;
}
