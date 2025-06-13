import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { enrollCourse } from "@/app/actions/course";
import { headers } from "next/headers";
import { updatePaymentStatus } from "@/app/actions/product";
import { getAdminPaymentNotificationTemplate, sendEmail } from "@/lib/email";

// Initialize Stripe with updated API version to match your stripe function
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia", // Updated to match your stripe function
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const sendPaymentNotification = async ({
  paymentIntentId,
  date = new Date(),
  amount,
  productName,
  projectManager,
}: {
  paymentIntentId: string;
  date?: Date;
  amount: number;
  productName: string;
  projectManager: string;
}) => {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || '',
    subject: "New Payment Received",
    html: getAdminPaymentNotificationTemplate({
      paymentIntentId,
      date,
      amount,
      productName,
      pmId: projectManager,
    }),
  });
};

export async function POST(req: NextRequest) {
  try {
    console.log("[Standard Webhook] Received Stripe standard webhook request");
    const body = await req.text();
    const headersList = headers();
    const sig = headersList.get("stripe-signature");
    
    if (!sig) {
      console.error("[Standard Webhook] No Stripe signature found in request headers");
      return NextResponse.json(
        { error: "No signature found" },
        { status: 400 }
      );
    }
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
      console.log(`[Standard Webhook] Successfully verified webhook signature for event: ${event.id}, type: ${event.type}`);
    } catch (err: any) {
      console.error(`[Standard Webhook] Signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Check if event contains payment_intent with transfer_data (Connect payment)
    // For certain events that might contain transfer data
    if (event.type.startsWith('payment_intent.') || event.type === 'charge.succeeded') {
      const obj = event.data.object as any;
      
      // Check if this is actually a Connect payment that should be handled by the Connect webhook
      if (obj.transfer_data && obj.transfer_data.destination) {
        console.log(`[Standard Webhook] Detected Connect payment in standard webhook:
          Event Type: ${event.type}
          Payment ID: ${obj.id}
          Transfer Destination: ${obj.transfer_data.destination}
          Amount: ${obj.amount / 100} ${obj.currency || 'USD'}
          Metadata: ${JSON.stringify(obj.metadata || {})}`);
        
        console.warn(`[Standard Webhook] ⚠️ WARNING: Connect payment received in standard webhook! 
          This event should be handled by the Connect webhook endpoint instead.
          Please verify your Stripe webhook configuration to ensure events are sent to the correct endpoints.`);
        
        // You can choose to process it here as a fallback or just log and return
        // For safety, we'll just acknowledge receipt but not process it
        return NextResponse.json({ 
          received: true,
          warning: "Connect payment detected in standard webhook - not processed"
        });
      }
    }

    // Handle standard Stripe events
    console.log(`[Standard Webhook] Processing event type: ${event.type}`);
    
    switch (event.type) {
      case "checkout.session.completed": {
        const successSession = event.data.object as Stripe.Checkout.Session;
        
        console.log(`[Standard Webhook] Checkout session completed:
          Session ID: ${successSession.id}
          Payment Status: ${successSession.payment_status}
          Amount: ${successSession.amount_total ? successSession.amount_total / 100 : 0} ${successSession.currency?.toUpperCase() || 'USD'}
          Customer: ${successSession.customer || 'No customer ID'}
          Metadata: ${JSON.stringify(successSession.metadata || {})}`);

        const type = successSession.metadata?.type;
        const userId = successSession.metadata?.userId;
        const price = successSession.amount_total;
        const payment_intent = successSession.payment_intent as string;
        
        if (!userId) {
          console.error("[Standard Webhook] User ID missing in session metadata");
          throw new Error("Missing required user data");
        }

        if (price == null || price <= 0) {
          console.error("[Standard Webhook] Invalid price data:", price);
          throw new Error("Invalid price data");
        }

        if (!payment_intent) {
          console.error("[Standard Webhook] Payment Intent is missing");
          throw new Error("Payment Intent is missing");
        }

        console.log(`[Standard Webhook] Processing checkout details:
          Type: ${type}
          User ID: ${userId}
          Payment Intent: ${payment_intent}
          Price: ${price / 100} ${successSession.currency?.toUpperCase() || 'USD'}`);

        try {
          if (successSession.payment_status === "paid") {
            if (type === "course") {
              const courseId = successSession.metadata?.courseId;
              if (!courseId) {
                console.error("[Standard Webhook] Course ID missing in session metadata");
                throw new Error("Missing course ID");
              }
              
              console.log(`[Standard Webhook] Enrolling user in course:
                Course ID: ${courseId}
                User ID: ${userId}
                Payment: ${price / 100} ${successSession.currency?.toUpperCase() || 'USD'}`);
              
              const status = await enrollCourse({
                courseId,
                userId,
                payment_intent,
                price,
              });
              
              console.log(`[Standard Webhook] Course enrollment completed with status: ${JSON.stringify(status)}`);
              return NextResponse.json({ received: true, status });
            }
            else if (type === "product") {
              const wishlistId = successSession.metadata?.wishlistId as string;
              const itemId = successSession.metadata?.itemId as string;
              const productName = successSession.metadata?.name as string;
              
              console.log(`[Standard Webhook] Processing product payment:
                Wishlist ID: ${wishlistId}
                Item ID: ${itemId}
                Product Name: ${productName}
                Payment: ${price / 100} ${successSession.currency?.toUpperCase() || 'USD'}`);
              
              // Add additional logging before calling updatePaymentStatus
              console.log(`[Standard Webhook] Calling updatePaymentStatus with parameters:
                - wishlistId: ${wishlistId}
                - itemId: ${itemId}
                - paymentDetails: {
                    stripe_payment_intent: ${payment_intent},
                    payment_status: "succeeded",
                    total_price_paid: ${price},
                    paid_by: ${userId}
                  }`);
              
              const status = await updatePaymentStatus(
                wishlistId,
                itemId,
                {
                  stripe_payment_intent: payment_intent,
                  payment_status: "succeeded",
                  total_price_paid: price,
                  paid_by: userId,
                }
              );

              console.log(`[Standard Webhook] updatePaymentStatus returned: ${JSON.stringify(status)}`);

              // Check if the update was successful
              if (!status.success) {
                console.error(`[Standard Webhook] Failed to update payment status: ${status.error}`);
                throw new Error(`Payment status update failed: ${status.error}`);
              }

              // Send email notification to admin
              try {
                console.log(`[Standard Webhook] Sending payment notification email to admin:
                  Payment Intent: ${payment_intent}
                  Amount: ${price / 100} ${successSession.currency?.toUpperCase() || 'USD'}
                  Product: ${productName}
                  Project Manager: ${userId}`);
                
                await sendPaymentNotification({
                  paymentIntentId: payment_intent,
                  date: new Date(),
                  amount: (price ?? 0) / 100,
                  productName: productName,
                  projectManager: userId,
                });
                
                console.log("[Standard Webhook] Email notification sent successfully to admin");
              } catch (emailError: any) {
                console.error(`[Standard Webhook] Failed to send email notification: ${emailError.message}`, emailError);
              }

              console.log(`[Standard Webhook] Product payment update completed successfully`);
              return NextResponse.json({
                received: true,
                status,
              });
            } else {
              console.warn(`[Standard Webhook] Unknown payment type: ${type}`);
            }
          } else {
            console.warn(`[Standard Webhook] Payment not marked as paid. Status: ${successSession.payment_status}`);
          }
        } catch (error: any) {
          console.error(`[Standard Webhook] Error processing payment: ${error.message}`, error);
          return NextResponse.json(
            { error: "Failed to save payment details" },
            { status: 500 }
          );
        }
        break;
      }
      
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Standard Webhook] Payment intent succeeded:
          Payment Intent ID: ${paymentIntent.id}
          Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}
          Status: ${paymentIntent.status}
          Metadata: ${JSON.stringify(paymentIntent.metadata || {})}
          Payment Method: ${paymentIntent.payment_method || 'Unknown'}`);
        
        // This is a standard payment, not a Connect payment (already checked above)
        // You can add additional processing here if needed
        break;
      }
      
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Standard Webhook] Charge succeeded:
          Charge ID: ${charge.id}
          Payment Intent: ${charge.payment_intent || 'None'}
          Amount: ${charge.amount / 100} ${charge.currency}
          Status: ${charge.status}
          Customer: ${charge.customer || 'No customer'}
          Payment Method: ${charge.payment_method_details?.type || 'Unknown'}`);
        
        // This is a standard charge, not a Connect charge (already checked above)
        // You can add additional processing here if needed
        break;
      }
      
      default:
        console.log(`[Standard Webhook] Unhandled event type: ${event.type}`);
        break;
    }

    console.log(`[Standard Webhook] Successfully processed event: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Standard Webhook] Error processing webhook: ${error.message}`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}