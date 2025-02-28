// app/api/teams/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Team } from "@/models/Team";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all teams without filtering by isActive
    const teams = await Team.find({})
      .sort({ name: 1 }) // Sort alphabetically by name
      .select('_id name description');
    
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}