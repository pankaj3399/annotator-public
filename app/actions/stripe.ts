"use server";
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Wishlist } from "@/models/Wishlist";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

interface PaymentData {
  name: string;
  price: number;
}

export async function stripe(data: any) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.id) {
      return { error: "You need to be logged in to make a payment" };
    }

    // Ensure data contains necessary information
    if (!data?.name || !data?.price || !data?.id || !data?.type) {
      return { error: "Missing required data fields" };
    }

    const metadata = {
      ...(data.type === "product"
        ? {
            wishlistId: data.id,
            itemId: data.itemId,
            name: data.name,
            userId: authSession?.user?.id,
            type: data.type,
          }
        : {
            courseId: data.id,
            userId: authSession?.user?.id,
            type: data.type,
          }),
    };

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: data.name,
            },
            unit_amount: data.price * 100, // Stripe expects the amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        data.type === "product"
          ? `${process.env.NEXTAUTH_URL}wishlist?payment=success`
          : `${process.env.NEXTAUTH_URL}tasks/myCourses`,
      cancel_url:
        data.type === "product"
          ? `${process.env.NEXTAUTH_URL}wishlist?payment=cancelled`
          : `${process.env.NEXTAUTH_URL}tasks/viewCourses?payment=cancelled`,
      metadata: metadata,
      payment_intent_data: {
        shipping: {
          name: "Rahul Sharma",
          address: {
            line1: "123 MG Road, Koramangala",
            city: "Bangalore",
            state: "Karnataka",
            postal_code: "560034",
            country: "IN",
          },
        },
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
      success: true,
    };
  } catch (error) {
    console.error("Error in stripe function:", error);
    return { error: "An error occurred while processing the payment" };
  }
}

export async function getWishlists() {
  try {
    await connectToDatabase();

    // Populate expert field and return the data
    const wishlists = await Wishlist.find().populate({
      path: "expert",
      select: "name email",
    });

    return JSON.parse(JSON.stringify(wishlists));
  } catch (e) {
    console.error("Error in getWishlists function:", e);
    throw new Error("Failed to fetch wishlists");
  }
}