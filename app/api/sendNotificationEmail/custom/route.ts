import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { sendCustomNotificationEmail } from "@/app/actions/task";

export async function POST(req: NextRequest) {
  console.log("🔥 API: Starting custom email sending");
  
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.error("❌ API: Unauthorized access");
    return NextResponse.json(
      {
        msg: "Unauthorized",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const body = await req.json();
    console.log("🔥 API: Request body:", body);
    
    const { selectedAnnotators, projectId } = body;

    if (!selectedAnnotators || selectedAnnotators.length === 0) {
      console.error("❌ API: No annotators selected");
      return NextResponse.json(
        {
          msg: "No annotators selected.",
        },
        {
          status: 400,
        }
      );
    }

    console.log("🔥 API: Calling sendCustomNotificationEmail");
    const result = await sendCustomNotificationEmail(selectedAnnotators, projectId);
    console.log("🔥 API: Email sending result:", result);

    return NextResponse.json({
      msg: result.success ? "Emails sent successfully" : "Some emails failed to send",
      success: result.success,
      result: result
    });
  } catch (e) {
    console.error("❌ API: Error in sending email:", e);
    console.error("❌ API: Error stack:", e.stack);
    return NextResponse.json(
      {
        msg: "Error sending the custom email",
        error: e.message,
        success: false
      },
      {
        status: 500,
      }
    );
  }
}