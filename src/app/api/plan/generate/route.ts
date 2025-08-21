import { generateRPNInstructions } from "@/lib/config/rpn-config";
import {
  GeneratedPlanSchema,
  PlanGenerationSchema,
} from "@/lib/validators/schemas";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  console.log("🚀 [PLAN GENERATION] Starting plan generation...");

  try {
    // 1. Parsear y validar el request
    const body = await request.json();
    // console.log(
    //   "📥 [PLAN GENERATION] Received request body:",
    //   JSON.stringify(body, null, 2)
    // );

    const validatedData = PlanGenerationSchema.parse(body);
    console.log(
      "✅ [PLAN GENERATION] Request validation passed:",
      JSON.stringify(validatedData, null, 2)
    );

    // 2. Obtener ejercicios disponibles de la BD (OPTIMIZADO CON FILTRADO SQL)
    console.log(
      "📚 [PLAN GENERATION] Fetching filtered exercises from database..."
    );

    // Función para obtener ejercicios filtrados usando la función SQL segura de Supabase
    const getFilteredExercises = async (
      userEquipment: Record<string, boolean>,
      userLevel: string,
      userObjective: string,
      userAge: number,
      userGender: string
    ) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      console.log("\n🔍 [SQL FILTER] Aplicando filtros SQL inteligentes...");

      // Convertir equipamiento del usuario a array
      const userEquipmentArray = Object.keys(userEquipment).filter(
        (key) => userEquipment[key]
      );
      console.log(
        "🔧 [SQL FILTER] Equipamiento del usuario:",
        userEquipmentArray
      );

      try {
        // Usar la función RPC segura get_filtered_exercises
        const response = await fetch(
          `${supabaseUrl}/rest/v1/rpc/get_filtered_exercises`,
          {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              p_equipment: userEquipmentArray,
              p_objective: userObjective,
              p_age: userAge,
              p_gender: userGender,
              p_limit: 200,
            }),
          }
        );

        if (response.ok) {
          const exercises = await response.json();
          console.log(
            `✅ [SQL FILTER] Ejercicios filtrados obtenidos: ${exercises.length}`
          );
          return exercises;
        } else {
          console.warn("⚠️ [SQL FILTER] RPC falló, usando método alternativo");
          // Fallback: usar la función get_exercises_simple si existe
          return await getExercisesWithFallback(
            userEquipmentArray,
            userLevel,
            userObjective
          );
        }
      } catch (error) {
        console.warn(
          "⚠️ [SQL FILTER] Error en RPC, usando método alternativo:",
          error
        );
        return await getExercisesWithFallback(
          userEquipmentArray,
          userLevel,
          userObjective
        );
      }
    };

    // Función de fallback usando get_exercises_simple
    const getExercisesWithFallback = async (
      userEquipment: string[],
      _userLevel: string,
      _userObjective: string
    ) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      console.log("🔄 [FALLBACK] Usando función get_exercises_simple...");

      try {
        // Obtener ejercicios en lotes usando la función existente
        const exercises: any[] = [];
        let page = 1;
        const limit = 100;
        let hasMore = true;

        while (hasMore && exercises.length < 300) {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/rpc/get_exercises_simple`,
            {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                p_page: page,
                p_limit: limit,
                p_category: null,
                p_kind: null,
                p_equipment: null,
                p_search: null,
              }),
            }
          );

          if (response.ok) {
            const batch = await response.json();
            if (batch.length === 0) {
              hasMore = false;
            } else {
              // Filtrar por equipamiento en memoria (fallback)
              const filteredBatch = batch.filter((ex: any) => {
                if (!ex.equipment) return true;
                const equipmentStr = String(ex.equipment).toLowerCase();

                // Si incluye "NO EQUIPMENT", siempre disponible
                if (equipmentStr.includes("no equipment")) return true;

                // Verificar si el usuario tiene el equipamiento requerido
                return userEquipment.some(
                  (userEq) =>
                    equipmentStr.includes(userEq) ||
                    (userEq === "none" && equipmentStr.includes("no equipment"))
                );
              });

              exercises.push(...filteredBatch);
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        console.log(
          `🔄 [FALLBACK] Ejercicios obtenidos con fallback: ${exercises.length}`
        );
        return exercises;
      } catch (error) {
        console.error("❌ [FALLBACK] Error en fallback:", error);
        return [];
      }
    };

    // Función para filtrar ejercicios por equipamiento del usuario (INTELIGENTE)

    // Función para analizar compatibilidad de equipamiento

    // Función para filtrar por nivel de dificultad

    // Función para obtener solo información esencial
    const getEssentialExerciseInfo = (exercises: any[]) => {
      console.log(
        "🔍 [ESSENTIAL INFO] Iniciando procesamiento de ejercicios..."
      );
      console.log(
        `🔍 [ESSENTIAL INFO] Total de ejercicios a procesar: ${exercises.length}`
      );

      return exercises
        .map((ex, index) => {
          console.log(
            `🔍 [ESSENTIAL INFO] Procesando ejercicio ${index + 1}:`,
            ex ? ex.name || "SIN NOMBRE" : "NULL/UNDEFINED"
          );

          // Validar que el ejercicio tenga las propiedades básicas
          if (!ex || typeof ex !== "object") {
            console.warn("⚠️ [ESSENTIAL INFO] Exercise object is invalid:", ex);
            return null;
          }

          if (!ex.name) {
            console.warn("⚠️ [ESSENTIAL INFO] Exercise missing name:", ex);
            return null;
          }

          // Verificar si el ejercicio tiene la propiedad 'sets' (que no debería tener)
          if (ex.sets !== undefined) {
            console.warn(
              "⚠️ [ESSENTIAL INFO] Exercise has unexpected 'sets' property:",
              ex.sets
            );
          }

          const result = {
            name: ex.name || "Unknown Exercise",
            kind: ex.kind || "general",
            difficulty: ex.meta?.difficulty || ex.difficulty || "beginner",
            equipment: ex.equipment || "none",
            category: ex.category || "general",
            primary_muscles: ex.primary_muscles || "general",
            // Nuevos campos de la estructura actualizada (con validación)
            instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
            tips: Array.isArray(ex.tips) ? ex.tips : [],
            benefits: Array.isArray(ex.benefits) ? ex.benefits : [],
            muscle_groups_primary: Array.isArray(ex.muscle_groups_primary)
              ? ex.muscle_groups_primary
              : [],
            muscle_groups_secondary: Array.isArray(ex.muscle_groups_secondary)
              ? ex.muscle_groups_secondary
              : [],
            gif_url: ex.gif_url || null,
            overview: ex.overview || null,
          };

          console.log(
            `✅ [ESSENTIAL INFO] Ejercicio ${
              index + 1
            } procesado exitosamente:`,
            result.name
          );
          return result;
        })
        .filter(Boolean); // Filtrar ejercicios nulos
    };

    console.log("\n🗄️ [DATABASE] Configuración de Supabase:");
    console.log("─".repeat(50));
    console.log(
      `🔗 URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || "No configurada"}`
    );
    console.log(
      `🔑 Service Role Key: ${
        process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "✅ Configurada"
          : "❌ No configurada"
      }`
    );

    // Verificar que las variables estén configuradas
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error("Variables de entorno de Supabase no configuradas");
    }

    // 3. Obtener ejercicios filtrados usando la nueva función inteligente
    console.log("\n🔍 [SQL FILTER] Obteniendo ejercicios filtrados...");

    let availableExercises: any[] = [];
    let exerciseCount = 0;

    try {
      // Usar la nueva función de filtrado SQL
      availableExercises = await getFilteredExercises(
        validatedData.equipment,
        validatedData.level,
        validatedData.objective,
        validatedData.age,
        validatedData.gender
      );

      console.log(
        `✅ [SQL FILTER] Ejercicios filtrados obtenidos: ${availableExercises.length}`
      );

      // Mostrar algunos ejemplos de ejercicios disponibles
      if (availableExercises.length > 0) {
        console.log("\n📋 [FILTER] Ejemplos de ejercicios disponibles:");
        availableExercises.slice(0, 5).forEach((ex, index) => {
          console.log(`   ${index + 1}. ${ex.name} (${ex.equipment})`);
        });
        if (availableExercises.length > 5) {
          console.log(
            `   ... y ${availableExercises.length - 5} ejercicios más`
          );
        }
      }

      // Limitar a máximo 200 ejercicios para optimizar el contexto y reducir costos
      const maxExercises = 200;
      if (availableExercises.length > maxExercises) {
        availableExercises = availableExercises.slice(0, maxExercises);
        console.log(
          `⚠️ [PLAN GENERATION] Limited to ${maxExercises} exercises to optimize context size and reduce costs`
        );
      }

      exerciseCount = availableExercises.length;
    } catch (error) {
      console.error(
        "❌ [SQL FILTER] Error obteniendo ejercicios filtrados:",
        error
      );

      // Plan de respaldo con ejercicios básicos
      console.warn("⚠️ [PLAN GENERATION] Using fallback exercises");
      availableExercises = [
        {
          name: "Push-ups",
          kind: "strength",
          equipment: "NO EQUIPMENT",
          category: "Strength",
          primary_muscles: "Chest, Triceps, Shoulders",
        },
        {
          name: "Squats",
          kind: "strength",
          equipment: "NO EQUIPMENT",
          category: "Strength",
          primary_muscles: "Quadriceps, Glutes",
        },
        {
          name: "Plank",
          kind: "strength",
          equipment: "NO EQUIPMENT",
          category: "Core",
          primary_muscles: "Abs, Core",
        },
        {
          name: "Lunges",
          kind: "strength",
          equipment: "NO EQUIPMENT",
          category: "Strength",
          primary_muscles: "Quadriceps, Glutes",
        },
        {
          name: "Mountain Climbers",
          kind: "cardio",
          equipment: "NO EQUIPMENT",
          category: "Cardio",
          primary_muscles: "Core, Shoulders",
        },
      ];
      exerciseCount = availableExercises.length;
    }

    // 3. Crear el prompt para OpenAI (OPTIMIZADO)
    console.log("\n🔍 [PROMPT BUILD] Construyendo prompt del sistema...");

    // Obtener información esencial de ejercicios de forma segura
    let essentialExercisesInfo;
    try {
      essentialExercisesInfo = getEssentialExerciseInfo(availableExercises);
      console.log(
        `✅ [PROMPT BUILD] Información esencial obtenida: ${essentialExercisesInfo.length} ejercicios`
      );
    } catch (error) {
      console.error(
        "❌ [PROMPT BUILD] Error obteniendo información esencial:",
        error
      );
      throw new Error(
        `Error construyendo prompt: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Construir la lista de ejercicios de forma segura
    let exercisesList;
    try {
      exercisesList = essentialExercisesInfo
        .filter((ex) => ex && ex.name) // Filtrar ejercicios válidos
        .map(
          (ex) =>
            `- ${ex.name} (${ex.kind || "general"}, ${
              ex.equipment || "none"
            }, ${ex.category || "general"})`
        )
        .join("\n");
      console.log(
        "✅ [PROMPT BUILD] Lista de ejercicios construida correctamente"
      );
    } catch (error) {
      console.error(
        "❌ [PROMPT BUILD] Error construyendo lista de ejercicios:",
        error
      );
      throw new Error(
        `Error construyendo lista de ejercicios: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const systemPrompt = `You are an expert personal fitness trainer. Your task is to create a personalized training plan based on the user's data.

IMPORTANT: You must respond ONLY with valid JSON that follows EXACTLY this structure. DO NOT include explanatory text, only the JSON.

AVAILABLE EXERCISES (YOU MUST USE ONLY THESE - ${
      availableExercises.length
    } exercises):
${exercisesList}

TOTAL EXERCISES IN DATABASE: ${exerciseCount} (showing ${
      availableExercises.length
    } most relevant)

${generateRPNInstructions({
  level: validatedData.level,
  objective: validatedData.objective,
  gender: validatedData.gender,
  age: validatedData.age,
})}

RESPONSE FORMAT (MUST FOLLOW THIS EXACTLY):
{
  "weeks": <number>,
  "days": [
    {
      "day": "A",
      "focus": "Upper Body + Core",
      "blocks": [
        {
          "name": "Exercise Name",
          "sets": <number>,
          "reps": [<min>, <max>],
          "rest_sec": <number>,
          "cues": ["cue1", "cue2"]
        }
      ]
    },
    {
      "day": "B",
      "focus": "Lower Body + Cardio",
      "blocks": [...]
    },
    {
      "day": "C",
      "focus": "Full Body",
      "blocks": [...]
    },
    {
      "day": "D",
      "focus": "Recovery + Mobility",
      "blocks": [...]
    }
  ]
}

CRITICAL RULES:
1. You MUST ONLY use exercises from the available exercises list above
2. Match exercises to user's equipment availability
3. Consider user's fitness level when selecting exercise difficulty
4. The plan should be realistic, progressive, and adapted to the user's level
5. Consider the available equipment and mentioned limitations
6. For REHABILITATION objectives: Use VERY LOW intensity, focus on mobility and gentle movements
7. For BEGINNER level: Start with 1-2 sets, low reps (5-8), longer rest periods (90-120 seconds)
8. Consider gender differences: Women may need more focus on upper body strength, men on flexibility`;

    const userPrompt = `Create a comprehensive training plan for:
- Objective: ${validatedData.objective}
- Fitness Level: ${validatedData.level}
- Gender: ${validatedData.gender}
- Age: ${validatedData.age} years
- Weight: ${validatedData.weightKg} kg
- Height: ${validatedData.heightCm} cm
- Available Equipment: ${JSON.stringify(validatedData.equipment)}
- Restrictions: ${JSON.stringify(validatedData.constraints || {})}
- Daily Step Goal: ${validatedData.stepsDay || "Not specified"}
- Duration: ${validatedData.weeks} weeks

AVAILABLE EXERCISES: ${
      availableExercises.length
    } exercises (filtered from ${exerciseCount} total in database)

CRITICAL: You must return the plan in EXACTLY this format:
{
  "weeks": ${validatedData.weeks},
  "days": [
    {
      "day": "A",
      "focus": "Upper Body + Core",
      "blocks": [
        {
          "name": "Exercise Name",
          "sets": <number>,
          "reps": [<min>, <max>],
          "rest_sec": <number>,
          "cues": ["cue1", "cue2"]
        }
      ]
    }
  ]
}

The plan must include ${
      validatedData.weeks
    } weeks with repeating A, B, C, D days. Each day should have a specific focus and exercises appropriate for the user's level and equipment.

Exercise Selection Guidelines:
- Choose exercises that match the available equipment
- Adapt exercise difficulty to the fitness level
- Include proper warm-up and cool-down considerations
- Ensure balanced muscle group targeting
- Consider the user's age and any restrictions

SPECIAL CONSIDERATIONS:
- For REHABILITATION: Use only bodyweight exercises, focus on mobility and gentle movements
- For BEGINNER level: Start with 1-2 sets, 5-8 reps, 90-120 seconds rest
- For WOMEN: Include more upper body strength work and core stability
- For MEN: Emphasize flexibility, mobility, and balanced muscle development

REMEMBER: Only use exercises from the available exercises list provided in the system prompt!`;

    // ═══════════════════════════════════════════════════════════════
    // 🎯 LOGGING SIMPLIFICADO - SOLO LO QUE SE ENVÍA A GPT
    // ═══════════════════════════════════════════════════════════════

    console.log("\n" + "=".repeat(80));
    console.log("🚀 [GPT INPUT] LO QUE SE ENVÍA A GPT");
    console.log("=".repeat(80));

    // Información del usuario (resumida)
    console.log("\n👤 [USER DATA] Datos del usuario:");
    console.log(`   Objetivo: ${validatedData.objective}`);
    console.log(`   Nivel: ${validatedData.level}`);
    console.log(`   Género: ${validatedData.gender}`);
    console.log(`   Edad: ${validatedData.age} años`);
    console.log(
      `   Equipamiento: ${Object.keys(validatedData.equipment)
        .filter(
          (k) =>
            validatedData.equipment[k as keyof typeof validatedData.equipment]
        )
        .join(", ")}`
    );

    // Ejercicios disponibles (resumido)
    console.log(
      `\n💪 [EXERCISES] Ejercicios enviados a GPT: ${availableExercises.length}`
    );

    // ═══════════════════════════════════════════════════════════════
    // 📋 EJERCICIOS EXACTOS ENVIADOS A GPT
    // ═══════════════════════════════════════════════════════════════

    console.log("\n" + "=".repeat(80));
    console.log("📋 [EXACT EXERCISES] EJERCICIOS ENVIADOS A GPT");
    console.log("=".repeat(80));

    availableExercises.forEach((ex, index) => {
      if (ex && ex.name) {
        console.log(`${index + 1}. ${ex.name}`);
      } else {
        console.log(`${index + 1}. [INVALID EXERCISE]`);
      }
    });

    console.log("=".repeat(80));

    // ═══════════════════════════════════════════════════════════════
    // 🎯 INFORMACIÓN ESENCIAL ENVIADA EN EL SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════

    console.log("\n" + "=".repeat(80));
    console.log("🎯 [ESSENTIAL INFO] INFORMACIÓN ESENCIAL ENVIADA A GPT");
    console.log("=".repeat(80));

    console.log("🔍 [DEBUG] Llamando getEssentialExerciseInfo segunda vez...");
    let essentialInfo;
    try {
      essentialInfo = getEssentialExerciseInfo(availableExercises);
      console.log(
        "✅ [DEBUG] Segunda llamada a getEssentialExerciseInfo exitosa"
      );
    } catch (error) {
      console.error(
        "❌ [DEBUG] Error en segunda llamada a getEssentialExerciseInfo:",
        error
      );
      throw error;
    }

    console.log("\n📋 Lista de ejercicios en formato esencial:");
    essentialInfo.forEach((ex, index) => {
      if (ex && ex.name) {
        console.log(
          `   ${index + 1}. ${ex.name} (${ex.kind}, ${ex.equipment}, ${
            ex.category
          })`
        );
      } else {
        console.log(`   ${index + 1}. [INVALID EXERCISE]`);
      }
    });

    console.log("=".repeat(80));

    // 3. Crear el prompt para OpenAI (OPTIMIZADO)
    console.log("\n🤖 [SYSTEM PROMPT] Prompt del sistema:");
    console.log("─".repeat(50));
    console.log(systemPrompt);

    // USER PROMPT (COMPLETO)
    console.log("\n👤 [USER PROMPT] Prompt del usuario:");
    console.log("─".repeat(50));
    console.log(userPrompt);

    // Resumen de tokens y cálculo de costos
    const totalChars = systemPrompt.length + userPrompt.length;
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Calcular costos estimados
    const calculateEstimatedCost = (
      inputTokens: number,
      outputTokens: number = 500
    ) => {
      const model = process.env.MODEL_NAME || "gpt-4o-mini";

      if (model === "gpt-4o-mini") {
        const inputCost = (inputTokens / 1000) * 0.00015;
        const outputCost = (outputTokens / 1000) * 0.0006;
        return {
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost,
          model,
        };
      } else if (model === "gpt-4o") {
        const inputCost = (inputTokens / 1000) * 0.005;
        const outputCost = (outputTokens / 1000) * 0.015;
        return {
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost,
          model,
        };
      } else {
        // Modelo desconocido, usar estimación conservadora
        const inputCost = (inputTokens / 1000) * 0.001;
        const outputCost = (outputTokens / 1000) * 0.002;
        return {
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost,
          model: "unknown",
        };
      }
    };

    const costEstimate = calculateEstimatedCost(estimatedTokens);

    console.log(
      `\n📊 [TOKENS] Total caracteres: ${totalChars}, Estimado tokens: ~${estimatedTokens}`
    );
    console.log(`💰 [COST ESTIMATE] Modelo: ${costEstimate.model}`);
    console.log(
      `💰 [COST ESTIMATE] Costo entrada: $${costEstimate.inputCost.toFixed(6)}`
    );
    console.log(
      `💰 [COST ESTIMATE] Costo salida estimado: $${costEstimate.outputCost.toFixed(
        6
      )}`
    );
    console.log(
      `💰 [COST ESTIMATE] Costo total estimado: $${costEstimate.totalCost.toFixed(
        6
      )}`
    );

    // Guardar prompts en archivo para análisis
    const promptData = {
      timestamp: new Date().toISOString(),
      userData: {
        objective: validatedData.objective,
        level: validatedData.level,
        gender: validatedData.gender,
        age: validatedData.age,
        equipment: validatedData.equipment,
        constraints: validatedData.constraints,
      },
      systemPrompt,
      userPrompt,
      totalChars,
      estimatedTokens,
    };

    console.log("\n💾 [SAVE] Guardando prompts en archivo...");
    console.log("📁 Archivo: prompts-sent-to-gpt.json");

    // En desarrollo, escribir a archivo
    if (process.env.NODE_ENV === "development") {
      try {
        const fs = require("fs");
        const path = require("path");
        const promptsFile = path.join(
          process.cwd(),
          "prompts-sent-to-gpt.json"
        );

        // Leer archivo existente o crear nuevo
        let existingPrompts = [];
        if (fs.existsSync(promptsFile)) {
          existingPrompts = JSON.parse(fs.readFileSync(promptsFile, "utf8"));
        }

        // Agregar nuevo prompt
        existingPrompts.push(promptData);

        // Escribir archivo
        fs.writeFileSync(promptsFile, JSON.stringify(existingPrompts, null, 2));
        console.log("✅ [SAVE] Prompts guardados en archivo");
      } catch (writeError) {
        const errorMessage =
          writeError instanceof Error ? writeError.message : String(writeError);
        console.log("⚠️ [SAVE] No se pudo guardar en archivo:", errorMessage);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("🔄 [SENDING] Enviando a OpenAI...");
    console.log("=".repeat(80) + "\n");

    // 3. Llamar a OpenAI
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // ═══════════════════════════════════════════════════════════════
    // 📥 RESPUESTA DE GPT (SIMPLIFICADA)
    // ═══════════════════════════════════════════════════════════════

    console.log("\n📥 [GPT RESPONSE] Respuesta recibida de OpenAI");
    console.log(`⏱️ Tiempo: ${responseTime} ms`);
    console.log(`🎯 Tokens totales: ${completion.usage?.total_tokens || "?"}`);
    console.log(`🎯 Tokens entrada: ${completion.usage?.prompt_tokens || "?"}`);
    console.log(
      `🎯 Tokens salida: ${completion.usage?.completion_tokens || "?"}`
    );
    console.log(
      `📝 Longitud respuesta: ${
        completion.choices[0]?.message?.content?.length || 0
      } caracteres`
    );

    // Calcular costo real
    const actualCost = calculateEstimatedCost(
      completion.usage?.prompt_tokens || 0,
      completion.usage?.completion_tokens || 0
    );

    console.log(
      `💰 [ACTUAL COST] Costo entrada: $${actualCost.inputCost.toFixed(6)}`
    );
    console.log(
      `💰 [ACTUAL COST] Costo salida: $${actualCost.outputCost.toFixed(6)}`
    );
    console.log(
      `💰 [ACTUAL COST] Costo total real: $${actualCost.totalCost.toFixed(6)}`
    );

    // Comparar con estimación
    const costDifference = actualCost.totalCost - costEstimate.totalCost;
    console.log(
      `💰 [COST COMPARISON] Diferencia: $${costDifference.toFixed(6)} (${
        costDifference > 0 ? "más caro" : "más barato"
      } que estimado)`
    );

    console.log("\n" + "=".repeat(80));
    console.log("🔍 [PROCESSING] Procesando respuesta...");
    console.log("=".repeat(80) + "\n");

    // 4. Parsear la respuesta de OpenAI
    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("OpenAI no devolvió contenido");
    }

    let parsedPlan;
    try {
      parsedPlan = JSON.parse(aiResponse);
      console.log("✅ [PARSE] Respuesta de GPT parseada correctamente");
      console.log(
        `📊 [PARSE] Plan: ${parsedPlan.weeks} semanas, ${
          parsedPlan.days?.length || 0
        } días`
      );
    } catch (parseError) {
      console.error(
        "❌ [PARSE] Error al parsear respuesta de GPT:",
        parseError
      );
      throw new Error("La respuesta de OpenAI no es JSON válido");
    }

    // 5. Validar el plan con Zod
    console.log("\n🔍 [VALIDATION] Validando plan con Zod schema...");

    // Log detallado del plan antes de la validación
    console.log("📋 [VALIDATION] Plan recibido de GPT:");
    console.log(JSON.stringify(parsedPlan, null, 2));

    // Validación manual antes de Zod para identificar problemas específicos
    console.log("\n🔍 [MANUAL VALIDATION] Validación manual del plan...");

    if (!parsedPlan.days || !Array.isArray(parsedPlan.days)) {
      console.error("❌ [MANUAL VALIDATION] Plan no tiene array 'days' válido");
      throw new Error("Plan no tiene estructura de días válida");
    }

    // Validar cada día
    for (let i = 0; i < parsedPlan.days.length; i++) {
      const day = parsedPlan.days[i];
      console.log(
        `🔍 [MANUAL VALIDATION] Validando día ${i}:`,
        JSON.stringify(day, null, 2)
      );

      if (!day.blocks || !Array.isArray(day.blocks)) {
        console.error(
          `❌ [MANUAL VALIDATION] Día ${i} no tiene array 'blocks' válido:`,
          day
        );
        throw new Error(`Día ${i} no tiene estructura de bloques válida`);
      }

      // Validar cada bloque
      for (let j = 0; j < day.blocks.length; j++) {
        const block = day.blocks[j];
        console.log(
          `🔍 [MANUAL VALIDATION] Validando bloque ${j} del día ${i}:`,
          JSON.stringify(block, null, 2)
        );

        if (!block) {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} es null/undefined`
          );
          throw new Error(`Bloque ${j} del día ${i} es null/undefined`);
        }

        // Verificar que el bloque sea un objeto válido
        if (typeof block !== "object") {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} no es un objeto:`,
            typeof block,
            block
          );
          throw new Error(`Bloque ${j} del día ${i} no es un objeto válido`);
        }

        // Verificar la propiedad 'sets'
        if (!("sets" in block)) {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} no tiene propiedad 'sets':`,
            Object.keys(block)
          );
          throw new Error(`Bloque ${j} del día ${i} no tiene propiedad 'sets'`);
        }

        if (typeof block.sets !== "number") {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} no tiene 'sets' válido:`,
            block
          );
          console.error(
            `❌ [MANUAL VALIDATION] Tipo de 'sets': ${typeof block.sets}, Valor: ${
              block.sets
            }`
          );
          throw new Error(
            `Bloque ${j} del día ${i} no tiene propiedad 'sets' válida (número)`
          );
        }

        if (!block.name || typeof block.name !== "string") {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} no tiene 'name' válido:`,
            block
          );
          throw new Error(
            `Bloque ${j} del día ${i} no tiene propiedad 'name' válida`
          );
        }

        if (
          !block.reps ||
          !Array.isArray(block.reps) ||
          block.reps.length !== 2
        ) {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} no tiene 'reps' válido:`,
            block
          );
          throw new Error(
            `Bloque ${j} del día ${i} no tiene propiedad 'reps' válida [min, max]`
          );
        }

        if (typeof block.rest_sec !== "number") {
          console.error(
            `❌ [MANUAL VALIDATION] Bloque ${j} del día ${i} no tiene 'rest_sec' válido:`,
            block
          );
          throw new Error(
            `Bloque ${j} del día ${i} no tiene propiedad 'rest_sec' válida (número)`
          );
        }
      }
    }

    console.log(
      "✅ [MANUAL VALIDATION] Validación manual completada exitosamente"
    );

    let validatedPlan;
    try {
      validatedPlan = GeneratedPlanSchema.parse(parsedPlan);
      console.log("✅ [VALIDATION] Plan validado exitosamente!");
    } catch (validationError) {
      console.error("❌ [VALIDATION] Error en validación del plan:");
      console.error("Plan recibido:", JSON.stringify(parsedPlan, null, 2));
      console.error("Error de validación:", validationError);
      throw new Error(
        `Error en validación del plan: ${
          validationError instanceof Error
            ? validationError.message
            : String(validationError)
        }`
      );
    }

    // 6. Generar hash único para el plan
    const planHash = `plan_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log(`\n🆔 [PLAN ID] Hash generado: ${planHash}`);

    // 7. Preparar respuesta final
    const response = {
      success: true,
      planId: planHash,
      plan: validatedPlan,
      metadata: {
        generatedAt: new Date().toISOString(),
        responseTime: responseTime,
        model: process.env.MODEL_NAME || "gpt-4o-mini",
        tokensUsed: completion.usage?.total_tokens || 0,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
      },
    };

    // ═══════════════════════════════════════════════════════════════
    // ✅ PLAN GENERADO EXITOSAMENTE
    // ═══════════════════════════════════════════════════════════════

    console.log("\n✅ [SUCCESS] Plan generado exitosamente!");
    console.log(`🆔 Plan ID: ${planHash}`);
    console.log(`⏱️ Tiempo total: ${responseTime} ms`);
    console.log(`🎯 Tokens usados: ${completion.usage?.total_tokens || 0}`);
    console.log(`📅 Duración: ${validatedPlan.weeks} semanas`);
    console.log(`🗓️ Días: ${validatedPlan.days.length}`);

    console.log("\n" + "=".repeat(80));
    console.log("🚀 [DONE] Enviando respuesta al frontend");
    console.log("=".repeat(80) + "\n");

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // ═══════════════════════════════════════════════════════════════
    // 💥 ERROR EN GENERACIÓN DE PLAN
    // ═══════════════════════════════════════════════════════════════

    console.log("\n💥 [ERROR] Error en generación de plan:");
    console.log(
      `📍 Tipo: ${
        error instanceof Error ? error.constructor.name : typeof error
      }`
    );
    console.log(
      `📝 Mensaje: ${error instanceof Error ? error.message : String(error)}`
    );

    let errorMessage = "Error interno del servidor";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("JSON válido")) {
        errorMessage = "Error en la respuesta de la IA: formato inválido";
        statusCode = 422;
      } else if (error.message.includes("validation")) {
        errorMessage = "Datos de entrada inválidos";
        statusCode = 400;
      } else if (error.message.includes("OpenAI")) {
        errorMessage = "Error en la llamada a OpenAI";
        statusCode = 503;
      } else if (error.message.includes("fetch")) {
        errorMessage = "Error al obtener ejercicios de la base de datos";
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }

    const errorResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    console.log(`🚨 [ERROR] ${errorMessage}`);
    console.log("\n" + "=".repeat(80));

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
