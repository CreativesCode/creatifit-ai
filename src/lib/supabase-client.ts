import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase-config";

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey
);

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
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getPlanById(id: string) {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async getPlanExercises(planId: string) {
    const { data, error } = await supabase
      .from("plan_exercises")
      .select(
        `
        *,
        exercises (
          id,
          name,
          gif_url,
          equipment,
          category,
          kind
        )
      `
      )
      .eq("plan_id", planId);

    if (error) throw error;
    return data;
  },

  async savePlan(planData: any) {
    const { data, error } = await supabase
      .from("plans")
      .insert([planData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Logs
  async getLogs(sessionId?: string) {
    let query = supabase
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
    const { data, error } = await supabase
      .from("workout_logs")
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
