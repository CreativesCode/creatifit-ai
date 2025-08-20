import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    console.log("🔍 [API] Buscando ejercicio con slug:", slug);

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error("Variables de entorno de Supabase no configuradas");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(
      "🔍 [API] Variables de entorno configuradas, buscando en Supabase..."
    );

    // Decodificar el slug para obtener el nombre real
    const decodedSlug = decodeURIComponent(slug);
    console.log("🔍 [API] Slug decodificado:", decodedSlug);
    
    // Buscar ejercicio por nombre (búsqueda más flexible)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/exercises?name=ilike.*${decodedSlug}*&select=*`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "❌ [API] Error en respuesta de Supabase:",
        response.status,
        response.statusText
      );
      throw new Error(`Error al obtener ejercicio: ${response.statusText}`);
    }

    const exercises = await response.json();
    console.log("📥 [API] Respuesta de Supabase:", exercises);

    if (exercises.length === 0) {
      console.log("⚠️ [API] No se encontraron ejercicios con el slug:", slug);
      return NextResponse.json(
        { success: false, error: "Ejercicio no encontrado" },
        { status: 404 }
      );
    }

    const exercise = exercises[0];
    console.log("✅ [API] Ejercicio encontrado:", exercise.name);

    // Obtener músculos detallados
    let detailedMuscles = { primary: [], secondary: [] };
    try {
      const musclesResponse = await fetch(
        `${supabaseUrl}/rest/v1/exercise_muscles_detail?exercise_id=eq.${exercise.id}&select=*`,
        {
          method: "GET",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (musclesResponse.ok) {
        const musclesData = await musclesResponse.json();
        console.log("💪 [API] Músculos detallados:", musclesData);
        
        detailedMuscles = {
          primary: musclesData.filter((m: any) => m.muscle_group === 'primary').map((m: any) => m.muscle_name),
          secondary: musclesData.filter((m: any) => m.muscle_group === 'secondary').map((m: any) => m.muscle_name)
        };
      }
    } catch (error) {
      console.log("⚠️ [API] Error obteniendo músculos detallados:", error);
    }

    // Obtener categorías relacionadas
    let categories = [];
    try {
      const categoriesResponse = await fetch(
        `${supabaseUrl}/rest/v1/exercise_category_relations?exercise_name=eq.${encodeURIComponent(
          exercise.name
        )}&select=*,exercise_categories(*)`,
        {
          method: "GET",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        console.log("🏷️ [API] Categorías relacionadas:", categoriesData);
        categories = categoriesData
          .map((rel: any) => rel.exercise_categories?.name)
          .filter(Boolean);
      }
    } catch (error) {
      console.log("⚠️ [API] Error obteniendo categorías:", error);
    }

    // Enriquecer el ejercicio con datos adicionales
    const enrichedExercise = {
      ...exercise,
      all_categories: categories,
      primary_category: exercise.category,
      muscle_groups_primary: detailedMuscles.primary.length > 0 ? detailedMuscles.primary : 
        (exercise.primary_muscles ? exercise.primary_muscles.split(',').map(m => m.trim()) : []),
      muscle_groups_secondary: detailedMuscles.secondary.length > 0 ? detailedMuscles.secondary : 
        (exercise.muscle_groups_secondary || []),
      // Generar contenido enriquecido si los campos están vacíos
      overview: exercise.overview || `Ejercicio de ${exercise.kind} que se enfoca en ${exercise.primary_muscles || 'los músculos principales'}.`,
      instructions: exercise.instructions && exercise.instructions.length > 0 ? exercise.instructions : [
        "Adopta la posición inicial correcta",
        "Mantén la forma durante todo el movimiento",
        "Respira de manera controlada",
        "Realiza el número de repeticiones indicado"
      ],
      tips: exercise.tips && exercise.tips.length > 0 ? exercise.tips : [
        "Mantén el core activo durante todo el ejercicio",
        "No te apresures, prioriza la técnica",
        "Escucha a tu cuerpo y ajusta la intensidad según sea necesario"
      ],
      benefits: exercise.benefits && exercise.benefits.length > 0 ? exercise.benefits : [
        "Fortalece los músculos objetivo",
        "Mejora la estabilidad y el control",
        "Contribuye al desarrollo muscular general"
      ]
    };

    console.log("🎯 [API] Ejercicio enriquecido:", enrichedExercise);

    return NextResponse.json({
      success: true,
      data: enrichedExercise,
    });
  } catch (error) {
    console.error("Error en API de ejercicio por slug:", error);
    const errorResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
