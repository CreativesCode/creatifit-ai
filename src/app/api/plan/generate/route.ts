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
      console.log("🔧 [SQL FILTER] Equipamiento del usuario:", userEquipmentArray);

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
              p_limit: 200
            }),
          }
        );

        if (response.ok) {
          const exercises = await response.json();
          console.log(`✅ [SQL FILTER] Ejercicios filtrados obtenidos: ${exercises.length}`);
          return exercises;
        } else {
          console.warn("⚠️ [SQL FILTER] RPC falló, usando método alternativo");
          // Fallback: usar la función get_exercises_simple si existe
          return await getExercisesWithFallback(userEquipmentArray, userLevel, userObjective);
        }
      } catch (error) {
        console.warn("⚠️ [SQL FILTER] Error en RPC, usando método alternativo:", error);
        return await getExercisesWithFallback(userEquipmentArray, userLevel, userObjective);
      }
    };

    // Función de fallback usando get_exercises_simple
    const getExercisesWithFallback = async (
      userEquipment: string[],
      userLevel: string,
      userObjective: string
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
                p_search: null
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
                return userEquipment.some(userEq => 
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

        console.log(`🔄 [FALLBACK] Ejercicios obtenidos con fallback: ${exercises.length}`);
        return exercises;
      } catch (error) {
        console.error("❌ [FALLBACK] Error en fallback:", error);
        return [];
      }
    };

    // Función para filtrar ejercicios por equipamiento del usuario (INTELIGENTE)
    const filterExercisesByEquipment = (
      exercises: any[],
      userEquipment: Record<string, boolean>
    ) => {
      // Convertir el objeto de equipamiento a array de strings
      const userEquipmentArray = Object.keys(userEquipment).filter(
        (key) => userEquipment[key]
      );

      console.log("\n🔧 [FILTER] User equipment array:", userEquipmentArray);

      return exercises.filter((ex) => {
        const exEquipment = ex.equipment; // Campo equipment del CSV
        const exMeta = ex.meta?.equipment; // Campo meta.equipment (si existe)

        // Log para debug (solo para el primer ejercicio)
        if (ex.name === exercises[0]?.name) {
          console.log(`🔍 [FILTER] First exercise debug:`);
          console.log(`   Name: ${ex.name}`);
          console.log(`   Equipment field:`, exEquipment);
          console.log(`   Meta equipment:`, exMeta);
        }

        // SISTEMA DE MAPEO INTELIGENTE
        const canDoExercise = analyzeEquipmentCompatibility(
          exEquipment,
          exMeta,
          userEquipmentArray
        );

        return canDoExercise;
      });
    };

    // Función para analizar compatibilidad de equipamiento
    const analyzeEquipmentCompatibility = (
      equipmentField: string,
      _metaEquipment: any,
      userEquipment: string[]
    ): boolean => {
      // Si no hay campo equipment, permitir el ejercicio
      if (!equipmentField) return true;

      // Convertir a string y normalizar
      const equipmentStr = String(equipmentField).toLowerCase();

      // CASO 1: "Full Gym, NO EQUIPMENT" = Se puede hacer en casa
      if (equipmentStr.includes("no equipment")) {
        return true; // ✅ Siempre disponible
      }

      // CASO 2: "Full Gym" = Se puede hacer en casa si tienes equipamiento básico
      if (equipmentStr === "full gym" || equipmentStr.includes("full gym")) {
        // Verificar si tienes equipamiento básico para hacer en casa
        const hasBasicEquipment = userEquipment.some((eq) =>
          [
            "none",
            "wall",
            "chair",
            "table",
            "resistance_band",
            "resistance_tubes",
          ].includes(eq)
        );
        return hasBasicEquipment; // ✅ Disponible si tienes equipamiento básico
      }

      // CASO 3: Equipamiento específico
      if (equipmentStr.includes(",")) {
        const equipmentList = equipmentStr
          .split(",")
          .map((eq) => eq.trim().toLowerCase());

        // Si incluye "NO EQUIPMENT", siempre disponible
        if (equipmentList.some((eq) => eq.includes("no equipment"))) {
          return true;
        }

        // Verificar si tienes alguno de los equipamientos requeridos
        const hasRequiredEquipment = equipmentList.some((requiredEq) => {
          // Mapeo de equipamiento específico
          const equipmentMapping: Record<string, string[]> = {
            dumbbells: ["dumbbells", "none"], // Dumbbells se pueden reemplazar con peso corporal
            barbell: ["barbell", "none"], // Barbell se puede reemplazar con peso corporal
            kettlebell: ["kettlebell", "none"], // Kettlebell se puede reemplazar
            cable: ["cable", "resistance_band", "resistance_tubes"], // Cable se puede reemplazar con bandas
            machine: ["machine", "none"], // Máquinas se pueden reemplazar con peso corporal
            bench: ["bench", "chair", "table", "wall"], // Bench se puede reemplazar
            "foam roller": ["foam_roller", "none"], // Foam roller se puede reemplazar
            "exercise ball": ["exercise_ball", "none"], // Pelota se puede reemplazar
            gymstick: ["gymstick", "resistance_band", "resistance_tubes"], // Gymstick se puede reemplazar
            landmine: ["landmine", "none"], // Landmine se puede reemplazar
            plate: ["plate", "none"], // Placas se pueden reemplazar
            "trx suspension": ["trx_suspension", "none"], // TRX se puede reemplazar
            "resistance band": ["resistance_band", "resistance_tubes"], // Bandas de resistencia
            "medicine ball": ["medicine_ball", "none"], // Pelota medicinal se puede reemplazar
            "pull-up bar": ["pullup_bar", "none"], // Barra de dominadas se puede reemplazar
            "dip bars": ["dip_bars", "chair", "table"], // Barras de dips se pueden reemplazar
            "smith machine": ["smith_machine", "none"], // Smith machine se puede reemplazar
            "leg press": ["leg_press", "none"], // Prensa de piernas se puede reemplazar
            "lat pulldown": [
              "lat_pulldown",
              "resistance_band",
              "resistance_tubes",
            ], // Lat pulldown se puede reemplazar
            "seated row": ["seated_row", "resistance_band", "resistance_tubes"], // Remo sentado se puede reemplazar
            "leg extension": ["leg_extension", "none"], // Extensión de piernas se puede reemplazar
            "leg curl": ["leg_curl", "none"], // Curl de piernas se puede reemplazar
            "pec deck": ["pec_deck", "none"], // Pec deck se puede reemplazar
            "chest press": ["chest_press", "none"], // Prensa de pecho se puede reemplazar
            "shoulder press": ["shoulder_press", "none"], // Prensa de hombros se puede reemplazar
            treadmill: ["treadmill", "none"], // Cinta se puede reemplazar con cardio en casa
            elliptical: ["elliptical", "none"], // Elíptica se puede reemplazar
            "rowing machine": ["rowing_machine", "none"], // Máquina de remo se puede reemplazar
            "battle ropes": ["battle_ropes", "none"], // Cuerdas de batalla se pueden reemplazar
            box: ["box", "chair", "table", "wall"], // Caja se puede reemplazar
            step: ["step", "chair", "table"], // Escalón se puede reemplazar
            platform: ["platform", "chair", "table"], // Plataforma se puede reemplazar
            mat: ["yoga_mat", "none"], // Colchoneta se puede reemplazar
            towel: ["towel", "none"], // Toalla se puede reemplazar
            wall: ["wall", "none"], // Pared siempre disponible
            chair: ["chair", "none"], // Silla siempre disponible
            table: ["table", "none"], // Mesa siempre disponible
            floor: ["none"], // Piso siempre disponible
            stairs: ["stairs", "none"], // Escaleras se pueden reemplazar
            tree: ["tree", "none"], // Árbol se puede reemplazar
            pole: ["pole", "none"], // Poste se puede reemplazar
            rope: ["rope", "none"], // Cuerda se puede reemplazar
            stick: ["stick", "resistance_band", "resistance_tubes"], // Palo se puede reemplazar
            broom: ["broom", "resistance_band", "resistance_tubes"], // Escoba se puede reemplazar
            bottle: ["bottle", "none"], // Botella se puede reemplazar
            book: ["book", "none"], // Libro se puede reemplazar
            backpack: ["backpack", "none"], // Mochila se puede reemplazar
            "water jug": ["water_jug", "none"], // Garrafa se puede reemplazar
            sandbag: ["sandbag", "none"], // Bolsa de arena se puede reemplazar
            "weight vest": ["weight_vest", "none"], // Chaleco con peso se puede reemplazar
            "ankle weights": ["ankle_weights", "none"], // Pesos de tobillo se pueden reemplazar
            "wrist weights": ["wrist_weights", "none"], // Pesos de muñeca se pueden reemplazar
          };

          // Buscar en el mapeo
          for (const [key, alternatives] of Object.entries(equipmentMapping)) {
            if (requiredEq.includes(key)) {
              return alternatives.some((alt) => userEquipment.includes(alt));
            }
          }

          // Si no está en el mapeo, verificar coincidencia directa
          return userEquipment.some(
            (userEq) =>
              requiredEq.includes(userEq) || userEq.includes(requiredEq)
          );
        });

        return hasRequiredEquipment;
      }

      // CASO 4: Equipamiento simple (sin comas)
      const simpleEquipment = equipmentStr.trim();

      // Mapeo directo para equipamiento simple
      const simpleMapping: Record<string, string[]> = {
        dumbbells: ["dumbbells", "none"],
        barbell: ["barbell", "none"],
        kettlebell: ["kettlebell", "none"],
        cable: ["cable", "resistance_band", "resistance_tubes"],
        machine: ["machine", "none"],
        bench: ["bench", "chair", "table", "wall"],
        "foam roller": ["foam_roller", "none"],
        "exercise ball": ["exercise_ball", "none"],
        gymstick: ["gymstick", "resistance_band", "resistance_tubes"],
        landmine: ["landmine", "none"],
        plate: ["plate", "none"],
        "trx suspension": ["trx_suspension", "none"],
        "resistance band": ["resistance_band", "resistance_tubes"],
        "medicine ball": ["medicine_ball", "none"],
        "pull-up bar": ["pullup_bar", "none"],
        "dip bars": ["dip_bars", "chair", "table"],
        "smith machine": ["smith_machine", "none"],
        "leg press": ["leg_press", "none"],
        "lat pulldown": ["lat_pulldown", "resistance_band", "resistance_tubes"],
        "seated row": ["seated_row", "resistance_band", "resistance_tubes"],
        "leg extension": ["leg_extension", "none"],
        "leg curl": ["leg_curl", "none"],
        "pec deck": ["pec_deck", "none"],
        "chest press": ["chest_press", "none"],
        "shoulder press": ["shoulder_press", "none"],
        treadmill: ["treadmill", "none"],
        elliptical: ["elliptical", "none"],
        "rowing machine": ["rowing_machine", "none"],
        "battle ropes": ["battle_ropes", "none"],
        box: ["box", "chair", "table", "wall"],
        step: ["step", "chair", "table"],
        platform: ["platform", "chair", "table"],
        mat: ["yoga_mat", "none"],
        towel: ["towel", "none"],
        wall: ["wall", "none"],
        chair: ["chair", "none"],
        table: ["table", "none"],
        floor: ["none"],
        stairs: ["stairs", "none"],
        tree: ["tree", "none"],
        pole: ["pole", "none"],
        rope: ["rope", "none"],
        stick: ["stick", "resistance_band", "resistance_tubes"],
        broom: ["broom", "resistance_band", "resistance_tubes"],
        bottle: ["bottle", "none"],
        book: ["book", "none"],
        backpack: ["backpack", "none"],
        "water jug": ["water_jug", "none"],
        sandbag: ["sandbag", "none"],
        "weight vest": ["weight_vest", "none"],
        "ankle weights": ["ankle_weights", "none"],
        "wrist weights": ["wrist_weights", "none"],
      };

      // Buscar en el mapeo simple
      for (const [key, alternatives] of Object.entries(simpleMapping)) {
        if (simpleEquipment.includes(key)) {
          return alternatives.some((alt) => userEquipment.includes(alt));
        }
      }

      // Si no está en ningún mapeo, verificar coincidencia directa
      return userEquipment.some(
        (userEq) =>
          simpleEquipment.includes(userEq) || userEq.includes(simpleEquipment)
      );
    };

    // Función para filtrar por nivel de dificultad

    // Función para obtener solo información esencial
    const getEssentialExerciseInfo = (exercises: any[]) => {
      return exercises.map((ex) => ({
        name: ex.name,
        kind: ex.kind,
        difficulty: ex.meta?.difficulty || "beginner",
        equipment: ex.equipment || "none",
        category: ex.category || "general",
        primary_muscles: ex.primary_muscles || "general",
        // Nuevos campos de la estructura actualizada
        instructions: ex.instructions || [],
        tips: ex.tips || [],
        benefits: ex.benefits || [],
        muscle_groups_primary: ex.muscle_groups_primary || [],
        muscle_groups_secondary: ex.muscle_groups_secondary || [],
        gif_url: ex.gif_url || null,
        overview: ex.overview || null,
      }));
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

      console.log(`✅ [SQL FILTER] Ejercicios filtrados obtenidos: ${availableExercises.length}`);

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
         console.log(`⚠️ [PLAN GENERATION] Limited to ${maxExercises} exercises to optimize context size and reduce costs`);
       }

      exerciseCount = availableExercises.length;

    } catch (error) {
      console.error("❌ [SQL FILTER] Error obteniendo ejercicios filtrados:", error);
      
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
    const systemPrompt = `You are an expert personal fitness trainer. Your task is to create a personalized training plan based on the user's data.

IMPORTANT: You must respond ONLY with valid JSON that follows EXACTLY this structure. DO NOT include explanatory text, only the JSON.

AVAILABLE EXERCISES (YOU MUST USE ONLY THESE - ${
      availableExercises.length
    } exercises):
${getEssentialExerciseInfo(availableExercises)
  .map((ex) => `- ${ex.name} (${ex.kind}, ${ex.equipment}, ${ex.category})`)
  .join("\n")}

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
      console.log(`${index + 1}. ${ex.name}`);
    });

    console.log("=".repeat(80));

    // ═══════════════════════════════════════════════════════════════
    // 🎯 INFORMACIÓN ESENCIAL ENVIADA EN EL SYSTEM PROMPT
    // ═══════════════════════════════════════════════════════════════

    console.log("\n" + "=".repeat(80));
    console.log("🎯 [ESSENTIAL INFO] INFORMACIÓN ESENCIAL ENVIADA A GPT");
    console.log("=".repeat(80));

    const essentialInfo = getEssentialExerciseInfo(availableExercises);
    console.log("\n📋 Lista de ejercicios en formato esencial:");
    essentialInfo.forEach((ex, index) => {
      console.log(`   ${index + 1}. ${ex.name} (${ex.kind}, ${ex.equipment}, ${ex.category})`);
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
     const calculateEstimatedCost = (inputTokens: number, outputTokens: number = 500) => {
       const model = process.env.MODEL_NAME || "gpt-4o-mini";
       
       if (model === "gpt-4o-mini") {
         const inputCost = (inputTokens / 1000) * 0.00015;
         const outputCost = (outputTokens / 1000) * 0.0006;
         return { inputCost, outputCost, totalCost: inputCost + outputCost, model };
       } else if (model === "gpt-4o") {
         const inputCost = (inputTokens / 1000) * 0.005;
         const outputCost = (outputTokens / 1000) * 0.015;
         return { inputCost, outputCost, totalCost: inputCost + outputCost, model };
       } else {
         // Modelo desconocido, usar estimación conservadora
         const inputCost = (inputTokens / 1000) * 0.001;
         const outputCost = (outputTokens / 1000) * 0.002;
         return { inputCost, outputCost, totalCost: inputCost + outputCost, model: "unknown" };
       }
     };
     
     const costEstimate = calculateEstimatedCost(estimatedTokens);
     
     console.log(
       `\n📊 [TOKENS] Total caracteres: ${totalChars}, Estimado tokens: ~${estimatedTokens}`
     );
     console.log(
       `💰 [COST ESTIMATE] Modelo: ${costEstimate.model}`
     );
     console.log(
       `💰 [COST ESTIMATE] Costo entrada: $${costEstimate.inputCost.toFixed(6)}`
     );
     console.log(
       `💰 [COST ESTIMATE] Costo salida estimado: $${costEstimate.outputCost.toFixed(6)}`
     );
     console.log(
       `💰 [COST ESTIMATE] Costo total estimado: $${costEstimate.totalCost.toFixed(6)}`
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
     console.log(`🎯 Tokens salida: ${completion.usage?.completion_tokens || "?"}`);
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
       `💰 [COST COMPARISON] Diferencia: $${costDifference.toFixed(6)} (${costDifference > 0 ? 'más caro' : 'más barato'} que estimado)`
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
    const validatedPlan = GeneratedPlanSchema.parse(parsedPlan);
    console.log("✅ [VALIDATION] Plan validado exitosamente!");

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
    // �� ERROR EN GENERACIÓN DE PLAN
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
