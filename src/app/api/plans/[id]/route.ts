import { supabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  console.log(`📋 [PLAN API] Fetching plan: ${planId}`);

  try {
    const { data: plan, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error) {
      console.error("❌ [PLAN API] Error fetching plan:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Plan not found",
            timestamp: new Date().toISOString(),
          },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    console.log(`✅ [PLAN API] Successfully fetched plan: ${planId}`);

    return NextResponse.json({
      success: true,
      plan: plan,
    });
  } catch (error) {
    console.error("💥 [PLAN API] Error occurred:", error);

    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
