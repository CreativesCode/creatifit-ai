// Supabase Edge Function: generate-plan
//
// Genera un plan de fitness con OpenAI DESDE EL SERVIDOR, anclado al catálogo REAL
// de ejercicios de la base de datos.
//
// Flujo:
//   1. Mapea el equipamiento del usuario a un array y consulta `get_filtered_exercises`
//      para obtener la lista de ejercicios disponibles (con su id real).
//   2. Inyecta esa lista NUMERADA + las instrucciones RPN/edad/género en el prompt.
//   3. GPT devuelve, por cada bloque, el número de referencia (`ref`) de un ejercicio
//      de la lista — NO un nombre libre. Así nunca inventa ejercicios.
//   4. El servidor resuelve cada `ref` -> { exercise_id, name } canónicos y los inserta
//      en el plan. El cliente recibe ejercicios que SÍ existen (con GIF, músculos, etc.).
//
// La OPENAI_API_KEY vive como secret de la función (Deno.env) y NUNCA se expone al cliente.
//
// Deploy:
//   supabase functions deploy generate-plan
//   supabase secrets set OPENAI_API_KEY=sk-... MODEL_NAME=gpt-4o
//
// Test local:
//   supabase functions serve generate-plan --env-file .env.local

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { generateRPNInstructions } from "./rpn-config.ts";

// CORS: el cliente Capacitor corre en orígenes como capacitor://localhost,
// http://localhost y https://localhost. Permitimos cualquier origen porque
// la función no usa cookies; la autorización va por el header Authorization.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Mapa de clave de equipamiento del formulario -> término tal y como aparece en la
// columna `equipment` (texto libre) de la tabla `exercises`. Ej. de valores reales:
// "Full Gym, NO EQUIPMENT", "Dumbbells, Full Gym", "Full Gym, Resistance Band"...
// Casi todo el catálogo es kind="strength", así que NO filtramos por kind.
const EQUIPMENT_TERMS: Record<string, string> = {
  // Peso corporal / casero -> ejercicios marcados como "NO EQUIPMENT"
  none: "NO EQUIPMENT",
  wall: "NO EQUIPMENT",
  chair: "NO EQUIPMENT",
  table: "NO EQUIPMENT",
  yoga_mat: "NO EQUIPMENT",
  pushup_handles: "NO EQUIPMENT",
  jump_rope: "NO EQUIPMENT",
  ab_wheel: "NO EQUIPMENT",
  pullup_bar: "NO EQUIPMENT",
  dip_bars: "NO EQUIPMENT",
  vibration_platform: "NO EQUIPMENT",
  // Con equipamiento -> término que aparece en la columna
  resistance_band: "Resistance Band",
  resistance_tubes: "Resistance Band",
  dumbbells: "Dumbbell",
  barbell: "Barbell",
  weight_plates: "Plate",
  ez_bar: "Barbell",
  trap_bar: "Barbell",
  power_rack: "Full Gym",
  bench: "Bench",
  incline_bench: "Bench",
  foam_roller: "Foam Roller",
};

interface Intake {
  weeks?: number;
  objective?: string;
  level?: string;
  gender?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  equipment?: Record<string, boolean>;
  constraints?: Record<string, boolean>;
  stepsDay?: number;
  notes?: string;
  language?: string;
}

// Idioma en el que el modelo debe escribir el texto legible (focus + cues).
// Los nombres de ejercicio NO se traducen: vienen del catálogo de la BD.
function languageName(code?: string): string {
  const map: Record<string, string> = {
    es: "Spanish",
    en: "English",
  };
  return map[(code || "").slice(0, 2).toLowerCase()] || "Spanish";
}

