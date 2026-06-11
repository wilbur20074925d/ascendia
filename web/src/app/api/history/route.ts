import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnalysesByUser } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analyses = getAnalysesByUser(user.id);
    return NextResponse.json(analyses);
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
