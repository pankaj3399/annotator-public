// app/api/auth/team-cookie/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    console.log("Team cookie API called");
    const cookieStore = cookies();
    const teamId = cookieStore.get('signup_team_id')?.value;
    
    console.log("Team ID from cookie:", teamId);
    
    return NextResponse.json({ teamId });
  } catch (error) {
    console.error("Error retrieving team cookie:", error);
    return NextResponse.json({ error: "Failed to retrieve team cookie" }, { status: 500 });
  }
}