import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase-config";

// Cliente con clave anónima (con RLS)
export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey
);

// Cliente temporal con service role (bypass RLS) - solo para testing
const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseConfig.url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;

// Funciones para reemplazar las APIs de Next.js
export const supabaseClient = {
  // Ejercicios
  async getExercises(
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string
  ) {
    let query = supabase
      .from("exercises")
      .select("*", { count: "exact" })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return { data, count, hasMore: count ? page * limit < count : false };
  },

  async getExerciseById(id: string) {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Planes
  async getPlans() {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Parsear el payload JSON string a objeto
    const parsedData = data?.map((plan) => ({
      ...plan,
      payload:
        typeof plan.payload === "string"
          ? JSON.parse(plan.payload)
          : plan.payload,
    }));

    return parsedData;
  },

  async getPlanById(id: string) {
    console.log("🔍 [SUPABASE CLIENT] Fetching plan by ID:", id);
    console.log("🔧 [SUPABASE CLIENT] Using admin client:", !!serviceRoleKey);

    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", id)
      .single();

    console.log("📊 [SUPABASE CLIENT] Plan by ID query result:", {
      data,
      error,
    });

    if (error) {
      console.error("❌ [SUPABASE CLIENT] Error fetching plan by ID:", error);
      throw error;
    }

    // Parsear el payload JSON string a objeto
    const parsedData = data
      ? {
          ...data,
          payload:
            typeof data.payload === "string"
              ? JSON.parse(data.payload)
              : data.payload,
        }
      : data;

    console.log("✅ [SUPABASE CLIENT] Plan fetched successfully:", parsedData);
    return parsedData;
  },

  async getPlanExercises(planId: string) {
    console.log("💪 [SUPABASE CLIENT] Fetching exercises for plan:", planId);
    console.log("🔧 [SUPABASE CLIENT] Using admin client:", !!serviceRoleKey);

    try {
      // Usar la función RPC get_plan_exercises_with_details
      const { data, error } = await supabase.rpc(
        "get_plan_exercises_with_details",
        {
          p_plan_id: planId,
        }
      );

      console.log("📊 [SUPABASE CLIENT] Plan exercises RPC result:", {
        data,
        error,
        count: data?.length,
      });

      if (error) {
        console.error(
          "❌ [SUPABASE CLIENT] Error fetching plan exercises:",
          error
        );
        throw error;
      }

      // Agrupar ejercicios por día
      const exercisesByDay =
        data?.reduce((acc: any, exercise: any) => {
          const day = exercise.day_letter;
          if (!acc[day]) {
            acc[day] = [];
          }

          // Agregar información del ejercicio con gif_url
          acc[day].push({
            ...exercise,
            gif_url: exercise.gif_url, // Solo el nombre del archivo
            exercise_details: {
              id: exercise.exercise_id,
              name: exercise.exercise_name,
              equipment: exercise.equipment,
              category: exercise.category,
              primary_muscles: exercise.primary_muscles,
              gif_url: exercise.gif_url,
            },
          });

          return acc;
        }, {}) || {};

      console.log("✅ [SUPABASE CLIENT] Plan exercises fetched successfully:", {
        planId,
        totalExercises: data?.length || 0,
        dayCount: Object.keys(exercisesByDay).length,
      });

      return {
        success: true,
        planId,
        exercises: exercisesByDay,
        totalExercises: data?.length || 0,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        "💥 [SUPABASE CLIENT] Error fetching plan exercises:",
        error
      );
      throw error;
    }
  },

  async savePlan(planData: any) {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .insert([planData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Después de guardar el plan, insertar los ejercicios individuales
    if (data && planData.payload && planData.payload.days) {
      try {
        // Convertir los días del plan a formato para insert_plan_exercises
        const exercises: any[] = [];

        planData.payload.days.forEach((day: any, dayIndex: number) => {
          const dayLetter = String.fromCharCode(65 + dayIndex); // A, B, C, D...

          day.blocks.forEach((block: any, blockIndex: number) => {
            exercises.push({
              name: block.name,
              day: dayLetter,
              block_index: blockIndex,
              sets: block.sets,
              reps: block.reps, // [min, max]
              rest_sec: block.rest_sec,
              cues: block.cues || [],
            });
          });
        });

        // Llamar a la función RPC insert_plan_exercises
        const { error: insertError } = await supabaseAdmin.rpc(
          "insert_plan_exercises",
          {
            p_plan_id: data.id,
            p_exercises: exercises,
          }
        );

        if (insertError) {
          console.error("Error inserting exercises:", insertError);
        }
      } catch (exerciseError) {
        console.error("Error processing exercises:", exerciseError);
      }
    }

    return data;
  },

  // Logs
  async getLogs(sessionId?: string) {
    let query = supabaseAdmin
      .from("workout_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async saveLog(logData: any) {
    const { data, error } = await supabaseAdmin
      .from("workout_logs")
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Función de debug para verificar la tabla plans
  async debugPlansTable() {
    console.log("🔍 [DEBUG] Checking plans table...");

    // Verificar si la tabla existe y obtener información básica
    const { data, error, count } = await supabase
      .from("plans")
      .select("*", { count: "exact" })
      .limit(5);

    console.log("📊 [DEBUG] Plans table info:", {
      data,
      error,
      count,
      dataType: typeof data,
      isArray: Array.isArray(data),
    });

    if (data && data.length > 0) {
      console.log("📋 [DEBUG] Sample plan structure:", data[0]);
      console.log("🔑 [DEBUG] Plan keys:", Object.keys(data[0]));
    }

    return { data, error, count };
  },
};
