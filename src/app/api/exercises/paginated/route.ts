import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Parámetros de filtrado
    const category = searchParams.get('category');
    const kind = searchParams.get('kind');
    const equipment = searchParams.get('equipment');
    const search = searchParams.get('search');
    
    // Verificar variables de entorno
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Variables de entorno de Supabase no configuradas");
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Usar la función SQL simple
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_exercises_simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_page: page,
        p_limit: limit,
        p_category: category || null,
        p_kind: kind || null,
        p_equipment: equipment || null,
        p_search: search || null
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener ejercicios: ${response.statusText}`);
    }
    
    const exercises = await response.json();
    
    // Extraer el total count del primer resultado (si existe)
    let totalExercises = 0;
    if (exercises.length > 0 && exercises[0].total_count) {
      totalExercises = exercises[0].total_count;
    }
    
    // Remover el campo total_count de cada ejercicio
    const cleanExercises = exercises.map((exercise: any) => {
      const { total_count, ...cleanExercise } = exercise;
      return cleanExercise;
    });
    
    // Calcular información de paginación
    const totalPages = Math.ceil(totalExercises / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    const responseData = {
      success: true,
      data: {
        exercises: cleanExercises,
        pagination: {
          currentPage: page,
          totalPages,
          totalExercises,
          limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        filters: {
          category: category || null,
          kind: kind || null,
          equipment: equipment || null,
          search: search || null,
        }
      }
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error en paginación de ejercicios:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor',
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

