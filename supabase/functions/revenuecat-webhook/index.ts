// Supabase Edge Function: revenuecat-webhook
//
// Recibe los eventos de RevenueCat y mantiene `profiles.tier` sincronizado con el
// estado real de la suscripción. Es la FUENTE DE VERDAD del tier: el cliente y la
// función `generate-plan` solo LEEN esta columna; aquí es el único sitio donde se
// escribe (con service role, saltándose RLS).
//
// Seguridad: RevenueCat envía el header `Authorization` con el valor que configures
// en su dashboard (Integrations -> Webhooks -> Authorization header). Comparamos
// contra el secret `REVENUECAT_WEBHOOK_AUTH`. Sin coincidencia -> 401.
//
// Deploy (IMPORTANTE: sin verificación de JWT de Supabase, porque el Authorization
// header trae NUESTRO secret, no un JWT de Supabase):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<un-secreto-largo-aleatorio>
//
// Luego en RevenueCat: Integrations -> Webhooks -> URL =
//   https://<project-ref>.functions.supabase.co/revenuecat-webhook
//   Authorization header = el mismo valor de REVENUECAT_WEBHOOK_AUTH

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

// Mapea el product_id de RevenueCat a nuestro tier. Debe coincidir con
// NEXT_PUBLIC_REVENUECAT_PRODUCT_* y con src/lib/revenuecat/config.ts.
function productToTier(productId?: string | null): "pro_monthly" | "pro_annual" {
  if (productId && productId.includes("yearly")) return "pro_annual";
  return "pro_monthly";
}

// Tipos de evento que CONCEDEN/mantienen el acceso Pro.
const GRANTING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

// Tipos de evento que RETIRAN el acceso (vuelve a free).
// OJO: CANCELLATION en RevenueCat = auto-renovación desactivada, el usuario SIGUE
// teniendo acceso hasta que expire -> NO se degrada aquí, solo en EXPIRATION.
const REVOKING = new Set(["EXPIRATION"]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1) Autenticación del webhook.
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  if (!expected) {
    console.error("REVENUECAT_WEBHOOK_AUTH no configurado");
    return new Response("Server misconfiguration", { status: 500 });
  }
  if (req.headers.get("Authorization") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2) Parsear el evento.
  let body: { event?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const event = body?.event ?? {};
  const type = String(event["type"] ?? "");
  const appUserId = String(event["app_user_id"] ?? "");
  const productId = (event["product_id"] as string | undefined) ?? null;

  if (!appUserId) {
    // Sin usuario no hay nada que actualizar (p. ej. eventos TEST).
    return new Response(JSON.stringify({ ok: true, skipped: "no app_user_id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3) Decidir el nuevo tier según el tipo de evento.
  let newTier: string | null = null;
  if (GRANTING.has(type)) newTier = productToTier(productId);
  else if (REVOKING.has(type)) newTier = "free";
  // Otros tipos (CANCELLATION, BILLING_ISSUE, TRANSFER, TEST...) no cambian el tier.

  if (newTier === null) {
    return new Response(JSON.stringify({ ok: true, skipped: type }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4) Persistir en profiles (service role -> ignora RLS).
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no disponibles");
    return new Response("Server misconfiguration", { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase
    .from("profiles")
    .update({ tier: newTier, subscription_updated_at: new Date().toISOString() })
    .eq("id", appUserId);

  if (error) {
    console.error("Error actualizando tier:", error, { appUserId, type, newTier });
    // 500 -> RevenueCat reintentará el webhook automáticamente.
    return new Response("DB error", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, appUserId, tier: newTier, type }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
