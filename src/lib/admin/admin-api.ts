// Cliente del panel de administración. Llama a la Edge Function `admin-api`
// (service role) con el access token del admin logueado. Toda la autorización
// real ocurre en el servidor; aquí solo adjuntamos el JWT.

import { supabase } from "../supabase-config";
import { envConfig } from "../env-config";

const FN_URL = `${envConfig.SUPABASE_URL}/functions/v1/admin-api`;

export type Tier = "free" | "pro_monthly" | "pro_annual";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  is_admin: boolean;
  created_at: string;
  plan_count: number;
}

async function callAdmin<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No autenticado");

  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: envConfig.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error ?? `Error ${res.status}`);
  }
  return body as T;
}

export const adminApi = {
  listUsers: () => callAdmin<{ users: AdminUser[] }>("list").then((r) => r.users),
  setTier: (userId: string, tier: Tier) => callAdmin("setTier", { userId, tier }),
  deleteUser: (userId: string) => callAdmin("deleteUser", { userId }),
};
