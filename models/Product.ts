// models/Product.ts - For admin-created products
import { Schema, model, models, CallbackError } from "mongoose";
import { Wishlist } from "./Wishlist";

export interface IProduct {
  name: string;
  description: string;
  price?: number;
  image_url?: string;
  admin: Schema.Types.ObjectId;
  created_at: Date;
}

const productSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: {
    type: Number,
    required: false,
    validate: {
      validator: function (value: number) {
        return (
          !value || (value >= 0 && /^\d+(\.\d{1,2})?$/.test(value.toString()))
        );
      },
      message:
        "If provided, price must be a positive number with at most 2 decimal places",
    },
  },
  image_url: { type: String, required: false },
  admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
  created_at: { type: Date, default: Date.now },
});

// Middleware to handle product deletion
productSchema.pre("findOneAndDelete", async function (next) {
  const productId = this.getFilter()._id;
  if (!productId) {
    return next(new Error("Product ID not found in filter."));
  }

  try {
    await Wishlist.updateMany(
      { "items.product": productId },
      { $pull: { items: { product: productId } } }
    );
    next();
  } catch (error) {
    console.error("Error deleting product:", error);
    next(error as CallbackError);
  }
});

export const Product = models?.Product || model("Product", productSchema);
