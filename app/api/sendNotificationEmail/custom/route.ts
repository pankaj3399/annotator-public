//  /app/api/sendNotificationEmail/custom/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import nodemailer from 'nodemailer';
import { connectToDatabase } from "@/lib/db";
import NotificationTemplate from "@/models/NotificationTemplate";
import { User } from "@/models/User";

// This ensures we're using the same email configuration that works elsewhere
const createTransporter = () => {
  // Log SMTP settings (exclude password)
  console.log(`SMTP Configuration:
    Host: ${process.env.SMTP_HOST}
    Port: ${process.env.SMTP_PORT}
    Secure: ${process.env.SMTP_SECURE}
    User: ${process.env.SMTP_USER}
    From: ${process.env.FROM_EMAIL}
  `);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { selectedAnnotators, projectId } = body;

    if (!selectedAnnotators || selectedAnnotators.length === 0) {
      return NextResponse.json(
        { message: "No annotators selected." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { message: "Project ID is required." },
        { status: 400 }
      );
    }

    // Look for custom templates with either naming convention
    const customTemplate = await NotificationTemplate.findOne({
      project: projectId,
      triggerName: { $in: ["custom", "custom_email_notification"] },
      active: true
    });

    if (!customTemplate) {
      // Create default template
      console.log("No template found. Creating default template.");
      const defaultTemplate = new NotificationTemplate({
        project: projectId,
        triggerName: "custom_email_notification",
        triggerTitle: "Notification from Project Manager",
        triggerBody: "<p>You have received a notification regarding your project tasks.</p>",
        active: true
      });
      
      await defaultTemplate.save();
      
      return NextResponse.json({
        message: "Default template created. Please try again.",
        action: "retry"
      }, { status: 202 });
    }

    if (!customTemplate.triggerTitle || !customTemplate.triggerBody) {
      return NextResponse.json(
        { message: "Template is missing title or body content." },
        { status: 400 }
      );
    }

    // Get annotators
    const annotators = await User.find({ '_id': { $in: selectedAnnotators } }).exec();
    
    if (!annotators || annotators.length === 0) {
      return NextResponse.json(
        { message: "No valid annotators found." },
        { status: 404 }
      );
    }

    // Create a FRESH email transporter
    const transporter = createTransporter();
    
    // Test connection first
    try {
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("SMTP verification failed:", verifyError);
      return NextResponse.json(
        { 
          message: "Failed to connect to email server",
          error: verifyError instanceof Error ? verifyError.message : "Connection error"
        },
        { status: 500 }
      );
    }
    
    // Send emails to each annotator
    const emailPromises = annotators.map(async (annotator) => {
      if (!annotator.email) {
        return { 
          annotatorId: annotator._id, 
          success: false,
          reason: "No email address"
        };
      }
      
      try {
        const info = await transporter.sendMail({
          from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
          to: annotator.email,
          subject: customTemplate.triggerTitle,
          html: customTemplate.triggerBody
        });
        
        return { 
          annotatorId: annotator._id,
          email: annotator.email,
          success: true,
          messageId: info.messageId
        };
      } catch (error) {
        console.error(`Error sending to ${annotator.email}:`, error);
        return { 
          annotatorId: annotator._id,
          email: annotator.email,
          success: false,
          error
        };
      }
    });
    
    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      message: `Successfully sent emails to ${successCount} of ${annotators.length} recipients`,
      results
    });
    
  } catch (error) {
    console.error("Error in sending custom emails:", error);
    return NextResponse.json(
      { 
        message: "Error sending custom emails",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}