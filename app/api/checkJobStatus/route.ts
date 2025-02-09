import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Forces dynamic execution

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 }
      );
    }

    const checkStatusResponse = await fetch(
      `https://api.cleanvoice.ai/v2/edits/${jobId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": process.env.CLEANVOICE_API_KEY!,
        },
      }
    );

    if (!checkStatusResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch job status" },
        { status: checkStatusResponse.status }
      );
    }

    const statusData = await checkStatusResponse.json();

    return NextResponse.json({
      status: statusData.status,
      result: statusData.result || null,
    });
  } catch (error) {
    console.error("Error checking job status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