interface DbExercise {
  id: string;
  name: string;
  kind?: string | null;
  equipment?: string | null;
  primary_muscles?: string | null;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// Términos de equipamiento a buscar en la columna `equipment`. Siempre incluimos
// "NO EQUIPMENT" para garantizar una base de ejercicios de peso corporal.
function equipmentTerms(equipment?: Record<string, boolean>): string[] {
  const terms = new Set<string>(["NO EQUIPMENT"]);
  if (equipment) {
    for (const [key, enabled] of Object.entries(equipment)) {
      if (enabled && EQUIPMENT_TERMS[key]) terms.add(EQUIPMENT_TERMS[key]);
    }
  }
  return Array.from(terms);
}

// Obtiene ejercicios reales de la BD que casen con el equipamiento del usuario.
// Consulta directa (fiable) con respaldo a una muestra general si algo falla.
async function fetchExercises(
  supabase: SupabaseClient,
  equipment?: Record<string, boolean>
): Promise<DbExercise[]> {
  const terms = equipmentTerms(equipment);
  const orFilter = terms.map((t) => `equipment.ilike.%${t}%`).join(",");

  const { data, error } = await supabase
    .from("exercises")
    .select("id,name,equipment,primary_muscles")
    .or(orFilter)
    .limit(150);

  if (error) console.error("exercises query error:", error);
  if (Array.isArray(data) && data.length > 0) return data;

  // Respaldo: cualquier muestra de ejercicios (no debería hacer falta).
  const { data: fallback } = await supabase
    .from("exercises")
    .select("id,name,equipment,primary_muscles")
    .limit(150);
  return Array.isArray(fallback) ? fallback : [];
}

function buildSystemPrompt(intake: Intake, exercises: DbExercise[]): string {
  // Lista numerada: el modelo referencia ejercicios por su número (`ref`), nunca por
  // nombre libre. Esto elimina la posibilidad de que invente ejercicios inexistentes.
  const exerciseList = exercises
    .map((e, i) => {
      const muscles = e.primary_muscles ? ` — ${e.primary_muscles}` : "";
      return `${i + 1}. ${e.name}${muscles}`;
    })
    .join("\n");

  const rpn = generateRPNInstructions({
    level: intake.level || "beginner",
    objective: intake.objective || "general_health",
    gender: intake.gender || "other",
    age: intake.age || 30,
  });

  // Restricciones activas marcadas por el usuario (jumps/high_impact/heavy_lifting).
  const activeConstraints = Object.entries(intake.constraints || {})
    .filter(([, on]) => on)
    .map(([k]) => k);
  const constraintsText =
    activeConstraints.length > 0
      ? `\nUSER CONSTRAINTS (MUST RESPECT — avoid exercises that involve these):\n- ${activeConstraints.join(
          "\n- "
        )}`
      : "";

  const notesText = intake.notes
    ? `\nUSER NOTES (take into account): ${intake.notes}`
    : "";

  const lang = languageName(intake.language);

  return `You are an expert personal fitness trainer. Create a personalized training plan based on the user's data.

You MUST respond ONLY with valid JSON. No prose, no markdown — just the JSON object.

AVAILABLE EXERCISES (you MUST ONLY use exercises from this list, referenced by their number):
${exerciseList}

${rpn}
${constraintsText}${notesText}

RESPONSE FORMAT (follow EXACTLY):
{
  "weeks": <number>,
  "days": [
    {
      "day": "A",
      "focus": "<short focus, e.g. Upper Body + Core>",
      "blocks": [
        { "ref": <exercise number from the list above>, "sets": <number>, "reps": [<min>, <max>], "rest_sec": <number>, "cues": ["<cue1>", "<cue2>"] }
      ]
    }
  ]
}

CRITICAL RULES:
1. Every "ref" MUST be a number that exists in the AVAILABLE EXERCISES list. Never invent exercises or names.
2. Produce 4 days labelled "A", "B", "C", "D", each with a distinct focus and 4-6 blocks.
3. Pick exercises that match the user's equipment, level, objective and the RPN ranges above.
4. Use the RPN sets/reps/rest ranges; vary within them to fit each exercise.
5. Provide 2-3 concise form cues per block.
6. Do not repeat the same exercise within a day.
7. Write the "focus" text and ALL "cues" in ${lang}. Do NOT translate or modify exercise names — they are resolved from the reference list by number.`;
}

function buildUserPrompt(intake: Intake): string {
  return `Create a ${intake.weeks}-week training plan for:
- Objective: ${intake.objective}
- Fitness level: ${intake.level}
- Gender: ${intake.gender || "not specified"}
- Age: ${intake.age}
- Weight: ${intake.weightKg}kg
- Height: ${intake.heightCm}cm
- Daily step goal: ${intake.stepsDay || "not specified"}

Return the plan as JSON with 4 days (A/B/C/D) that repeat across the ${intake.weeks} weeks.
Remember: reference exercises ONLY by their number from the AVAILABLE EXERCISES list.`;
}

// Llama a OpenAI con timeout y un reintento ante errores transitorios (429/5xx).
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });

      if (res.ok) {
        const completion = await res.json();
        const text = completion.choices?.[0]?.message?.content;
        if (!text) throw new Error("Empty response from AI");
        return text;
      }

      // 429 / 5xx -> reintentar; 4xx -> abortar.
      lastError = `${res.status} ${await res.text()}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`OpenAI request failed: ${lastError}`);
}

// Resuelve los `ref` numéricos a ejercicios reales y limpia la estructura del plan.
// Devuelve { plan, matched, total } para que el cliente sepa cuántos casaron.
function resolvePlan(raw: any, exercises: DbExercise[]) {
  const days = Array.isArray(raw?.days) ? raw.days : [];
  let total = 0;
  let matched = 0;

  const resolvedDays = days.map((day: any) => {
    const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
    const resolvedBlocks = blocks
      .map((block: any) => {
        total++;
        const ref = Number(block?.ref);
        const exercise =
          Number.isFinite(ref) && ref >= 1 && ref <= exercises.length
            ? exercises[ref - 1]
            : undefined;
        if (!exercise) return null; // descartamos bloques con ref inválida

        matched++;
        const reps = Array.isArray(block?.reps) ? block.reps : [];
        return {
          name: exercise.name,
          exercise_id: exercise.id,
          sets: Number(block?.sets) || 3,
          reps: [Number(reps[0]) || 8, Number(reps[1]) || 12],
          rest_sec: Number(block?.rest_sec) || 60,
          cues: Array.isArray(block?.cues) ? block.cues.map(String) : [],
        };
      })
      .filter(Boolean);

    return {
      day: String(day?.day || "A"),
      focus: String(day?.focus || ""),
      blocks: resolvedBlocks,
    };
  });

  return {
    plan: {
      weeks: Number(raw?.weeks) || undefined,
      days: resolvedDays,
    },
    matched,
    total,
  };
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
    const model = Deno.env.get("MODEL_NAME") || "gpt-4o";

    const intake: Intake = await req.json();

    // Validación mínima de entrada
    if (!intake || typeof intake !== "object" || !intake.objective || !intake.level) {
      return new Response(JSON.stringify({ error: "Invalid intake payload" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no disponibles");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing Supabase env" }),
        { status: 500, headers: jsonHeaders }
      );
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // 0) ENFORCEMENT DE SUSCRIPCIÓN (blindaje server-side, no falsificable).
    //    El gate del cliente puede saltarse llamando aquí directamente; esta es la
    //    barrera real. Límite Free = 1 generación de por vida (espejo de
    //    src/lib/config/plans-config.ts). Pro (mensual/anual) = ilimitado.
    const FREE_PLAN_LIMIT = 1;
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", userId)
      .single();
    const tier = profile?.tier ?? "free";
    const isPro = tier === "pro_monthly" || tier === "pro_annual";

    if (!isPro) {
      const { count } = await supabase
        .from("plans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= FREE_PLAN_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "FREE_LIMIT_REACHED",
            message:
              "Has alcanzado el límite del plan gratuito. Mejora a Pro para generar más planes.",
          }),
          { status: 402, headers: jsonHeaders }
        );
      }
    }

    // 1) Obtener ejercicios reales de la BD según el perfil del usuario.
    const exercises = await fetchExercises(supabase, intake.equipment);

    if (exercises.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No exercises matched the user's equipment. Cannot generate a plan.",
        }),
        { status: 422, headers: jsonHeaders }
      );
    }

    // 2) + 3) Llamar a OpenAI con la lista inyectada.
    const systemPrompt = buildSystemPrompt(intake, exercises);
    const userPrompt = buildUserPrompt(intake);

    let responseText: string;
    try {
      responseText = await callOpenAI(apiKey, model, systemPrompt, userPrompt);
    } catch (err) {
      console.error("OpenAI error:", err);
      return new Response(JSON.stringify({ error: "Upstream AI error" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("AI returned non-JSON:", responseText.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    // 4) Resolver refs -> ejercicios reales.
    const { plan, matched, total } = resolvePlan(parsed, exercises);
    if (!plan.weeks) plan.weeks = intake.weeks || 8;

    if (matched === 0 || plan.days.length === 0) {
      console.error("Plan vacío tras resolver refs", { total, matched });
      return new Response(
        JSON.stringify({ error: "AI did not produce a usable plan" }),
        { status: 502, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ plan, meta: { matched, total } }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    console.error("Error generating fitness plan:", error);
    return new Response(JSON.stringify({ error: "Failed to generate plan" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
