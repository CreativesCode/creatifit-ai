import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("💪 [PLAN EXERCISES] Fetching exercises for plan:", params.id);

  try {
    const planId = params.id;
    
    if (!planId) {
      throw new Error("Plan ID is required");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Verificar que las variables estén configuradas
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    // Llamar a la función RPC para obtener ejercicios del plan con detalles
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_plan_exercises_with_details`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_plan_id: planId
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [PLAN EXERCISES] RPC error:", errorText);
      throw new Error(`Failed to fetch plan exercises: ${errorText}`);
    }

    const exercises = await response.json();
    
    console.log(`✅ [PLAN EXERCISES] Retrieved ${exercises.length} exercises for plan ${planId}`);

    // Agrupar ejercicios por día
    const exercisesByDay = exercises.reduce((acc: any, exercise: any) => {
      const day = exercise.day_letter;
      if (!acc[day]) {
        acc[day] = [];
      }
      
      // Agregar información del ejercicio con gif_url
      acc[day].push({
        ...exercise,
        gif_url: exercise.gif_url ? `${process.env.NEXT_PUBLIC_STATICS_IMAGES}/${exercise.gif_url}` : null,
        // Agregar información adicional del ejercicio
        exercise_details: {
          id: exercise.exercise_id,
          name: exercise.exercise_name,
          equipment: exercise.equipment,
          category: exercise.category,
          primary_muscles: exercise.primary_muscles,
          gif_url: exercise.gif_url ? `${process.env.NEXT_PUBLIC_STATICS_IMAGES}/${exercise.gif_url}` : null
        }
      });
      
      return acc;
    }, {});

    const responseData = {
      success: true,
      planId,
      exercises: exercisesByDay,
      totalExercises: exercises.length,
      retrievedAt: new Date().toISOString()
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("💥 [PLAN EXERCISES] Error:", error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
