// app/api/expert-reviews/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ReviewAndRatings } from '@/models/ReviewAndRatings';

export const dynamic = 'force-dynamic';

// Interface for rating and review data
interface RatingData {
  value: number;
  givenBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface ReviewData {
  id: string;
  text: string;
  title: string | null;
  givenBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

// Define interfaces for request body types
interface ReviewRequestBody {
  rating?: number;
  review?: string;
  title?: string | null;
}

// GET review data for a specific user
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('GET Request - Params:', params);

    // Check authentication
    const session = await getServerSession();
    
    if (!session) {
      console.log('GET Request - No session, authentication failed');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('GET Request - Invalid user ID:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();
    console.log('GET Request - Database connected');

    // Get the current user
    const currentUser = await User.findOne({ email: session.user?.email });

    if (!currentUser) {
      console.log('GET Request - Current user not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the user for whom reviews are being requested exists
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      console.log('GET Request - Target user not found:', userId);
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Get reviews document for the user
    let reviewDoc = await ReviewAndRatings.findOne({ userId });
    
    if (!reviewDoc) {
      console.log('GET Request - No reviews found for user:', userId);
      return NextResponse.json({
        success: true,
        data: {
          ratings: [],
          reviews: [],
          avgRating: 0
        }
      });
    }

    // Populate givenBy user data
    await reviewDoc.populate('ratings.givenBy', 'name email role');
    await reviewDoc.populate('reviews.givenBy', 'name email role');

    // Format the data for the client
    const formattedReviews: ReviewData[] = reviewDoc.reviews.map((review: any) => ({
      id: review._id,
      text: review.text,
      title: review.title,
      givenBy: {
        id: review.givenBy._id,
        name: review.givenBy.name,
        email: review.givenBy.email
      },
      createdAt: review.createdAt
    }));

    const formattedRatings: RatingData[] = reviewDoc.ratings.map((rating: any) => ({
      value: rating.value,
      givenBy: {
        id: rating.givenBy._id,
        name: rating.givenBy.name,
        email: rating.givenBy.email
      },
      createdAt: rating.createdAt
    }));

    console.log('GET Request - Formatted Reviews:', formattedReviews);
    console.log('GET Request - Formatted Ratings:', formattedRatings);

    // Return in the same format as POST for consistency
    return NextResponse.json({
      success: true,
      data: {
        ratings: formattedRatings,
        reviews: formattedReviews,
        avgRating: reviewDoc.avgRating
      }
    });
    
  } catch (error: any) {
    console.error('GET Request - Error fetching reviews:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch reviews',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// POST function with always adding new ratings/reviews
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('POST Request - Params:', params);

    // Check authentication
    const session = await getServerSession();
    
    if (!session) {
      console.log('POST Request - No session, authentication failed');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('POST Request - Invalid user ID:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Parse the request body with proper typing
    const body = await req.json();
    const { rating, review, title } = body as ReviewRequestBody;

    console.log('POST Request - Request Body:', { rating, review, title });

    // Validate input
    if (rating === undefined && !review) {
      console.log('POST Request - No rating or review provided');
      return NextResponse.json(
        { error: 'Either a rating or review is required' },
        { status: 400 }
      );
    }

    if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      console.log('POST Request - Invalid rating:', rating);
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();
    console.log('POST Request - Database connected');

    // Get the current user
    const currentUser = await User.findOne({ email: session.user?.email });

    if (!currentUser) {
      console.log('POST Request - Current user not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify target user exists
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      console.log('POST Request - Target user not found:', userId);
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Prevent users from rating themselves
    if (currentUser._id.toString() === userId) {
      console.log('POST Request - User trying to rate themselves');
      return NextResponse.json(
        { error: 'You cannot rate or review yourself' },
        { status: 400 }
      );
    }

    // Find or create the reviews document
    let reviewDoc = await ReviewAndRatings.findOneAndUpdate(
      { userId },
      { $setOnInsert: { ratings: [], reviews: [], avgRating: 0 } },
      { new: true, upsert: true }
    );

    console.log('POST Request - Review document before update:', reviewDoc);

    // Always add new rating if provided
    if (rating !== undefined) {
      reviewDoc.ratings.push({
        value: rating,
        givenBy: currentUser._id,
        createdAt: new Date()
      });
      console.log('POST Request - Added new rating');
      reviewDoc.calculateAvgRating();
    }

    // Always add new review if provided
    if (review) {
      reviewDoc.reviews.push({
        text: review,
        title: title || null,
        givenBy: currentUser._id,
        createdAt: new Date()
      });
      console.log('POST Request - Added new review');
    }

    // Update last updated timestamp
    reviewDoc.lastUpdated = new Date();

    // Save the document
    await reviewDoc.save();
    console.log('POST Request - Document saved');

    // Get the updated document with populated user data
    reviewDoc = await ReviewAndRatings.findById(reviewDoc._id);
    
    if (!reviewDoc) {
      console.log('POST Request - Failed to retrieve updated document');
      throw new Error("Failed to retrieve updated document");
    }
    
    await reviewDoc.populate('ratings.givenBy', 'name email role');
    await reviewDoc.populate('reviews.givenBy', 'name email role');

    // Format the response data
    const formattedReviews: ReviewData[] = reviewDoc.reviews.map((review: any) => ({
      id: review._id,
      text: review.text,
      title: review.title,
      givenBy: {
        id: review.givenBy._id,
        name: review.givenBy.name,
        email: review.givenBy.email
      },
      createdAt: review.createdAt
    }));

    const formattedRatings: RatingData[] = reviewDoc.ratings.map((rating: any) => ({
      value: rating.value,
      givenBy: {
        id: rating.givenBy._id,
        name: rating.givenBy.name,
        email: rating.givenBy.email
      },
      createdAt: rating.createdAt
    }));

    console.log('POST Request - Formatted Reviews:', formattedReviews);
    console.log('POST Request - Formatted Ratings:', formattedRatings);

    return NextResponse.json({
      success: true,
      message: 'Review and rating added successfully',
      data: {
        ratings: formattedRatings,
        reviews: formattedReviews,
        avgRating: reviewDoc.avgRating
      }
    });
    
  } catch (error: any) {
    console.error('POST Request - Error adding review:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add review',
        message: error.message 
      },
      { status: 500 }
    );
  }
}