import { createClient } from "@supabase/supabase-js";
import { envConfig, logEnvConfigStatus } from "./env-config";

// Log de configuración al importar
logEnvConfigStatus();

// Configuración de Supabase para el frontend
export const supabaseConfig = {
  url: envConfig.SUPABASE_URL,
  anonKey: envConfig.SUPABASE_ANON_KEY,
};

// Cliente de Supabase para el usuario
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// Cliente admin de Supabase (para bypass RLS durante desarrollo)
export const supabaseAdmin = envConfig.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(supabaseConfig.url, envConfig.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase; // Fallback al cliente normal si no hay service role key

// Verificar que las variables estén definidas
console.log("🔧 [SUPABASE CONFIG] Environment variables check:");
console.log("Environment:", envConfig.IS_DEVELOPMENT ? "Development" : "Production");
console.log("Mobile App:", envConfig.IS_MOBILE ? "Yes" : "No");
console.log(
  "NEXT_PUBLIC_SUPABASE_URL:",
  supabaseConfig.url ? "✅ Configurada" : "❌ No configurada"
);
console.log(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
  supabaseConfig.anonKey ? "✅ Configurada" : "❌ No configurada"
);
console.log(
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:",
  envConfig.SUPABASE_SERVICE_ROLE_KEY ? "✅ Configurada" : "❌ No configurada"
);

if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.error("❌ Variables de Supabase no configuradas");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseConfig.url);
  console.error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseConfig.anonKey ? "✅ Configurada" : "❌ No configurada"
  );
  
  if (envConfig.IS_MOBILE) {
    console.error("❌ En aplicación móvil, verifica que las variables de entorno estén configuradas en el build");
    console.error("Asegúrate de que el archivo .env.local tenga las variables NEXT_PUBLIC_* configuradas");
  }
}
