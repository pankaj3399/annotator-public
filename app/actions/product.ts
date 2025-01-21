// app/actions/product.ts
"use server";

import { Product } from "@/models/Product";
import { Wishlist } from "@/models/Wishlist";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { authOptions } from "@/auth";
import { ProductRequest } from "@/models/ProductRequest";

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
        id: wishlist._id,
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
