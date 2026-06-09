import { createClient } from "@supabase/supabase-js";
import { envConfig, logEnvConfigStatus } from "./env-config";

// Log de configuración al importar
logEnvConfigStatus();

// Configuración de Supabase para el frontend
export const supabaseConfig = {
  url: envConfig.SUPABASE_URL,
  anonKey: envConfig.SUPABASE_ANON_KEY,
};

// Cliente único de Supabase (autenticado con el JWT del usuario cuando hay sesión).
// IMPORTANTE: NO usamos service_role en el cliente. Todas las operaciones pasan por
// RLS con la identidad del usuario logueado.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // necesario para el redirect de confirmación de correo
    flowType: "pkce",
  },
});

if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.error("❌ Variables de Supabase no configuradas");
  if (envConfig.IS_MOBILE) {
    console.error("❌ En app móvil, verifica que las variables NEXT_PUBLIC_* estén en el build");
  }
}
