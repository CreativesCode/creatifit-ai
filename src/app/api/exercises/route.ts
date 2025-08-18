import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const equipment = searchParams.get("equipment");
    const difficulty = searchParams.get("difficulty");
    const target = searchParams.get("target");
    const search = searchParams.get("search");

    let query = supabase.from("exercises").select("*").order("name");

    // Aplicar filtros
    if (kind) {
      query = query.eq("kind", kind);
    }

    if (equipment) {
      query = query.contains("meta->equipment", [equipment]);
    }

    if (difficulty) {
      query = query.eq("meta->difficulty", difficulty);
    }

    if (target) {
      query = query.contains("meta->target", [target]);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: exercises, error } = await query;

    if (error) {
      console.error("Error fetching exercises:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch exercises" },
        { status: 500 }
      );
    }

    // Transformar los datos para que sean compatibles con el frontend
    const transformedExercises =
      exercises?.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.kind,
        equipment: exercise.meta?.equipment || [],
        muscle_groups: exercise.meta?.target || [],
        difficulty: exercise.meta?.difficulty || "beginner",
        description:
          exercise.meta?.description ||
          `Ejercicio de ${exercise.kind} que trabaja los músculos ${
            exercise.meta?.target?.join(", ") || "principales"
          }.`,
        instructions: exercise.meta?.instructions || [
          `Realiza el ejercicio de ${exercise.kind} con la técnica correcta`,
          "Mantén la forma durante todo el movimiento",
          "Respira de manera controlada",
          "Completa el rango de movimiento completo",
        ],
        cues: exercise.meta?.cues || [
          "Mantén el core activo",
          "Controla el movimiento",
          "Enfócate en la técnica",
        ],
        variations: exercise.meta?.variations || [],
      })) || [];

    return NextResponse.json({
      success: true,
      exercises: transformedExercises,
    });
  } catch (error) {
    console.error("Error in exercises API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
