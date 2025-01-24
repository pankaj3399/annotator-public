// models/Wishlist.ts
import { Schema, model, models } from "mongoose";

const wishlistSchema = new Schema(
  {
    expert: {
      // Changed from expert to user
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        // Common fields for both types
        shipping_address: {
          street: { type: String, required: true },
          city: { type: String, required: true },
          state: { type: String, required: true },
          postal_code: { type: String, required: true },
          country: { type: String, required: true },
        },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected", "purchased"],
          default: "pending",
        },
        created_at: { type: Date, default: Date.now },

        // Flag to determine type of item
        is_external_request: {
          type: Boolean,
          required: true,
        },

        // Fields for catalog products
        catalog_details: {
          type: {
            product_id: Schema.Types.ObjectId, // Reference to original product
            name: String,
            description: String,
            price: Number,
            image_url: String,
            admin: Schema.Types.ObjectId,
          },
          required: function (this: any) {
            return !this.is_external_request;
          },
        },

        // Fields for external requests
        request_details: {
          type: {
            name: String,
            description: String,
            product_url: String,
            submitted_by: Schema.Types.ObjectId,
          },
          required: function (this: any) {
            return this.is_external_request;
          },
        },

        payment_data: {
          stripe_payment_intent: { type: String },
          payment_status: {
            type: String,
            enum: ["not_paid", "pending", "succeeded", "failed"],
            default: "not_paid",
          },
          total_price_paid: { type: Number },
          paid_at: { type: Date },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Wishlist = models?.Wishlist || model("Wishlist", wishlistSchema);
