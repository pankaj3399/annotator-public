import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const connectEndpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = headers();
    const sig = headersList.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "No signature found" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, connectEndpointSecret);
    } catch (err: any) {
      console.error("Connect webhook signature verification failed:", err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    await connectToDatabase();

    // Handle Connect-specific events
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Only process if this is a Connect payment (has transfer_data)
        if (paymentIntent.transfer_data && paymentIntent.transfer_data.destination) {
          // Update payment status in your database
          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntent.id },
            { status: 'succeeded' }
          );

          console.log(`Payment succeeded: ${paymentIntent.id}`);
        }
        break;
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (paymentIntent.transfer_data && paymentIntent.transfer_data.destination) {
          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntent.id },
            { status: 'processing' }
          );

          console.log(`Payment processing: ${paymentIntent.id}`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (paymentIntent.transfer_data && paymentIntent.transfer_data.destination) {
          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntent.id },
            { status: 'failed' }
          );

          console.log(`Payment failed: ${paymentIntent.id}`);
        }
        break;
      }

      case "payment_intent.requires_action": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // No status update needed, just log for monitoring
        console.log(`Payment requires action: ${paymentIntent.id}`);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Find user with this Stripe account ID
        const user = await User.findOne({ stripeAccountId: account.id });

        if (user) {
          let status = 'incomplete';

          if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
            status = 'active';
            user.stripeOnboardingComplete = true;
          } else if (account.details_submitted) {
            status = 'pending';
          }

          user.stripeAccountStatus = status;
          await user.save();

          console.log(`Updated account status for user ${user._id}: ${status}`);
        }
        break;
      }

      case "capability.updated": {
        const capability = event.data.object as Stripe.Capability;

        // Log capability updates for debugging
        console.log(`Capability updated: ${capability.id}, Status: ${capability.status}`);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Find user with this Stripe account ID
        const user = await User.findOne({ stripeAccountId: account.id });

        if (user) {
          let status = 'incomplete';

          if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
            status = 'active';
            user.stripeOnboardingComplete = true;
          } else if (account.details_submitted) {
            status = 'pending';
          }

          user.stripeAccountStatus = status;
          await user.save();

          console.log(`Updated account status for user ${user._id}: ${status}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Connect webhook handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}