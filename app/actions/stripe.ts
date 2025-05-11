"use server";
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Wishlist } from "@/models/Wishlist";
import Course from "@/models/Courses"; // Using the path from your snippet: @/models/Courses
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

// Your original interface
interface PaymentData {
  name: string;
  price: number;
}

// Minimal interfaces for type hinting with .lean()
interface LeanCourse {
    _id: mongoose.Types.ObjectId | string;
    price: number;
    name: string;
    // Add other fields if Course model has more and they are selected
}

interface LeanWishlistItemCatalogDetails {
    product_id: mongoose.Types.ObjectId | string;
    // other catalog details fields if present
}

interface LeanWishlistItem {
    _id: mongoose.Types.ObjectId | string;
    catalog_details?: LeanWishlistItemCatalogDetails;
    // other wishlist item fields if present
}

interface LeanWishlist {
    _id: mongoose.Types.ObjectId | string;
    items?: LeanWishlistItem[];
    // other wishlist fields if present
}


export async function stripe(data: any) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.id) {
      return { error: "You need to be logged in to make a payment" };
    }

    // Original validation: We still need identifiers.
    // Client-provided name/price in `data` will be ignored for Stripe charge.
    if (!data?.id || !data?.type) { // Removed data.name and data.price from this check
      return { error: "Missing required identifier fields (id, type)" };
    }
    if (data.type === "product" && !data.itemId) {
        return { error: "Missing itemId for product payment." };
    }


    // --- MINIMAL ADDITION FOR SERVER-SIDE PRICE FETCHING ---
    await connectToDatabase();
    let authoritativePrice: number; // Will throw error if not set
    let authoritativeName: string;  // Will throw error if not set
    let courseIdToUseForStripeMetadata: string | null = null;

    if (data.type === "product") {
        if (!mongoose.Types.ObjectId.isValid(data.id) || !mongoose.Types.ObjectId.isValid(data.itemId)) {
            return { error: "Invalid wishlist or item identifier." };
        }
        // Explicitly select only necessary fields for this operation
        const wishlist = await Wishlist.findById(data.id)
            .select("items._id items.catalog_details.product_id")
            .lean() as LeanWishlist | null; // Type assertion

        const wishlistItem = wishlist?.items?.find(
            (item: LeanWishlistItem) => item._id.toString() === data.itemId.toString()
        );

        if (!wishlistItem?.catalog_details?.product_id) {
            return { error: "Product ID not found in wishlist item." };
        }
        const courseIdFromWishlist = wishlistItem.catalog_details.product_id.toString();
        if (!mongoose.Types.ObjectId.isValid(courseIdFromWishlist)) {
            return { error: "Invalid Course ID found in wishlist." };
        }
        courseIdToUseForStripeMetadata = courseIdFromWishlist;
        const course = await Course.findById(courseIdFromWishlist).select("price name").lean() as LeanCourse | null; // Type assertion
        if (!course || typeof course.price !== 'number' || !course.name) {
            return { error: "Course details not found or invalid in database." };
        }
        authoritativePrice = course.price;
        authoritativeName = course.name;
    } else if (data.type === "course") {
        if (!mongoose.Types.ObjectId.isValid(data.id)) {
            return { error: "Invalid Course ID for direct purchase." };
        }
        courseIdToUseForStripeMetadata = data.id.toString();
        const course = await Course.findById(data.id).select("price name").lean() as LeanCourse | null; // Type assertion
        if (!course || typeof course.price !== 'number' || !course.name) {
            return { error: "Course details not found or invalid in database." };
        }
        authoritativePrice = course.price;
        authoritativeName = course.name;
    } else {
        return { error: "Invalid payment type." };
    }
    // --- END OF MINIMAL ADDITION ---


    // Metadata uses client-provided `data.name` for "product" or `authoritativeName` for "course"
    // but the Stripe charge will use `authoritativeName`.
    // For product metadata, it's often useful to record the actual courseId.
    const metadata: Record<string, string> = { // Stripe metadata values must be strings (or numbers converted to strings)
        userId: authSession.user.id,
        type: data.type,
    };

    if (data.type === "product") {
        metadata.wishlistId = data.id.toString();
        metadata.itemId = data.itemId.toString();
        metadata.name = data.name || authoritativeName; // Use client name for metadata if provided, else fallback
        if (courseIdToUseForStripeMetadata) {
            metadata.actualCourseId = courseIdToUseForStripeMetadata;
        }
    } else { // type === "course"
        metadata.courseId = data.id.toString();
        metadata.name = authoritativeName; // For direct course, metadata name is authoritative
    }


    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia", // Your original apiVersion
    });

    const session = await stripeInstance.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: authoritativeName, // <<< CRITICAL: Use authoritative name from DB
            },
            unit_amount: Math.round(authoritativePrice * 100), // <<< CRITICAL: Use authoritative price from DB
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: // Original URLs
        data.type === "product"
          ? `${process.env.NEXTAUTH_URL}wishlist?payment=success`
          : `${process.env.NEXTAUTH_URL}tasks/myCourses`,
      cancel_url:
        data.type === "product"
          ? `${process.env.NEXTAUTH_URL}wishlist?payment=cancelled`
          : `${process.env.NEXTAUTH_URL}tasks/viewCourses?payment=cancelled`,
      metadata: metadata,
      customer_email: authSession.user.email || undefined, // Can be undefined if not available
      payment_intent_data: { // Original shipping
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
  } catch (error: any) {
    console.error("Error in stripe function:", error.message, error.stack);
    return { error: "An error occurred while processing the payment. Please try again." };
  }
}

export async function getWishlists() { // Original getWishlists
  try {
    await connectToDatabase();
    const wishlists = await Wishlist.find().populate({
      path: "expert",
      select: "name email",
    }).lean(); // Added .lean() for potential minor perf gain

    return JSON.parse(JSON.stringify(wishlists));
  } catch (e: any) {
    console.error("Error in getWishlists function:", e.message, e.stack);
    // throw new Error("Failed to fetch wishlists"); // Original behavior
    return { error: "Failed to fetch wishlists", details: e.message }; // Alternative error return
  }
}