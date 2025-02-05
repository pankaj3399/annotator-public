// models/ProductRequest.ts - For user-submitted product links
import { Schema, model, models } from "mongoose";

export interface IProductRequest {
  name: string;
  description: string;
  product_url: string;
  submitted_by: Schema.Types.ObjectId;
  created_at: Date;
  status: "pending" | "approved" | "rejected";
}

const productRequestSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  product_url: {
    type: String,
    required: true,
    validate: {
      validator: function (value: string) {
        return /^https?:\/\/.+/.test(value);
      },
      message: "Product URL must be a valid HTTP/HTTPS URL",
    },
  },
  submitted_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  created_at: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

export const ProductRequest =
  models?.ProductRequest || model("ProductRequest", productRequestSchema);
