import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 [TEST API] Iniciando prueba de conexión...");

    // Verificar variables de entorno
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("❌ [TEST API] Variables de entorno no configuradas");
      throw new Error("Variables de entorno de Supabase no configuradas");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("✅ [TEST API] Variables de entorno OK");
    console.log("🌐 [TEST API] Supabase URL:", supabaseUrl);

    // Probar conexión básica
    const testResponse = await fetch(
      `${supabaseUrl}/rest/v1/exercises?select=id,name&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    console.log(
      "📡 [TEST API] Respuesta de Supabase:",
      testResponse.status,
      testResponse.statusText
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error("❌ [TEST API] Error en Supabase:", errorText);
      throw new Error(
        `Error en Supabase: ${testResponse.status} - ${errorText}`
      );
    }

    const testData = await testResponse.json();
    console.log("✅ [TEST API] Datos de prueba:", testData);

    // Probar la función personalizada
    console.log("🔍 [TEST API] Probando función get_exercises_simple...");

    const functionResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_exercises_simple`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_page: 1,
          p_limit: 3,
          p_category: null,
          p_kind: null,
          p_equipment: null,
          p_search: null,
        }),
      }
    );

    console.log(
      "📡 [TEST API] Respuesta de función:",
      functionResponse.status,
      functionResponse.statusText
    );

    if (!functionResponse.ok) {
      const errorText = await functionResponse.text();
      console.error("❌ [TEST API] Error en función:", errorText);
      throw new Error(
        `Error en función: ${functionResponse.status} - ${errorText}`
      );
    }

    const functionData = await functionResponse.json();
    console.log("✅ [TEST API] Datos de función:", functionData);

    const response = {
      success: true,
      message: "Prueba de conexión exitosa",
      data: {
        supabase_connection: "OK",
        table_access: "OK",
        function_access: "OK",
        sample_data: testData,
        function_data: functionData,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [TEST API] Error completo:", error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
