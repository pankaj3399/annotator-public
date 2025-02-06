import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { fileUrl, long_silences, fillers, remove_noise } = await req.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "File URL is required" }, { status: 400 });
    }

    const apiUrl = "https://api.cleanvoice.ai/v2/edits";
    const apiKey = process.env.CLEANVOICE_API_KEY || "";

    const data = {
      input: {
        files: [fileUrl],
        config: {
          long_silences,
          fillers,
          remove_noise,
        },
      },
    };

    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };

    const response = await axios.post(apiUrl, data, { headers });

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error("CleanVoice API Error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.detail || "Internal Server Error" },
      { status: error.response?.status || 500 }
    );
  }
}
