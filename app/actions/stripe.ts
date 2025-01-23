"use server";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

interface PaymentData {
  name: string;
  //   feature: string;
  price: number;
  //   bookingId: string;
}

export async function stripe(data: any) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return { error: "You need to be logged in to make a payment" };
  }

  const metadata = {
    ...(data.type === "product"
      ? {
          wishlistId: data.id,
          itemId: data.itemId,
          name: data.name,
          userEmail: authSession?.user?.id,
          type: data.type,
        }
      : {
          courseId: data.id,
          userEmail: authSession?.user?.id,
          type: data.type,
        }),
  };

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
  });

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: data.name,
            // description: `${data.feature} service for ${data.name}`,
          },
          unit_amount: data.price * 100, // Stripe expects the amount in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url:
      data.type == "product"
        ? `${process.env.NEXTAUTH_URL}/wishlist?payment=success`
        : `${process.env.NEXTAUTH_URL}/tasks/myCourses`,
    cancel_url:
      data.type == "product"
        ? `${process.env.NEXTAUTH_URL}/wishlist?payment=cancelled`
        : `${process.env.NEXTAUTH_URL}/tasks/viewCourses?payment=cancelled`,
    metadata: metadata,
    payment_intent_data: {
      shipping: {
        name: "Rahul Sharma",
        address: {
          line1: "123 MG Road, Koramangala",
          city: "Bangalore",
          state: "Karnataka",
          postal_code: "560034",
          country: "IN", // Use "IN" as the country code for India
        },
      },
    },
  });

  return {
    url: session.url,
    sessionId: session.id,
    success: true,
  };
}
