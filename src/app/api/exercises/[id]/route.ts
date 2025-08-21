import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log("🔍 [API] Buscando ejercicio con ID:", id);

    // Obtener el ejercicio por ID
    const { data: exercise, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ [API] Error al buscar ejercicio:", error);
      return NextResponse.json(
        { success: false, error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    if (!exercise) {
      console.log("⚠️ [API] Ejercicio no encontrado con ID:", id);
      return NextResponse.json(
        { success: false, error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    console.log("✅ [API] Ejercicio encontrado:", exercise.name);
    console.log(
      "📋 [API] Datos completos del ejercicio:",
      JSON.stringify(exercise, null, 2)
    );

    return NextResponse.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    console.error("❌ [API] Error interno:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
