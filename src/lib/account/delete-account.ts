// Borra la cuenta del usuario logueado llamando a la Edge Function
// `delete-account` (service role). Tras el borrado, el llamador debe cerrar
// sesión localmente.

import { supabase } from "../supabase-config";
import { envConfig } from "../env-config";

export async function deleteOwnAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No autenticado");

  const res = await fetch(`${envConfig.SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: envConfig.SUPABASE_ANON_KEY,
    },
    body: "{}",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error ?? `Error ${res.status}`);
  }
}
