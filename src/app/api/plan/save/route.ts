import { supabase } from "@/lib/supabase/server";
import { GeneratedPlanSchema } from "@/lib/validators/schemas";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("💾 [PLAN SAVE] Starting plan save...");

  try {
    const body = await request.json();
    // console.log(
    //   "📥 [PLAN SAVE] Received request body:",
    //   JSON.stringify(body, null, 2)
    // );

    const { planId, plan, intakeData } = body;

    if (!planId || !plan || !intakeData) {
      throw new Error("Missing required data: planId, plan, or intakeData");
    }

    // Validar el plan con Zod
    const validatedPlan = GeneratedPlanSchema.parse(plan);
    console.log("✅ [PLAN SAVE] Plan validation passed");

    // Generar ID único para el plan si no se proporciona
    const finalPlanId =
      planId || `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. Insertar el plan principal (según database-schema.sql)
    const { data: planData, error: planError } = await supabase
      .from("plans")
      .insert({
        id: finalPlanId,
        user_id: null, // TODO: Implementar autenticación real
        weeks: validatedPlan.weeks,
        version: 1,
        source_hash: `hash_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        payload: validatedPlan,
      })
      .select()
      .single();

    if (planError) {
      console.error("❌ [PLAN SAVE] Error inserting plan:", planError);
      throw new Error(`Failed to save plan: ${planError.message}`);
    }

    console.log("✅ [PLAN SAVE] Plan saved successfully:", planData);

    // 2. Insertar los días del plan (según database-schema.sql)
    const planDays = validatedPlan.days.map((day, index) => ({
      plan_id: finalPlanId,
      day_index: index,
      focus: day.focus,
    }));

    const { data: daysData, error: daysError } = await supabase
      .from("plan_days")
      .insert(planDays)
      .select();

    if (daysError) {
      console.error("❌ [PLAN SAVE] Error inserting plan days:", daysError);
      throw new Error(`Failed to save plan days: ${daysError.message}`);
    }

    console.log("✅ [PLAN SAVE] Plan days saved successfully:", daysData);

    // 3. TEMPORAL: No insertar ejercicios por ahora (problema de foreign key)
    console.log(
      "⚠️ [PLAN SAVE] Skipping day_exercises insertion due to foreign key constraint"
    );
    console.log(
      "💡 [PLAN SAVE] TODO: Implementar mapeo real de ejercicios o crear ejercicios temporales"
    );

    // 4. Insertar los datos de intake (según database-schema.sql)
    try {
      const { data: intakeDataResult, error: intakeError } = await supabase
        .from("intake")
        .insert({
          user_id: null, // TODO: Implementar autenticación real
          objective: intakeData.objective,
          level: intakeData.level,
          age: intakeData.age,
          weight_kg: intakeData.weightKg,
          height_cm: intakeData.heightCm,
          equipment: intakeData.equipment,
          steps_day: intakeData.stepsDay,
          notes: `Plan generated: ${finalPlanId}`,
        })
        .select()
        .single();

      if (intakeError) {
        console.warn(
          "⚠️ [PLAN SAVE] Intake data not saved, but plan was saved successfully"
        );
      } else {
        console.log(
          "✅ [PLAN SAVE] Intake data saved successfully:",
          intakeDataResult
        );
      }
    } catch (intakeError) {
      console.warn(
        "⚠️ [PLAN SAVE] Intake data not saved, but plan was saved successfully"
      );
    }

    const response = {
      success: true,
      message: "Plan saved successfully",
      planId: finalPlanId,
      savedAt: new Date().toISOString(),
    };

    console.log(
      "🎉 [PLAN SAVE] Success! Final response:",
      JSON.stringify(response, null, 2)
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("💥 [PLAN SAVE] Error occurred:", error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      details:
        process.env.NODE_ENV === "development" ? error?.toString() : undefined,
    };

    console.error(
      "🚨 [PLAN SAVE] Error response:",
      JSON.stringify(errorResponse, null, 2)
    );

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
