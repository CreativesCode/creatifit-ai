// Supabase Edge Function: generate-plan
//
// Genera un plan de fitness con OpenAI DESDE EL SERVIDOR.
// La OPENAI_API_KEY vive como secret de la función (Deno.env) y NUNCA se
// expone al cliente ni se hornea en el bundle/.apk.
//
// Deploy:
//   supabase functions deploy generate-plan
//   supabase secrets set OPENAI_API_KEY=sk-... MODEL_NAME=gpt-4o-mini
//
// Test local:
//   supabase functions serve generate-plan --env-file .env.local

// CORS: el cliente Capacitor corre en orígenes como capacitor://localhost,
// http://localhost y https://localhost. Permitimos cualquier origen porque
// la función no usa cookies; la autorización va por el header Authorization.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert fitness coach. Generate a personalized workout plan based on the user's profile.

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

interface Intake {
  weeks?: number;
  objective?: string;
  level?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  equipment?: Record<string, boolean>;
  constraints?: Record<string, boolean>;
  stepsDay?: number;
}

function buildUserPrompt(intake: Intake): string {
  return `Generate a ${intake.weeks}-week fitness plan for:
    - Objective: ${intake.objective}
    - Level: ${intake.level}
    - Age: ${intake.age}
    - Weight: ${intake.weightKg}kg
    - Height: ${intake.heightCm}cm
    - Equipment: ${JSON.stringify(intake.equipment)}
    - Constraints: ${JSON.stringify(intake.constraints || {})}
    - Daily steps: ${intake.stepsDay || "not specified"}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("OPENAI_API_KEY no configurada en los secrets de la función");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing API key" }),
        { status: 500, headers: jsonHeaders }
      );
    }
    const model = Deno.env.get("MODEL_NAME") || "gpt-4o-mini";

    const intake: Intake = await req.json();

    // Validación mínima de entrada
    if (!intake || typeof intake !== "object" || !intake.objective || !intake.level) {
      return new Response(
        JSON.stringify({ error: "Invalid intake payload" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(intake) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, detail);
      return new Response(
        JSON.stringify({ error: "Upstream AI error" }),
        { status: 502, headers: jsonHeaders }
      );
    }

    const completion = await openaiRes.json();
    const responseText = completion.choices?.[0]?.message?.content;
    if (!responseText) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 502, headers: jsonHeaders }
      );
    }

    // Devolvemos el plan parseado; el cliente lo valida con Zod (GeneratedPlanSchema).
    const plan = JSON.parse(responseText);
    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Error generating fitness plan:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate plan" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
