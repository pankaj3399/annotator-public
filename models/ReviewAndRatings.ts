import mongoose, { Schema, model, models } from "mongoose";

const reviewAndRatingsSchema = new Schema(
  {
    // User who received the review and rating (reference to User model)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    // Array of all ratings received by this user
    ratings: [
      {
        // Rating value (1-5 stars)
        value: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        // User who gave the rating
        givenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        // When the rating was given
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    // Array of all reviews received by this user
    reviews: [
      {
        // Review text
        text: {
          type: String,
          required: true
        },
        // Optional title for the review
        title: {
          type: String,
          default: null
        },
        // User who gave the review
        givenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        // When the review was created
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    // Average of all ratings
    avgRating: {
      type: Number,
      default: 0
    },
    // Last time any rating or review was added/updated
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Method to calculate average rating
reviewAndRatingsSchema.methods.calculateAvgRating = function() {
  if (this.ratings.length === 0) {
    this.avgRating = 0;
    return;
  }
  
  const sum = this.ratings.reduce((total: number, rating: any) => total + rating.value, 0);
  this.avgRating = parseFloat((sum / this.ratings.length).toFixed(1));
};

// Static method to find or create a review document for a user
reviewAndRatingsSchema.statics.findOrCreateForUser = async function(
  userId: mongoose.Types.ObjectId | string
) {
  let userReviews = await this.findOne({ userId });
  
  if (!userReviews) {
    userReviews = new this({
      userId,
      ratings: [],
      reviews: [],
      avgRating: 0
    });
    await userReviews.save();
  }
  
  return userReviews;
};

export const ReviewAndRatings = models?.ReviewAndRatings || model("ReviewAndRatings", reviewAndRatingsSchema);