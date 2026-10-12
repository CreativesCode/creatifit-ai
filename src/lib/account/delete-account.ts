// Borra la cuenta del usuario logueado llamando a la Edge Function
// `delete-account` (service role). Tras el borrado, el llamador debe cerrar
// sesión localmente.

import { supabase } from "../supabase-config";
import { envConfig } from "../env-config";

/** No se pudo llegar al servidor: la cuenta NO se ha eliminado. */
export class AccountDeletionNetworkError extends Error {
  constructor() {
    super("ACCOUNT_DELETION_NETWORK");
    this.name = "AccountDeletionNetworkError";
  }
}

export async function deleteOwnAccount(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new AccountDeletionNetworkError();
  }
  // Con el token caducado y sin red, getSession espera ~30 s al refresh.
  const session = await Promise.race([
    supabase.auth.getSession().then((r) => r.data.session),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);
  const token = session?.access_token;
  if (!token) throw new AccountDeletionNetworkError();

  const res = await fetch(`${envConfig.SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: envConfig.SUPABASE_ANON_KEY,
    },
    body: "{}",
  }).catch(() => {
    throw new AccountDeletionNetworkError();
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error ?? `Error ${res.status}`);
  }
}
