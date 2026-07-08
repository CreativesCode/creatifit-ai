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
//
// Fallback a un placeholder cuando las NEXT_PUBLIC_* no están definidas: durante el
// export estático (next build con output:"export") las páginas se prerenderizan y, si
// createClient recibe una URL vacía, lanza "supabaseUrl is required." y rompe TODO el
// build. Con el placeholder el prerender emite HTML (solo el estado de carga; la auth
// se resuelve en cliente) y los valores reales se inlinan cuando las vars sí existen.
// OJO: si faltan en el build real, la app compila pero NO conecta con Supabase — las
// NEXT_PUBLIC_* deben estar presentes en el entorno de build (CI/CD).
const clientUrl = supabaseConfig.url || "https://placeholder.supabase.co";
const clientAnonKey = supabaseConfig.anonKey || "placeholder-anon-key";

export const supabase = createClient(clientUrl, clientAnonKey, {
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
