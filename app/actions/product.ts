// app/actions/product.ts
"use server";

import { Product } from "@/models/Product";
import { Wishlist } from "@/models/Wishlist";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { authOptions } from "@/auth";
import { ProductRequest } from "@/models/ProductRequest";
import mongoose, { Types } from "mongoose";

export type AddToWishlistParams = {
  productId?: string;
  externalRequest?: {
    name: string;
    description: string;
    product_url: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

export async function addProduct(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "system admin") {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const product = await Product.create({
      name: formData.get("name"),
      description: formData.get("description"),
      price: parseFloat(formData.get("price") as string),
      image_url: formData.get("image_url"),
      admin: session.user.id,
    });

    revalidatePath("/admin/products");
    return { success: true, product };
  } catch (error) {
    console.error("Error adding product:", error);
    return { success: false, error: (error as Error).message };
  }
}
export async function addToWishlist({
  productId,
  externalRequest,
  address,
}: AddToWishlistParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "annotator") {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const wishlistItem = {
      shipping_address: address,
      status: "pending",
      created_at: new Date(),
    } as any;

    if (productId) {
      // Fetch product details from database
      const catalogProduct = await Product.findById(productId);
      if (!catalogProduct) {
        throw new Error("Product not found");
      }

      wishlistItem.is_external_request = false;
      wishlistItem.catalog_details = {
        product_id: catalogProduct._id,
        name: catalogProduct.name,
        description: catalogProduct.description,
        price: catalogProduct.price,
        image_url: catalogProduct.image_url,
        admin: catalogProduct.admin,
      };
    } else if (externalRequest) {
      wishlistItem.is_external_request = true;
      wishlistItem.request_details = {
        ...externalRequest,
        submitted_by: session.user.id,
      };
    } else {
      throw new Error("Either productId or externalRequest must be provided");
    }

    // Find or create wishlist
    const wishlist = await Wishlist.findOneAndUpdate(
      { expert: session.user.id },
      {
        $push: { items: wishlistItem },
      },
      {
        upsert: true,
        new: true,
        select: "user items",
      }
    );

    revalidatePath("/wishlist");

    return {
      success: true,
      wishlist: {
        id: (wishlist._id).toString(),
        itemsCount: wishlist.items.length,
      },
    };
  } catch (error) {
    console.error("Wishlist error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
export async function approveWishlistItem(wishlistId: string, itemId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "project manager") {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const wishlist = await Wishlist.findOneAndUpdate(
      {
        _id: wishlistId,
        "items._id": itemId,
      },
      {
        $set: {
          "items.$.status": "approved",
          "items.$.project_manager": session.user.id,
          "items.$.approved_at": new Date(),
        },
      },
      { new: true }
    );

    revalidatePath("/pm/wishlists");
    return { success: true, wishlist };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function fetchProducts() {
  await connectToDatabase();

  return Product.find().sort({ created_at: -1 }).lean();
}

export async function updateStatus(itemId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "project manager") {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();

    const product = await ProductRequest.findOneAndUpdate(
      { _id: itemId },
      {
        $set: {
          status: "approved",
        },
      },
      { new: true }
    );

    revalidatePath("/wishlist");
    return { success: true, product };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updatePaymentStatus(
  wishlistId: string,
  itemId: string,
  paymentDetails: {
    stripe_payment_intent: string;
    payment_status: "pending" | "succeeded" | "failed";
    total_price_paid: number | any;
    paid_by: string;
  }
) {
  try {
    console.log(`[updatePaymentStatus] Starting payment status update:
      - wishlistId: ${wishlistId}
      - itemId: ${itemId}
      - paymentDetails: ${JSON.stringify(paymentDetails)}`);

    await connectToDatabase();

    // First, let's verify the wishlist and item exist
    const existingWishlist = await Wishlist.findById(wishlistId);
    if (!existingWishlist) {
      console.error(`[updatePaymentStatus] Wishlist not found: ${wishlistId}`);
      throw new Error(`Wishlist not found with ID: ${wishlistId}`);
    }

    const existingItem = existingWishlist.items.find(
      (item: any) => item._id.toString() === itemId.toString()
    );
    if (!existingItem) {
      console.error(`[updatePaymentStatus] Item not found: ${itemId} in wishlist: ${wishlistId}`);
      console.log(`[updatePaymentStatus] Available items in wishlist: ${existingWishlist.items.map((item: any) => item._id.toString()).join(', ')}`);
      throw new Error(`Item not found with ID: ${itemId} in wishlist: ${wishlistId}`);
    }

    console.log(`[updatePaymentStatus] Found item to update:
      - Item ID: ${existingItem._id}
      - Current status: ${existingItem.status}
      - Is external request: ${existingItem.is_external_request}
      - Current payment status: ${existingItem.payment_data?.payment_status || 'none'}`);

    // Ensure wishlistId and itemId are proper ObjectIds for MongoDB query
    const wishlistObjectId = new mongoose.Types.ObjectId(wishlistId);
    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    console.log(`[updatePaymentStatus] Using ObjectIds:
      - wishlistObjectId: ${wishlistObjectId}
      - itemObjectId: ${itemObjectId}`);

    const updatedWishlist = await Wishlist.findOneAndUpdate(
      {
        _id: wishlistObjectId,
        "items._id": itemObjectId,
      },
      {
        $set: {
          "items.$.payment_data": {
            stripe_payment_intent: paymentDetails.stripe_payment_intent,
            payment_status: paymentDetails.payment_status,
            total_price_paid: paymentDetails.total_price_paid / 100, // Convert from cents
            paid_at: new Date(),
            paid_by: paymentDetails.paid_by,
          },
          "items.$.status":
            paymentDetails.payment_status === "succeeded"
              ? "succeeded"
              : "pending",
        },
      },
      { 
        new: true,
        runValidators: true // Ensure schema validation runs
      }
    );

    if (!updatedWishlist) {
      console.error(`[updatePaymentStatus] Failed to update wishlist - findOneAndUpdate returned null`);
      throw new Error("Failed to update wishlist - no matching document found");
    }

    console.log(`[updatePaymentStatus] Successfully updated wishlist`);

    // Find the updated item to return
    const updatedItem = updatedWishlist.items.find(
      (item: any) => item._id.toString() === itemId.toString()
    );

    if (updatedItem) {
      console.log(`[updatePaymentStatus] Updated item details:
        - Item ID: ${updatedItem._id}
        - New status: ${updatedItem.status}
        - Payment status: ${updatedItem.payment_data?.payment_status}
        - Amount paid: ${updatedItem.payment_data?.total_price_paid}
        - Paid at: ${updatedItem.payment_data?.paid_at}`);
    }

    // Revalidate the paths to update the UI
    revalidatePath("/wishlist");
    revalidatePath("/pm/wishlists");

    console.log(`[updatePaymentStatus] Payment status update completed successfully`);

    return {
      success: true,
      item: updatedItem,
      message: "Payment status updated successfully"
    };
  } catch (error) {
    console.error(`[updatePaymentStatus] Error updating payment status:`, error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function getPaidWishlistProducts(): Promise<any> {
  try {
    // Ensure the database is connected before running the query
    await connectToDatabase();

    // Aggregation pipeline to get the paid wishlist products
    const paidProducts = await Wishlist.aggregate([
      { 
        $unwind: "$items" // Unwind the "items" array to process individual item documents
      },
      { 
        $match: {
          "items.payment_data.payment_status": "succeeded",  // Only include items with a successful payment
          "items.is_external_request": false, // Only include non-external request items
        }
      },
      {
        $lookup: {
          from: "users",  // Lookup user details for the expert
          localField: "expert",
          foreignField: "_id",
          as: "user_details",
        },
      },
      {
        $lookup: {
          from: "users", // Lookup who paid for the item
          localField: "items.payment_data.paid_by",
          foreignField: "_id",
          as: "paid_by_details",
        },
      },
      {
        $unwind: {
          path: "$user_details",
          preserveNullAndEmptyArrays: true, // Allow user_details to be empty if no match found
        },
      },
      {
        $unwind: {
          path: "$paid_by_details",
          preserveNullAndEmptyArrays: true, // Allow paid_by_details to be empty if no match found
        },
      },
      {
        $project: { // Select the necessary fields for the response
          product_id: "$items.catalog_details.product_id",
          stripe_payment_intent: "$items.payment_data.stripe_payment_intent",
          name: "$items.catalog_details.name",
          description: "$items.catalog_details.description",
          price: "$items.catalog_details.price",
          image_url: "$items.catalog_details.image_url",
          payment_status: "$items.payment_data.payment_status",
          total_price_paid: "$items.payment_data.total_price_paid",
          paid_at: "$items.payment_data.paid_at",
          shipping_address: "$items.shipping_address",
          user_details: {
            userId: "$user_details._id",
            userName: "$user_details.name",
            email: "$user_details.email",
          },
          paid_by_details: {
            userId: "$paid_by_details._id",
            userName: "$paid_by_details.name",
            email: "$paid_by_details.email",
          },
        },
      },
    ]);

    return JSON.parse(JSON.stringify(paidProducts)); // Return the list of paid products
  } catch (error) {
    console.error("Error fetching paid wishlist products:", error);
    throw new Error("Failed to retrieve paid products"); // Handle any errors during the database query
  }
}
