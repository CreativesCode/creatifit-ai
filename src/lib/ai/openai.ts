import OpenAI from "openai";
import { GeneratedPlanSchema } from "../validators/schemas";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateFitnessPlan(intake: any): Promise<any> {
  try {
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
      model: process.env.NEXT_PUBLIC_MODEL_NAME || "gpt-4o-mini",
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
    throw new Error("Failed to generate fitness plan");
  }
}
