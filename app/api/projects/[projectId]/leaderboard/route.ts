import { authOptions } from "@/auth";
import AnnotatorHistory from "@/models/points";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      {
        msg: "Unauthorized",
      },
      {
        status: 403,
      }
    );
  }

  const { projectId } = params; // Get projectId from path params

  if (!projectId) {
    return NextResponse.json(
      {
        msg: "Missing project ID",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const leaderboard = await AnnotatorHistory.find(
      { project: projectId }, // Match the specific project
      { annotator: 1, totalPoints: 1 } // Only select relevant fields
    )
      .populate("annotator", "name email") // Populate annotator details
      .sort({ totalPoints: -1 }) // Sort by total points descending

    return NextResponse.json({
      success: true,
      leaderboard,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        msg: "Error while fetching leaderboard",
      },
      {
        status: 500,
      }
    );
  }
}
