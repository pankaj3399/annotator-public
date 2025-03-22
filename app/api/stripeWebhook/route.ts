import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { enrollCourse } from "@/app/actions/course";
import { headers } from "next/headers";
import { updatePaymentStatus } from "@/app/actions/product";
import { getAdminPaymentNotificationTemplate, sendEmail } from "@/lib/email";

// Initialize Stripe with proper typing for the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const sendPaymentNotification = async ({
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
  return sendEmail({
    to: process.env.ADMIN_EMAIL || '',
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

        console.log(successSession);
        const type = successSession.metadata?.type;
        const userId = successSession.metadata?.userId; //typo here userEmail gives userId
        const price = successSession.amount_total;
        const payment_intent = successSession.payment_intent as string;
        
        if (!userId) {
          console.error("User ID missing in session metadata");
          throw new Error("Missing required user data");
        }

        if (price == null || price <= 0) {
          throw new Error("Invalid price data");
        }

        if (!payment_intent) {
          throw new Error("Payment Intent is missing");
        }

        console.log({ type, userId, payment_intent, price });

        try {
          if (successSession.payment_status === "paid") {
            if (type === "course") {
              const courseId = successSession.metadata?.courseId;
              if (!courseId) {
                console.error("Course ID missing in session metadata");
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
            else if (type === "product") {
              const status = await updatePaymentStatus(
                successSession.metadata?.wishlistId as string,
                successSession.metadata?.itemId as string,
                {
                  stripe_payment_intent: payment_intent,
                  payment_status: "succeeded",
                  total_price_paid: price,
                  paid_by: userId,
                }
              );

              // Send email notification to admin
              try {
                await sendPaymentNotification({
                  paymentIntentId: payment_intent,
                  date: new Date(),
                  amount: (price ?? 0) / 100,
                  productName: successSession.metadata?.name as string,
                  projectManager: userId,
                });
                console.log("Email sent to admin");
              } catch (emailError) {
                console.error("Failed to send email:", emailError);
              }

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
      default:
        // Handle other event types if needed
        break;
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