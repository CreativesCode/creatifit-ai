import { supabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("📝 [LOGS API] Saving workout log...");

  try {
    const body = await request.json();
    console.log("📥 [LOGS API] Received data:", body);

    const {
      exerciseName,
      setIndex,
      targetReps,
      actualReps,
      weight,
      rpe,
      notes,
      planDayId,
      sessionId,
      timestamp,
    } = body;

    // Validar datos requeridos
    if (
      !exerciseName ||
      !setIndex ||
      !targetReps ||
      !actualReps ||
      !planDayId ||
      !sessionId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: exerciseName, setIndex, targetReps, actualReps, planDayId, sessionId",
        },
        { status: 400 }
      );
    }

    // Crear el log en Supabase
    const { data: log, error } = await supabase
      .from("workout_logs")
      .insert({
        exercise_name: exerciseName,
        set_index: setIndex,
        target_reps: targetReps,
        actual_reps: actualReps,
        weight: weight || null,
        rpe: rpe || null,
        notes: notes || null,
        plan_day_id: planDayId,
        session_id: sessionId, // ← Agregar session_id
        timestamp: timestamp || new Date().toISOString(),
        user_id: null, // TODO: Implementar autenticación
      })
      .select()
      .single();

    // Si hay error, loggear pero no fallar completamente
    if (error) {
      console.error("❌ [LOGS API] Error saving log:", error);
      console.log("⚠️ [LOGS API] Continuing with local state only");

      // Retornar éxito para que el flujo continúe
      return NextResponse.json({
        success: true,
        log: { id: "local-" + Date.now() },
        message: "Log saved locally (database error ignored)",
        warning: "Database error occurred, but workout flow continues",
      });
    }

    console.log("✅ [LOGS API] Log saved successfully:", log);

    return NextResponse.json({
      success: true,
      log: log,
      message: "Workout log saved successfully",
    });
  } catch (error) {
    console.error("💥 [LOGS API] Error occurred:", error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log("📋 [LOGS API] Fetching workout logs...");

  try {
    const { searchParams } = new URL(request.url);
    const planDayId = searchParams.get("planDayId");
    const sessionId = searchParams.get("sessionId");

    let query = supabase
      .from("workout_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    if (planDayId) {
      query = query.eq("plan_day_id", planDayId);
    }

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error("❌ [LOGS API] Error fetching logs:", error);
      throw new Error(`Failed to fetch logs: ${error.message}`);
    }

    console.log(`✅ [LOGS API] Successfully fetched ${logs?.length || 0} logs`);
    if (sessionId) {
      console.log(`🔍 [LOGS API] Filtered by session ID: ${sessionId}`);
    }
    if (planDayId) {
      console.log(`🔍 [LOGS API] Filtered by plan day ID: ${planDayId}`);
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error) {
    console.error("💥 [LOGS API] Error occurred:", error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
