import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { enrollCourse } from "@/app/actions/course";
import { headers } from "next/headers";
import { updatePaymentStatus } from "@/app/actions/product";
import nodemailer from "nodemailer";
import { getAdminPaymentNotificationTemplate } from "../template/recent/emailTemplates";

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = async ({
  paymentIntentId,
  date = new Date(),
  amount,
  productName,
  projectManager,
}: {
  paymentIntentId: string;
  date?: Date;
  amount: number;
  productName: string;
  projectManager: string;
}) => {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
    to: process.env.ADMIN_EMAIL,
    subject: "New Payment Received",
    html: getAdminPaymentNotificationTemplate({
      paymentIntentId,
      date,
      amount,
      productName,
      pmId: projectManager,
    }),
  });
};

// Initialize Stripe with proper typing for the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

console.log(endpointSecret);
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = headers();
    const sig = headersList.get("stripe-signature");
    if (!sig) {
      return NextResponse.json(
        { error: "No signature found" },
        { status: 400 }
      );
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const successSession = event.data.object as Stripe.Checkout.Session;
        const type = successSession.metadata?.type;
        const userId = successSession.metadata?.userEmail;
        const price = successSession.amount_total;
        const payment_intent = successSession.payment_intent as string;

        if (!userId) {
          throw new Error("Missing required user data");
        }

        console.log({ type, userId, payment_intent, price });

        try {
          if (successSession.payment_status === "paid") {
            if (type === "course") {
              const courseId = successSession.metadata?.courseId;
              if (!courseId) {
                throw new Error("Missing course ID");
              }
              const status = await enrollCourse({
                courseId,
                userId,
                payment_intent,
                price,
              });
              console.log("Course Enrollment status:", status);
              return NextResponse.json({ received: true, status });
            }
            // Add future handling for product type here
            else if (type === "product") {
              // Placeholder for product-specific logic
              const status = await updatePaymentStatus(
                successSession.metadata?.wishlistId as string,
                successSession.metadata?.itemId as string,
                {
                  stripe_payment_intent: payment_intent,
                  payment_status: "succeeded",
                  total_price_paid: price,
                }
              );

              // Send email notification to admin
              await sendEmail({
                paymentIntentId: payment_intent,
                date: new Date(),
                amount: (price ?? 0) / 100,
                productName: successSession.metadata?.name as string,
                projectManager: userId,
              });
              console.log("Email sent to admin");

              console.log("Product payment status:", status);
              return NextResponse.json({
                received: true,
                status,
              });
            }
          }
        } catch (error) {
          console.error("Error saving payment details:", error);
          return NextResponse.json(
            { error: "Failed to save payment details" },
            { status: 500 }
          );
        }
        break;
      }
      // ... rest of the existing webhook handlers remain the same
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
