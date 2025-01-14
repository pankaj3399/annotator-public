import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { enrollCourse } from "@/app/actions/course";
import { redirect } from "next/navigation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const successSession = event.data.object as Stripe.Checkout.Session;
      const courseId = successSession.metadata?.courseId;
      const price = successSession.amount_total;
      const customerEmail = successSession.customer_details?.email;
      const payment_intent = event.data.object.payment_intent;

      try {
        if (successSession.payment_status === "paid") {
          const status = await enrollCourse({
            courseId,
            customerEmail,
            payment_intent,
            price,
          });
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

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      const failureMessage =
        failedPayment.last_payment_error?.message || "Payment failed";
      return redirect(
        `/tasks/viewCourses?payment=${encodeURIComponent(failureMessage)}`
      );

    case "checkout.session.expired":
      return redirect("/tasks/viewCourses?payment=session_expired");

    case "payment_intent.canceled":
      return redirect("/tasks/viewCourses?payment=payment_canceled");

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
