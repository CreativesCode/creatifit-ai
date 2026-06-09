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
    try {
      // Intentar primero con el cliente normal (con RLS)
      const { data: normalData, error: normalError } = await supabase
        .from("plans")
        .select("*")
        .order("created_at", { ascending: false });

      let data = normalData;

      // Si hay error de permisos, intentar con admin
      if (normalError && normalError.code === "PGRST116") {
        if (serviceRoleKey) {
          const { data: adminData, error: adminError } = await supabaseAdmin
            .from("plans")
            .select("*")
            .order("created_at", { ascending: false });

          if (adminError) throw adminError;
          data = adminData;
        } else {
          throw new Error("No admin access available and RLS denied access");
        }
      } else if (normalError) {
        throw normalError;
      }

      // Parsear el payload JSON string a objeto
      const parsedData =
        data?.map((plan) => ({
          ...plan,
          payload:
            typeof plan.payload === "string"
              ? JSON.parse(plan.payload)
              : plan.payload,
        })) || [];

      return parsedData;
    } catch (error) {
      console.error("Error fetching plans:", error);
      throw error;
    }
  },

  async getPlanById(id: string) {
    try {
      // Intentar primero con el cliente normal (con RLS)
      const { data: normalData, error: normalError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", id)
        .single();

      let data = normalData;

      // Si hay error de permisos, intentar con admin
      if (normalError && normalError.code === "PGRST116") {
        if (serviceRoleKey) {
          const { data: adminData, error: adminError } = await supabaseAdmin
            .from("plans")
            .select("*")
            .eq("id", id)
            .single();

          if (adminError) throw adminError;
          data = adminData;
        } else {
          throw new Error("No admin access available and RLS denied access");
        }
      } else if (normalError) {
        throw normalError;
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

      return parsedData;
    } catch (error) {
      console.error("Error fetching plan by ID:", error);
      throw error;
    }
  },

  async getPlanExercises(planId: string) {
    try {
      // Usar la función RPC get_plan_exercises_with_details
      const { data, error } = await supabase.rpc(
        "get_plan_exercises_with_details",
        {
          p_plan_id: planId,
        }
      );

      if (error) {
        console.error("Error fetching plan exercises:", error);
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

      return {
        success: true,
        planId,
        exercises: exercisesByDay,
        totalExercises: data?.length || 0,
        retrievedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching plan exercises:", error);
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
    // Verificar si la tabla existe y obtener información básica
    const { data, error, count } = await supabase
      .from("plans")
      .select("*", { count: "exact" })
      .limit(5);

    return { data, error, count };
  },
};
