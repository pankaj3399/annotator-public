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
    console.log("[Webhook] Received Stripe Connect webhook request");
    const body = await req.text();
    const headersList = headers();
    const sig = headersList.get("stripe-signature");

    if (!sig) {
      console.error("[Webhook] No Stripe signature found in request headers");
      return NextResponse.json({ error: "No signature found" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, connectEndpointSecret);
      console.log(`[Webhook] Successfully verified webhook signature for event: ${event.id}, type: ${event.type}`);
    } catch (err: any) {
      console.error(`[Webhook] Signature verification failed: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    await connectToDatabase();
    console.log(`[Webhook] Connected to database, processing event: ${event.type}`);

    // Handle Connect-specific events
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);
        
        // Only process if this is a Connect payment (has transfer_data)
        if (!paymentIntent.transfer_data || !paymentIntent.transfer_data.destination) {
          console.log(`[Webhook] Skipping payment_intent.succeeded - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }
        
        // Log the payment details
        console.log(`[Webhook] Connect payment succeeded details:
          Payment ID: ${paymentIntent.id}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${paymentIntent.transfer_data.destination}
          Status: ${paymentIntent.status}
          Metadata: ${JSON.stringify(paymentIntent.metadata)}`);
        
        // Update payment status in your database
        const updatedPayment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'succeeded' },
          { new: true }
        );
        
        if (updatedPayment) {
          console.log(`[Webhook] Updated payment record in database:
            Payment DB ID: ${updatedPayment._id}
            New Status: ${updatedPayment.status}
            Project Manager: ${updatedPayment.projectManager}
            Expert: ${updatedPayment.expert}
            Amount: ${updatedPayment.amount}`);
        } else {
          console.error(`[Webhook] Could not find payment record for payment_intent.id: ${paymentIntent.id}`);
        }
        
        break;
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.processing: ${paymentIntent.id}`);
        
        // Only process if this is a Connect payment (has transfer_data)
        if (!paymentIntent.transfer_data || !paymentIntent.transfer_data.destination) {
          console.log(`[Webhook] Skipping payment_intent.processing - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }
        
        console.log(`[Webhook] Payment processing details:
          Payment ID: ${paymentIntent.id}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${paymentIntent.transfer_data.destination}
          Payment Method Types: ${paymentIntent.payment_method_types.join(', ')}
          Metadata: ${JSON.stringify(paymentIntent.metadata)}`);
        
        const updatedPayment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'processing' },
          { new: true }
        );
        
        if (updatedPayment) {
          console.log(`[Webhook] Updated payment status to 'processing' for DB ID: ${updatedPayment._id}`);
        } else {
          console.error(`[Webhook] Could not find payment record for payment_intent.id: ${paymentIntent.id}`);
        }
        
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.payment_failed: ${paymentIntent.id}`);
        
        // Only process if this is a Connect payment (has transfer_data)
        if (!paymentIntent.transfer_data || !paymentIntent.transfer_data.destination) {
          console.log(`[Webhook] Skipping payment_intent.payment_failed - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }
        
        // Log failure details
        console.log(`[Webhook] Payment failed details:
          Payment ID: ${paymentIntent.id}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${paymentIntent.transfer_data.destination}
          Last Payment Error: ${paymentIntent.last_payment_error ? JSON.stringify(paymentIntent.last_payment_error) : 'None'}`);
        
        const updatedPayment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { 
            status: 'failed',
            updated_at: new Date()
          },
          { new: true }
        );
        
        if (updatedPayment) {
          console.log(`[Webhook] Updated payment status to 'failed' for DB ID: ${updatedPayment._id}`);
        } else {
          console.error(`[Webhook] Could not find payment record for payment_intent.id: ${paymentIntent.id}`);
        }
        
        break;
      }

      case "payment_intent.requires_action": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.requires_action: ${paymentIntent.id}`);
        
        // Only process if this is a Connect payment (has transfer_data)
        if (!paymentIntent.transfer_data || !paymentIntent.transfer_data.destination) {
          console.log(`[Webhook] Skipping payment_intent.requires_action - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }
        
        // Log the details of what action is required
        console.log(`[Webhook] Payment requires action details:
          Payment ID: ${paymentIntent.id}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${paymentIntent.transfer_data.destination}
          Next Action: ${paymentIntent.next_action ? JSON.stringify(paymentIntent.next_action) : 'None'}
          Metadata: ${JSON.stringify(paymentIntent.metadata)}`);
        
        // No status update needed in database, just log for monitoring
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log(`[Webhook] Processing account.updated: ${account.id}`);
        
        // Find user with this Stripe account ID
        const user = await User.findOne({ stripeAccountId: account.id });
        
        if (!user) {
          console.error(`[Webhook] No user found with stripeAccountId: ${account.id}`);
          break;
        }
        
        let status = 'incomplete';
        
        // Log detailed account status
        console.log(`[Webhook] Account updated details:
          Account ID: ${account.id}
          Details Submitted: ${account.details_submitted}
          Charges Enabled: ${account.charges_enabled}
          Payouts Enabled: ${account.payouts_enabled}
          Requirements: ${JSON.stringify(account.requirements)}
          User ID: ${user._id}
          Current Status: ${user.stripeAccountStatus}`);

        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          status = 'active';
          user.stripeOnboardingComplete = true;
          console.log(`[Webhook] Account fully active for user ${user._id}`);
        } else if (account.details_submitted) {
          status = 'pending';
          console.log(`[Webhook] Account pending for user ${user._id} - details submitted but capabilities not fully enabled`);
        } else {
          console.log(`[Webhook] Account incomplete for user ${user._id} - details not submitted`);
        }

        // Only update if status has changed
        if (user.stripeAccountStatus !== status) {
          console.log(`[Webhook] Updating account status from '${user.stripeAccountStatus}' to '${status}' for user ${user._id}`);
          user.stripeAccountStatus = status;
          await user.save();
          console.log(`[Webhook] Successfully updated account status for user ${user._id}`);
        } else {
          console.log(`[Webhook] No status change needed for user ${user._id}, current status: ${status}`);
        }
        
        break;
      }

      case "capability.updated": {
        const capability = event.data.object as Stripe.Capability;
        const accountId = capability.account;
        
        console.log(`[Webhook] Capability updated:
          Account ID: ${accountId}
          Capability ID: ${capability.id}
          Capability Type: ${capability.object}
          Status: ${capability.status}
          Requirements: ${JSON.stringify(capability.requirements)}`);
        
        // Find the user with this account
        const user = await User.findOne({ stripeAccountId: accountId });
        
        if (user) {
          console.log(`[Webhook] Capability updated for user: ${user._id}, capability: ${capability.id}`);
        } else {
          console.error(`[Webhook] No user found with stripeAccountId: ${accountId} for capability update`);
        }
        
        break;
      }
      
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge succeeded: ${charge.id}`);
        
        if (!charge.transfer) {
          console.log(`[Webhook] Skipping charge.succeeded - not a Connect charge (no transfer): ${charge.id}`);
          return NextResponse.json({ received: true });
        }
        
        console.log(`[Webhook] Connect charge succeeded details:
          Charge ID: ${charge.id}
          Payment Intent: ${charge.payment_intent}
          Amount: ${charge.amount / 100} ${charge.currency}
          Transfer: ${charge.transfer}
          Status: ${charge.status}
          Payment Method: ${charge.payment_method_details?.type || 'Unknown'}`);
        
        break;
      }
      
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`[Webhook] Transfer created:
          Transfer ID: ${transfer.id}
          Amount: ${transfer.amount / 100} ${transfer.currency}
          Destination: ${transfer.destination}
          Source Transaction: ${transfer.source_transaction}
          Metadata: ${JSON.stringify(transfer.metadata)}`);
        
        break;
      }
      
      case "payout.created":
      case "payout.updated":
      case "payout.paid":
      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log(`[Webhook] Payout ${event.type.split('.')[1]}: 
          Payout ID: ${payout.id}
          Amount: ${payout.amount / 100} ${payout.currency}
          Destination: ${payout.destination}
          Status: ${payout.status}
          Arrival Date: ${new Date(payout.arrival_date * 1000).toISOString()}
          Metadata: ${JSON.stringify(payout.metadata)}`);
        
        break;
      }

      default: {
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    }

    console.log(`[Webhook] Successfully processed event: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing webhook: ${error.message}`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}