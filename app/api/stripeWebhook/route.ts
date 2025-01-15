import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { enrollCourse } from "@/app/actions/course";
import { headers } from "next/headers";

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
        const courseId = successSession.metadata?.courseId;
        const price = successSession.amount_total;
        const userId = successSession.metadata?.userEmail;
        const payment_intent = successSession.payment_intent as string;

        if (!courseId || !userId) {
          throw new Error("Missing required session data");
        }

        console.log({ courseId, userId, payment_intent, price });

        try {
          if (successSession.payment_status === "paid" ) {
            const status = await enrollCourse({
              courseId,
              userId,
              payment_intent,
              price,
            });

            console.log("Enrollment status:", status);
            return NextResponse.json({ received: true, status });
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

      case "payment_intent.payment_failed": {
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const failureMessage =
          failedPayment.last_payment_error?.message || "Payment failed";

        // Return error response instead of redirect
        return NextResponse.json({
          received: true,
          status: "failed",
          message: failureMessage,
        });
      }

      case "checkout.session.expired": {
        return NextResponse.json({
          received: true,
          status: "expired",
          message: "Session expired",
        });
      }

      case "payment_intent.canceled": {
        return NextResponse.json({
          received: true,
          status: "canceled",
          message: "Payment canceled",
        });
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true });
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
