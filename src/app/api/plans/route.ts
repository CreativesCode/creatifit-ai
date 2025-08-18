import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("📋 [PLANS API] Fetching all plans...");
  
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ [PLANS API] Error fetching plans:", error);
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }

    console.log(`✅ [PLANS API] Successfully fetched ${plans?.length || 0} plans`);
    
    return NextResponse.json({
      success: true,
      plans: plans || [],
      count: plans?.length || 0
    });

  } catch (error) {
    console.error("💥 [PLANS API] Error occurred:", error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
