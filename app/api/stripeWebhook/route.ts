import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { enrollCourse } from "@/app/actions/course";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

console.log("endpointSecret", endpointSecret);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") as string;

  console.log("init")

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
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const courseId = session.metadata?.courseId;
    const price = session.amount_total;
    const customerEmail = session.customer_details?.email;

    console.log(session)

    console.log("Course ID:", courseId, price, customerEmail);

    let response;

    try {
      if (session.payment_status === "paid") {
        const status = await enrollCourse({ courseId, customerEmail });
        console.log("Enrollment status:", status);
        response = status
    }
    return NextResponse.json({ received: true, status: response });
    } catch (error) {
      console.error("Error saving payment details:", error);
      return NextResponse.json(
        { error: "Failed to save payment details" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
