'use server';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import Course from '@/models/Courses';
import { Wishlist } from '@/models/Wishlist';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';

interface PaymentData {
  name: string;
  price: number;
}

// Define interfaces for better type safety
interface WishlistItem {
  _id: any;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  status: string;
  created_at: Date;
  is_external_request: boolean;
  catalog_details?: {
    product_id?: any;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    admin?: any;
  };
  request_details?: {
    name: string;
    description: string;
    product_url: string;
    submitted_by?: any;
  };
  payment_data?: {
    stripe_payment_intent?: string;
    payment_status: string;
    total_price_paid?: number;
    paid_at?: Date;
    paid_by?: any;
  };
}

interface WishlistDocument {
  _id: any;
  expert: {
    _id: any;
    name: string;
    email: string;
  };
  items: WishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export async function stripe(data: any) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.id) {
      return { error: 'You need to be logged in to make a payment' };
    }

    // Ensure data contains necessary information
    if (!data?.name || !data?.id || !data?.type) {
      return { error: 'Missing required data fields' };
    }

    await connectToDatabase();

    let course;
    let dbWishlist;
    if (data.type === 'course') {
      course = await Course.findById(data.id);
      if (!course) {
        return { error: 'Course not found' };
      }
      data.price = parseFloat(course.price);
    } else if (data.type === 'product') {
      dbWishlist = await Wishlist.findById(data.id);
      if (!dbWishlist) {
        return { error: 'Wishlist not found' };
      }

      // Fix: Convert data.itemId to string for comparison since MongoDB _id might be ObjectId
      const item = (dbWishlist.items || []).find(
        (it: any) => it._id.toString() === data.itemId.toString()
      );

      // Add error handling if item is not found
      if (!item) {
        return { error: 'Wishlist item not found' };
      }

      // Add additional checks for external requests
      if (item.is_external_request) {
        return { error: 'Cannot process payment for external requests' };
      }

      // Ensure catalog_details exists
      if (!item.catalog_details || !item.catalog_details.price) {
        return { error: 'Product price not available' };
      }

      data.price = parseFloat(item.catalog_details.price) || 0;
    }

    const metadata = {
      ...(data.type === 'product'
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

    // Updated Stripe API version
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });

    // Ensure base URL has proper format
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Validate that we have a proper URL
    if (!formattedBaseUrl.startsWith('http://') && !formattedBaseUrl.startsWith('https://')) {
      return { error: 'Invalid base URL configuration' };
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: data.name,
            },
            unit_amount: data.price * 100, // Stripe expects the amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url:
        data.type === 'product'
          ? `${formattedBaseUrl}/wishlist?payment=success`
          : `${formattedBaseUrl}/tasks/myCourses`,
      cancel_url:
        data.type === 'product'
          ? `${formattedBaseUrl}/wishlist?payment=cancelled`
          : `${formattedBaseUrl}/tasks/viewCourses?payment=cancelled`,
      metadata: metadata,
      payment_intent_data: {
        shipping: {
          name: 'John Doe',
          address: {
            line1: '123 Main St',
            city: 'San Francisco',
            state: 'California',
            postal_code: '94105',
            country: 'US',
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
    console.error('Error in stripe function:', error);
    return { error: 'An error occurred while processing the payment' };
  }
}

export async function getWishlists() {
  try {
    await connectToDatabase();

    // Populate expert field and return the data with explicit field selection
    const wishlists = await Wishlist.find()
      .populate({
        path: 'expert',
        select: 'name email _id', // Only select needed fields
      })
      .select('expert items createdAt updatedAt') // Only select needed fields from wishlist
      .lean(); // Use lean() to get plain JavaScript objects

    // Clean the data to avoid circular references
    const cleanWishlists = (wishlists as WishlistDocument[]).map((wishlist: WishlistDocument) => ({
      _id: wishlist._id.toString(),
      expert: {
        _id: wishlist.expert._id.toString(),
        name: wishlist.expert.name,
        email: wishlist.expert.email,
      },
      items: wishlist.items.map((item: WishlistItem) => ({
        _id: item._id.toString(),
        shipping_address: item.shipping_address,
        status: item.status,
        created_at: item.created_at,
        is_external_request: item.is_external_request,
        ...(item.catalog_details && {
          catalog_details: {
            product_id: item.catalog_details.product_id?.toString(),
            name: item.catalog_details.name,
            description: item.catalog_details.description,
            price: item.catalog_details.price,
            image_url: item.catalog_details.image_url,
            admin: item.catalog_details.admin?.toString(),
          }
        }),
        ...(item.request_details && {
          request_details: {
            name: item.request_details.name,
            description: item.request_details.description,
            product_url: item.request_details.product_url,
            submitted_by: item.request_details.submitted_by?.toString(),
          }
        }),
        ...(item.payment_data && {
          payment_data: {
            stripe_payment_intent: item.payment_data.stripe_payment_intent,
            payment_status: item.payment_data.payment_status,
            total_price_paid: item.payment_data.total_price_paid,
            paid_at: item.payment_data.paid_at,
            paid_by: item.payment_data.paid_by?.toString(),
          }
        }),
      })),
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    }));

    return cleanWishlists;
  } catch (e) {
    console.error('Error in getWishlists function:', e);
    throw new Error('Failed to fetch wishlists');
  }
}