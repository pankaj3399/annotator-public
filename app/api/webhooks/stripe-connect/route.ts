import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';
import { handlePaymentSucceeded } from '@/app/actions/stripe-connect';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
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

        // Process both regular Connect payments (transfer_data) and cross-border payments (on_behalf_of)
        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          console.log(`[Webhook] Skipping payment_intent.succeeded - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }

        // Determine payment type
        const paymentType = paymentIntent.transfer_data ? 'transfer_data' : 'on_behalf_of';
        const destination = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        console.log(`[Webhook] Connect payment succeeded details:
          Payment ID: ${paymentIntent.id}
          Type: ${paymentType}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${destination}
          Status: ${paymentIntent.status}
          Cross-border: ${paymentIntent.metadata?.crossBorder || 'false'}
          Metadata: ${JSON.stringify(paymentIntent.metadata)}`);

        // Update payment status in database first
        const updatedPayment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'succeeded' },
          { new: true }
        );

        if (updatedPayment) {
          console.log(`[Webhook] Updated payment record in database:
            Payment DB ID: ${updatedPayment._id}
            New Status: ${updatedPayment.status}
            Cross-border: ${updatedPayment.crossBorderPayment}
            Project Manager: ${updatedPayment.projectManager}
            Expert: ${updatedPayment.expert}
            Amount: ${updatedPayment.amount}`);

          // Handle cross-border payments (on_behalf_of) - create manual transfer
          if (paymentType === 'on_behalf_of' && updatedPayment.crossBorderPayment) {
            console.log(`[Webhook] Handling cross-border payment transfer for: ${paymentIntent.id}`);

            try {
              const transferResult = await handlePaymentSucceeded(paymentIntent.id);

              if (transferResult.error) {
                console.error(`[Webhook] Cross-border transfer failed: ${transferResult.error}`);
              } else {
                console.log(`[Webhook] Cross-border transfer successful: ${transferResult.transferId}`);
              }
            } catch (transferError: any) {
              console.error(`[Webhook] Error during cross-border transfer: ${transferError.message}`);
            }
          } else {
            console.log(`[Webhook] Regular transfer_data payment - no manual transfer needed`);
          }

        } else {
          console.error(`[Webhook] Could not find payment record for payment_intent.id: ${paymentIntent.id}`);
        }

        break;
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.processing: ${paymentIntent.id}`);

        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          console.log(`[Webhook] Skipping payment_intent.processing - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }

        const paymentType = paymentIntent.transfer_data ? 'transfer_data' : 'on_behalf_of';
        const destination = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        console.log(`[Webhook] Payment processing details:
          Payment ID: ${paymentIntent.id}
          Type: ${paymentType}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${destination}
          Payment Method Types: ${paymentIntent.payment_method_types.join(', ')}
          Cross-border: ${paymentIntent.metadata?.crossBorder || 'false'}
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

        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          console.log(`[Webhook] Skipping payment_intent.payment_failed - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }

        const paymentType = paymentIntent.transfer_data ? 'transfer_data' : 'on_behalf_of';
        const destination = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        console.log(`[Webhook] Payment failed details:
          Payment ID: ${paymentIntent.id}
          Type: ${paymentType}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${destination}
          Cross-border: ${paymentIntent.metadata?.crossBorder || 'false'}
          Last Payment Error: ${paymentIntent.last_payment_error ? JSON.stringify(paymentIntent.last_payment_error) : 'None'}`);

        const updatedPayment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          {
            status: 'failed',
            errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
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

        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          console.log(`[Webhook] Skipping payment_intent.requires_action - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }

        const paymentType = paymentIntent.transfer_data ? 'transfer_data' : 'on_behalf_of';
        const destination = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        console.log(`[Webhook] Payment requires action details:
          Payment ID: ${paymentIntent.id}
          Type: ${paymentType}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${destination}
          Cross-border: ${paymentIntent.metadata?.crossBorder || 'false'}
          Next Action: ${paymentIntent.next_action ? JSON.stringify(paymentIntent.next_action) : 'None'}
          Metadata: ${JSON.stringify(paymentIntent.metadata)}`);

        // Update status to requires_action for better tracking
        const updatedPayment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: 'requires_action' },
          { new: true }
        );

        if (updatedPayment) {
          console.log(`[Webhook] Updated payment status to 'requires_action' for DB ID: ${updatedPayment._id}`);
        }

        break;
      }

      // NEW: Handle transfer events for cross-border payments
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`[Webhook] Transfer created:
          Transfer ID: ${transfer.id}
          Amount: ${transfer.amount / 100} ${transfer.currency}
          Destination: ${transfer.destination}
          Source Transaction: ${transfer.source_transaction}
          Metadata: ${JSON.stringify(transfer.metadata)}`);

        // Update payment record with transfer ID if this is from our cross-border handling
        if (transfer.metadata?.paymentId) {
          const updatedPayment = await Payment.findOneAndUpdate(
            { _id: transfer.metadata.paymentId },
            {
              stripeTransferId: transfer.id,
              status: 'completed'
            },
            { new: true }
          );

          if (updatedPayment) {
            console.log(`[Webhook] Updated payment with transfer ID: ${transfer.id} for payment: ${transfer.metadata.paymentId}`);
          }
        }

        break;
      }

      case "transfer.updated": {
        const transfer = event.data.object as Stripe.Transfer;

        // Check if this is a failed transfer
        if (transfer.status === 'failed') {
          console.log(`[Webhook] Transfer failed:
            Transfer ID: ${transfer.id}
            Amount: ${transfer.amount / 100} ${transfer.currency}
            Destination: ${transfer.destination}
            Status: ${transfer.status}
            Metadata: ${JSON.stringify(transfer.metadata)}`);

          // Update payment record with failure info
          if (transfer.metadata?.paymentId) {
            const updatedPayment = await Payment.findOneAndUpdate(
              { _id: transfer.metadata.paymentId },
              {
                status: 'transfer_failed',
                errorMessage: 'Transfer failed',
                stripeTransferId: transfer.id
              },
              { new: true }
            );

            if (updatedPayment) {
              console.log(`[Webhook] Updated payment with failed transfer for payment: ${transfer.metadata.paymentId}`);
            }
          }
        } else {
          console.log(`[Webhook] Transfer updated: ${transfer.id}, Status: ${transfer.status}`);
        }

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
          console.log(`[Webhook] Capability updated for user: ${user._id}, capability: ${capability.id}, status: ${capability.status}`);
        } else {
          console.error(`[Webhook] No user found with stripeAccountId: ${accountId} for capability update`);
        }

        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Webhook] Charge succeeded: ${charge.id}`);

        if (!charge.transfer && !charge.on_behalf_of) {
          console.log(`[Webhook] Skipping charge.succeeded - not a Connect charge: ${charge.id}`);
          return NextResponse.json({ received: true });
        }

        const chargeType = charge.transfer ? 'transfer' : 'on_behalf_of';
        const destination = charge.transfer || charge.on_behalf_of;

        console.log(`[Webhook] Connect charge succeeded details:
          Charge ID: ${charge.id}
          Type: ${chargeType}
          Payment Intent: ${charge.payment_intent}
          Amount: ${charge.amount / 100} ${charge.currency}
          Destination: ${destination}
          Status: ${charge.status}
          Payment Method: ${charge.payment_method_details?.type || 'Unknown'}`);

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