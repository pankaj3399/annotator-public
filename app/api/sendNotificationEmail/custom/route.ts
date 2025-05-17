import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { sendCustomNotificationEmail } from "@/app/actions/task";

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { selectedAnnotators, projectId } = body;

    if (!selectedAnnotators || selectedAnnotators.length === 0) {
      return NextResponse.json(
        {
          msg: "No annotators selected.",
        },
        {
          status: 400,
        }
      );
    }

    // Call the sendCustomNotificationEmail function to send emails
    await sendCustomNotificationEmail(selectedAnnotators, projectId);

    return NextResponse.json({
      msg: "Emails sent successfully",
    });
  } catch (e) {
    console.error("Error in sending email:", e);
    return NextResponse.json(
      {
        msg: "Error sending the custom email",
      },
      {
        status: 500,
      }
    );
  }
}