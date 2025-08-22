import OpenAI from "openai";
import { GeneratedPlanSchema } from "../validators/schemas";
import { envConfig, logEnvConfigStatus } from "../env-config";

// Log de configuración al importar
logEnvConfigStatus();

const openai = new OpenAI({
  apiKey: envConfig.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateFitnessPlan(intake: any): Promise<any> {
  try {
    // Validar configuración antes de proceder
    if (!envConfig.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key no configurada. Verifica que las variables de entorno estén configuradas correctamente.");
    }

    const systemPrompt = `You are an expert fitness coach. Generate a personalized workout plan based on the user's profile.

    Return ONLY valid JSON following this exact schema:
    {
      "weeks": number,
      "days": [
        {
          "day": "A|B|C|D",
          "focus": "string describing the focus",
          "blocks": [
            {
              "name": "exercise name",
              "sets": number,
              "reps": [min_reps, max_reps],
              "rest_sec": number,
              "cues": ["cue1", "cue2"]
            }
          ]
        }
      ]
    }

    Guidelines:
    - Create a balanced plan with push/pull/squat/hinge/core movements
    - Adjust difficulty based on user level
    - Use available equipment only
    - Respect any constraints (no jumps, etc.)
    - Rest periods: 30-120 seconds based on intensity
    - Rep ranges: 8-15 for hypertrophy, 3-8 for strength, 15+ for endurance
    - Include 3-6 exercises per day
    - Rotate between A/B/C/D days for variety`;

    const userPrompt = `Generate a ${intake.weeks}-week fitness plan for:
    - Objective: ${intake.objective}
    - Level: ${intake.level}
    - Age: ${intake.age}
    - Weight: ${intake.weightKg}kg
    - Height: ${intake.heightCm}cm
    - Equipment: ${JSON.stringify(intake.equipment)}
    - Constraints: ${JSON.stringify(intake.constraints || {})}
    - Daily steps: ${intake.stepsDay || "not specified"}`;

    const completion = await openai.chat.completions.create({
      model: envConfig.MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    const plan = JSON.parse(responseText);

    // Validar con Zod
    const validatedPlan = GeneratedPlanSchema.parse(plan);

    return validatedPlan;
  } catch (error) {
    console.error("Error generating fitness plan:", error);
    
    // Mensaje de error más específico para la aplicación móvil
    if (error instanceof Error) {
      if (error.message.includes("API Key")) {
        throw new Error("Configuración de OpenAI incompleta. Verifica que las variables de entorno estén configuradas correctamente.");
      } else if (error.message.includes("Failed to fetch")) {
        throw new Error("Error de conexión. Verifica tu conexión a internet.");
      }
    }
    
    throw new Error("Error al generar el plan de fitness. Por favor, inténtalo de nuevo.");
  }
}
