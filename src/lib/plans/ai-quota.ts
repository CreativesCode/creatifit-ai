import { supabase } from "@/lib/supabase-config";

/**
 * Generaciones de IA ya consumidas por el usuario (RLS limita a las suyas).
 * El cupo se cuenta sobre plan_generations, nunca sobre los planes guardados:
 * un plan hecho a mano no gasta nada. Es solo la guía del cliente para abrir el
 * paywall sin gastar la llamada; el límite real lo aplica generate-plan.
 */
export async function countAiGenerations(): Promise<number> {
  const { count, error } = await supabase
    .from("plan_generations")
    .select("id", { count: "exact", head: true })
    .eq("status", "ok");
  if (error) {
    // Sin red o sin respuesta: se deja pasar y decide el servidor.
    console.error("Error counting AI generations:", error);
    return 0;
  }
  return count ?? 0;
}
