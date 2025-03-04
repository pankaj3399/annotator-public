// app/api/auth/clear-team-cookie/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    console.log("Clear team cookie API called");
    const cookieStore = cookies();
    cookieStore.delete('signup_team_id');
    
    console.log("Team cookie cleared");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing team cookie:", error);
    return NextResponse.json({ error: "Failed to clear team cookie" }, { status: 500 });
  }
}