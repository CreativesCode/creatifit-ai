import { GeneratedPlanSchema } from "../validators/schemas";
import { supabase } from "../supabase-config";

// Genera el plan de fitness llamando a la Edge Function `generate-plan`.
//
// La API key de OpenAI vive como secret en el servidor (Supabase Edge Function),
// nunca en el cliente. Esto evita exponerla en el bundle web o en el .apk.
export async function generateFitnessPlan(intake: any): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-plan", {
      body: intake,
    });

    if (error) {
      console.error("Error invoking generate-plan function:", error);
      throw new Error("Error de conexión al generar el plan. Inténtalo de nuevo.");
    }

    if (!data?.plan) {
      throw new Error("No se recibió un plan válido del servidor.");
    }

    // Validar la estructura con Zod
    const validatedPlan = GeneratedPlanSchema.parse(data.plan);
    return validatedPlan;
  } catch (error) {
    console.error("Error generating fitness plan:", error);

    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        throw new Error("Error de conexión. Verifica tu conexión a internet.");
      }
      // Re-lanzar mensajes ya legibles
      if (error.message.startsWith("Error") || error.message.startsWith("No se")) {
        throw error;
      }
    }

    throw new Error("Error al generar el plan de fitness. Por favor, inténtalo de nuevo.");
  }
}
