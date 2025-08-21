// Configuración de Supabase para el frontend
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

// Verificar que las variables estén definidas
console.log("🔧 [SUPABASE CONFIG] Environment variables check:");
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
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    ? "✅ Configurada"
    : "❌ No configurada"
);

if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.error("❌ Variables de Supabase no configuradas");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseConfig.url);
  console.error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseConfig.anonKey ? "✅ Configurada" : "❌ No configurada"
  );
}
