// Supabase Edge Function: delete-account
//
// Permite que un usuario borre SU PROPIA cuenta por completo. Borrar de
// auth.users requiere la Admin API (service role), que no puede vivir en el
// cliente -> de ahí esta función. Solo borra la cuenta del usuario que llama
// (validada por su JWT); nunca la de otro.
//
// Borra auth.users -> cascada a profiles, intake, plans, plan_exercises y
// workout_logs (ON DELETE CASCADE).
//
// Deploy:
//   supabase functions deploy delete-account --no-verify-jwt
//   # SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles por defecto.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfiguration" }, 500);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Identificar al usuario por su JWT. Solo puede borrarse a sí mismo.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "No autenticado" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Token inválido" }, 401);

    // El único administrador no puede borrarse a sí mismo: nadie podría entrar
    // después al panel ni nombrar a otro.
    const { data: own } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (own?.is_admin) {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_admin", true);
      if ((count ?? 0) <= 1) {
        return json(
          { error: "Eres el único administrador. Nombra a otro antes de eliminar esta cuenta." },
          400
        );
      }
    }

    // Primero los archivos: si fallan, la cuenta sigue existiendo y se puede reintentar.
    const photoError = await removeUserPhotos(admin, userData.user.id);
    if (photoError) return json({ error: photoError }, 500);

    const { error } = await admin.auth.admin.deleteUser(userData.user.id);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error("delete-account error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
