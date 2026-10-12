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
  // Id de la petición (lo genera el cliente) para reintentos idempotentes.
  requestId?: string;
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
  category?: string | null;
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

const CATALOG_SIZE = 150;
const MOVEMENT_FLAGS = ["jumps", "high_impact", "heavy_lifting"] as const;

// Generador determinista a partir de un texto (el requestId): la misma petición
// ve siempre el mismo catálogo, peticiones distintas ven catálogos distintos.
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// Elige `size` ejercicios repartidos entre categorías (grupos musculares).
// Antes se enviaban las primeras 150 filas que devolviera la BD, sin orden: casi
// todos los planes salían con los mismos ejercicios del principio del catálogo
// y con grupos musculares enteros sin representar.
function balancedSample(rows: DbExercise[], size: number, seed: string): DbExercise[] {
  if (rows.length <= size) return rows;
  const random = seededRandom(seed);
  const groups = new Map<string, DbExercise[]>();
  for (const row of rows) {
    const key = (row.category || "General").trim();
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  for (const list of groups.values()) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  const keys = Array.from(groups.keys()).sort();
  const out: DbExercise[] = [];
  for (let round = 0; out.length < size; round++) {
    let added = false;
    for (const key of keys) {
      const item = groups.get(key)![round];
      if (!item) continue;
      out.push(item);
      added = true;
      if (out.length === size) break;
    }
    if (!added) break;
  }
  return out;
}

// Obtiene ejercicios reales de la BD que casen con el equipamiento del usuario
// y devuelve una muestra equilibrada. La API corta en 1000 filas por petición,
// así que se lee por páginas.
async function fetchExercises(
  supabase: SupabaseClient,
  equipment: Record<string, boolean> | undefined,
  seed: string,
  constraints?: Record<string, boolean>
): Promise<DbExercise[]> {
  // Restricciones físicas activas (saltos, alto impacto, cargas pesadas). Los
  // ejercicios marcados con alguna de ellas (columna movement_flags, ver
  // schemas/add-exercise-movement-flags.sql) no entran en el catálogo, así que
  // el modelo no puede elegirlos: ya no depende de que haga caso al prompt.
  const avoid = MOVEMENT_FLAGS.filter((flag) => constraints?.[flag] === true);
  const terms = equipmentTerms(equipment);
  const orFilter = terms.map((t) => `equipment.ilike.%${t}%`).join(",");

  const readAll = async (filtered: boolean): Promise<DbExercise[]> => {
    const all: DbExercise[] = [];
    for (let from = 0; from < 5000; from += 1000) {
      let query = supabase
        .from("exercises")
        .select("id,name,equipment,primary_muscles,category");
      if (filtered) query = query.or(orFilter);
      if (avoid.length > 0) query = query.not("movement_flags", "ov", `{${avoid.join(",")}}`);
      const { data, error } = await query.order("id").range(from, from + 999);
      if (error) {
        console.error("exercises query error:", error);
        break;
      }
      all.push(...((data ?? []) as DbExercise[]));
      if (!data || data.length < 1000) break;
    }
    return all;
  };

  let rows = await readAll(true);
  // Respaldo: catálogo completo (no debería hacer falta).
  if (rows.length === 0) rows = await readAll(false);
  return balancedSample(rows, CATALOG_SIZE, seed);
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
5. Provide 1-2 very short form cues per block (max 8 words each).
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

interface AiResult {
  text: string;
  promptTokens: number | null;
  completionTokens: number | null;
}

// Llama a OpenAI con timeout. Reintenta una vez SOLO si OpenAI rechazó la petición
// (429/5xx, no facturada). Un timeout no se reintenta: la primera llamada puede
// haberse completado y cobrado, y repetirla duplicaría el coste.
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AiResult> {
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    // Un plan de 4 días ronda los 2.000 tokens: tope para acotar el coste.
    max_tokens: 4096,
  });

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75000);
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
        const choice = completion.choices?.[0];
        const text = choice?.message?.content;
        if (!text) throw new Error("Empty response from AI");
        if (choice.finish_reason === "length") {
          throw new Error("AI response truncated (max_tokens)");
        }
        return {
          text,
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
        };
      }

      // 429 / 5xx -> reintentar; 4xx -> abortar.
      lastError = `${res.status} ${await res.text()}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      break;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`OpenAI request failed: ${lastError}`);
}

// Resuelve los `ref` numéricos a ejercicios reales y limpia la estructura del plan.
// Devuelve { plan, matched, total } para que el cliente sepa cuántos casaron.
const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, n)) : fallback;
};

const MAX_CUES = 2;
const MAX_CUE_CHARS = 90;
const MIN_BLOCKS_PER_DAY = 3;
const MIN_DAYS = 2;

// Convierte la respuesta del modelo en un plan seguro de usar:
// - cada `ref` se resuelve contra el catálogo enviado; lo inventado se descarta;
// - no se repite un ejercicio dentro del mismo día;
// - series, repeticiones y descanso quedan dentro de rangos razonables;
// - como mucho MAX_CUES indicaciones cortas por ejercicio;
// - los días con menos de MIN_BLOCKS_PER_DAY ejercicios válidos se descartan;
// - los días se etiquetan A, B, C… por posición, que es como los guarda la app
//   (el modelo a veces devolvía "Day 1", "Lunes" o etiquetas repetidas).
function resolvePlan(raw: any, exercises: DbExercise[]) {
  const days = Array.isArray(raw?.days) ? raw.days : [];
  let total = 0;
  let matched = 0;

  const usableDays = days
    .map((day: any) => {
      const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
      const seen = new Set<string>();
      const resolvedBlocks = blocks
        .map((block: any) => {
          total++;
          const ref = Number(block?.ref);
          const exercise =
            Number.isFinite(ref) && ref >= 1 && ref <= exercises.length
              ? exercises[ref - 1]
              : undefined;
          if (!exercise || seen.has(exercise.id)) return null;
          seen.add(exercise.id);

          matched++;
          const reps = Array.isArray(block?.reps) ? block.reps : [];
          const repMin = clampInt(reps[0], 1, 50, 8);
          const repMax = Math.max(repMin, clampInt(reps[1], 1, 50, Math.max(repMin, 12)));
          return {
            name: exercise.name,
            exercise_id: exercise.id,
            sets: clampInt(block?.sets, 1, 6, 3),
            reps: [repMin, repMax],
            rest_sec: clampInt(block?.rest_sec, 15, 300, 60),
            cues: (Array.isArray(block?.cues) ? block.cues : [])
              .map((cue: unknown) => String(cue).trim().slice(0, MAX_CUE_CHARS))
              .filter(Boolean)
              .slice(0, MAX_CUES),
          };
        })
        .filter(Boolean);

      return { focus: String(day?.focus || "").slice(0, 80), blocks: resolvedBlocks };
    })
    .filter((day: { blocks: unknown[] }) => day.blocks.length >= MIN_BLOCKS_PER_DAY)
    .slice(0, 7);

  const resolvedDays = usableDays.map(
    (day: { focus: string; blocks: unknown[] }, index: number) => ({
      day: String.fromCharCode(65 + index),
      focus: day.focus,
      blocks: day.blocks,
    })
  );

  return {
    plan: {
      weeks: clampInt(raw?.weeks, 1, 52, 0) || undefined,
      days: resolvedDays,
    },
    matched,
    total,
    daysReturned: days.length,
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
    // Tope Pro: 30 generaciones cada 30 días (espejo de plans-config.ts).
    const PRO_MONTHLY_LIMIT = 30;
    // Una generación "pending" más antigua que esto se da por abandonada.
    const PENDING_WINDOW_MS = 3 * 60 * 1000;
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

    // IDEMPOTENCIA. El cliente envía un requestId (el id que tendrá el plan). Si
    // la respuesta se perdió por la red y reintenta con el mismo id, devolvemos
    // el plan ya generado sin volver a llamar (ni pagar) a OpenAI.
    const requestId =
      typeof intake.requestId === "string" && intake.requestId.length <= 64
        ? intake.requestId
        : crypto.randomUUID();

    const { data: existing } = await supabase
      .from("plan_generations")
      .select("id, status, plan, meta, created_at")
      .eq("user_id", userId)
      .eq("request_id", requestId)
      .maybeSingle();

    if (existing?.status === "ok" && existing.plan) {
      return new Response(
        JSON.stringify({ plan: existing.plan, meta: existing.meta, requestId, reused: true }),
        { status: 200, headers: jsonHeaders }
      );
    }
    const isRecent = (iso: string) => Date.parse(iso) > Date.now() - PENDING_WINDOW_MS;
    if (existing?.status === "pending" && isRecent(existing.created_at)) {
      // Otra petición con este id sigue generando: el cliente espera y reintenta.
      return new Response(JSON.stringify({ error: "GENERATION_IN_PROGRESS" }), {
        status: 409,
        headers: jsonHeaders,
      });
    }

    // LÍMITES sobre generaciones reales (no sobre los planes que queden guardados:
    // borrar un plan no devuelve cupo). Las pendientes recientes cuentan para que
    // dos peticiones simultáneas no pasen a la vez.
    const { data: history } = await supabase
      .from("plan_generations")
      .select("status, created_at")
      .eq("user_id", userId)
      .neq("request_id", requestId);
    const counted = (history ?? []).filter(
      (g: { status: string; created_at: string }) =>
        g.status === "ok" || (g.status === "pending" && isRecent(g.created_at))
    );

    if (!isPro) {
      // Los planes creados antes de existir plan_generations también consumen cupo.
      const { count: planCount } = await supabase
        .from("plans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (Math.max(counted.length, planCount ?? 0) >= FREE_PLAN_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "FREE_LIMIT_REACHED",
            message:
              "Has alcanzado el límite del plan gratuito. Mejora a Pro para generar más planes.",
          }),
          { status: 402, headers: jsonHeaders }
        );
      }
    } else {
      const monthAgo = Date.now() - 30 * 86400000;
      const thisMonth = counted.filter(
        (g: { created_at: string }) => Date.parse(g.created_at) > monthAgo
      );
      if (thisMonth.length >= PRO_MONTHLY_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "PRO_LIMIT_REACHED",
            message: "Has alcanzado el límite mensual de generaciones.",
          }),
          { status: 429, headers: jsonHeaders }
        );
      }
    }

    // Reservar la generación ANTES de llamar a OpenAI. La clave única
    // (user_id, request_id) hace que un doble envío simultáneo solo pase una vez.
    let generationId: string;
    if (existing) {
      generationId = existing.id;
      await supabase
        .from("plan_generations")
        .update({ status: "pending", error: null, created_at: new Date().toISOString() })
        .eq("id", generationId);
    } else {
      const { data: reserved, error: reserveErr } = await supabase
        .from("plan_generations")
        .insert({ user_id: userId, request_id: requestId, status: "pending", model })
        .select("id")
        .single();
      if (reserveErr || !reserved) {
        return new Response(JSON.stringify({ error: "GENERATION_IN_PROGRESS" }), {
          status: 409,
          headers: jsonHeaders,
        });
      }
      generationId = reserved.id;
    }
    const failGeneration = (reason: string) =>
      supabase
        .from("plan_generations")
        .update({ status: "failed", error: reason.slice(0, 500), finished_at: new Date().toISOString() })
        .eq("id", generationId);

    // 1) Obtener ejercicios reales de la BD según el perfil del usuario.
    const exercises = await fetchExercises(
      supabase,
      intake.equipment,
      requestId,
      intake.constraints
    );

    if (exercises.length === 0) {
      await failGeneration("no exercises matched equipment");
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

    let ai: AiResult;
    try {
      ai = await callOpenAI(apiKey, model, systemPrompt, userPrompt);
    } catch (err) {
      console.error("OpenAI error:", err);
      await failGeneration(err instanceof Error ? err.message : String(err));
      return new Response(JSON.stringify({ error: "Upstream AI error" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const responseText = ai.text;

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("AI returned non-JSON:", responseText.slice(0, 500));
      await failGeneration("AI returned invalid JSON");
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    // 4) Resolver refs -> ejercicios reales.
    const { plan, matched, total, daysReturned } = resolvePlan(parsed, exercises);
    if (!plan.weeks) plan.weeks = intake.weeks || 8;

    if (matched === 0 || plan.days.length < MIN_DAYS) {
      console.error("Plan no utilizable tras validar", {
        total,
        matched,
        daysReturned,
        daysKept: plan.days.length,
      });
      await failGeneration("AI did not produce a usable plan");
      return new Response(
        JSON.stringify({ error: "AI did not produce a usable plan" }),
        { status: 502, headers: jsonHeaders }
      );
    }

    // Guardar el resultado ANTES de responder: si la respuesta no llega al
    // teléfono, el reintento con el mismo requestId lo recupera de aquí.
    const meta = { matched, total, days: plan.days.length, days_returned: daysReturned };
    await supabase
      .from("plan_generations")
      .update({
        status: "ok",
        plan,
        meta,
        model,
        prompt_tokens: ai.promptTokens,
        completion_tokens: ai.completionTokens,
        finished_at: new Date().toISOString(),
      })
      .eq("id", generationId);

    return new Response(JSON.stringify({ plan, meta, requestId }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Error generating fitness plan:", error);
    return new Response(JSON.stringify({ error: "Failed to generate plan" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
