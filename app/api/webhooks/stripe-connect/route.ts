import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectToDatabase, executeWithRetry } from '@/lib/db'; // Use your existing functions
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';
import { handlePaymentSucceeded } from '@/app/actions/stripe-connect';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const connectEndpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

// Helper function to update payment by PaymentIntent ID with timeout
const updatePaymentByIntentId = async (paymentIntentId: string, updateData: any) => {
  return await Payment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId },
    { ...updateData, updated_at: new Date() },
    { 
      new: true, 
      maxTimeMS: 5000 // 5 second timeout for this operation
    }
  );
};

export async function POST(req: Request) {
  const startTime = Date.now();
  
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

    // Use your existing database connection
    await connectToDatabase();
    console.log(`[Webhook] Connected to database, processing event: ${event.type}`);

    // Handle Connect-specific events
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);

        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          console.log(`[Webhook] Skipping payment_intent.succeeded - not a Connect payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }

        const paymentType = paymentIntent.transfer_data ? 'transfer_data' : 'on_behalf_of';
        const destination = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        console.log(`[Webhook] Connect payment succeeded details:
          Payment ID: ${paymentIntent.id}
          Type: ${paymentType}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Destination: ${destination}
          Cross-border: ${paymentIntent.metadata?.crossBorder || 'false'}`);

        // Update payment status with retry logic
        const updatedPayment = await executeWithRetry(async () => {
          return await updatePaymentByIntentId(paymentIntent.id, { status: 'succeeded' });
        });

        if (updatedPayment) {
          console.log(`[Webhook] Updated payment record: ${updatedPayment._id}, Status: ${updatedPayment.status}`);

          // Handle cross-border payments
          if (paymentType === 'on_behalf_of' && updatedPayment.crossBorderPayment) {
            console.log(`[Webhook] Handling cross-border payment transfer for: ${paymentIntent.id}`);

            try {
              const transferResult = await Promise.race([
                handlePaymentSucceeded(paymentIntent.id),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Transfer operation timeout')), 8000)
                )
              ]) as any;

              if (transferResult.error) {
                console.error(`[Webhook] Cross-border transfer failed: ${transferResult.error}`);
                
                await executeWithRetry(async () => {
                  return await updatePaymentByIntentId(paymentIntent.id, { 
                    status: 'transfer_failed',
                    errorMessage: transferResult.error
                  });
                });
              } else {
                console.log(`[Webhook] Cross-border transfer successful: ${transferResult.transferId}`);
              }
            } catch (transferError: any) {
              console.error(`[Webhook] Error during cross-border transfer: ${transferError.message}`);
              
              await executeWithRetry(async () => {
                return await updatePaymentByIntentId(paymentIntent.id, { 
                  status: 'transfer_failed',
                  errorMessage: transferError.message
                });
              });
            }
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
          return NextResponse.json({ received: true });
        }

        await executeWithRetry(async () => {
          return await updatePaymentByIntentId(paymentIntent.id, { status: 'processing' });
        });

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Webhook] Processing payment_intent.payment_failed: ${paymentIntent.id}`);

        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          return NextResponse.json({ received: true });
        }

        await executeWithRetry(async () => {
          return await updatePaymentByIntentId(paymentIntent.id, {
            status: 'failed',
            errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed'
          });
        });

        break;
      }

      case "payment_intent.requires_action": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const isConnectPayment = paymentIntent.transfer_data?.destination || paymentIntent.on_behalf_of;

        if (!isConnectPayment) {
          return NextResponse.json({ received: true });
        }

        await executeWithRetry(async () => {
          return await updatePaymentByIntentId(paymentIntent.id, { status: 'requires_action' });
        });

        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log(`[Webhook] Transfer created: ${transfer.id}`);

        if (transfer.metadata?.paymentId) {
          await executeWithRetry(async () => {
            return await Payment.findOneAndUpdate(
              { _id: transfer.metadata.paymentId },
              {
                stripeTransferId: transfer.id,
                status: 'completed',
                updated_at: new Date()
              },
              { new: true, maxTimeMS: 5000 }
            );
          });
        }

        break;
      }

      case "transfer.updated": {
        const transfer = event.data.object as Stripe.Transfer;
        const transferAny = transfer as any;

        if (transferAny.status === 'failed' || transferAny.failure_code) {
          console.log(`[Webhook] Transfer failed: ${transfer.id}`);

          if (transfer.metadata?.paymentId) {
            await executeWithRetry(async () => {
              return await Payment.findOneAndUpdate(
                { _id: transfer.metadata.paymentId },
                {
                  status: 'transfer_failed',
                  errorMessage: transferAny.failure_message || 'Transfer failed',
                  stripeTransferId: transfer.id,
                  updated_at: new Date()
                },
                { new: true, maxTimeMS: 5000 }
              );
            });
          }
        }

        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log(`[Webhook] Processing account.updated: ${account.id}`);

        const user = await executeWithRetry(async () => {
          return await User.findOne({ stripeAccountId: account.id }).maxTimeMS(5000);
        });

        if (!user) {
          console.error(`[Webhook] No user found with stripeAccountId: ${account.id}`);
          break;
        }

        let status = 'incomplete';
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          status = 'active';
          user.stripeOnboardingComplete = true;
        } else if (account.details_submitted) {
          status = 'pending';
        }

        if (user.stripeAccountStatus !== status) {
          await executeWithRetry(async () => {
            user.stripeAccountStatus = status;
            return await user.save({ maxTimeMS: 5000 });
          });
        }

        break;
      }

      default: {
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Webhook] Successfully processed event: ${event.type} in ${processingTime}ms`);
    return NextResponse.json({ received: true });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`[Webhook] Error processing webhook after ${processingTime}ms: ${error.message}`);
    
    if (error.message.includes('timeout') || error.message.includes('buffering')) {
      return NextResponse.json({ error: "Database timeout - will retry" }, { status: 408 });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}