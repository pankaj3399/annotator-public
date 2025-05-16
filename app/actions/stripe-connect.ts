'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { Payment } from "@/models/Payment";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Create Stripe account for expert
export async function createConnectAccount() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return { error: 'User not found' };
    }
    
    if (user.role !== 'annotator') {
      return { error: 'Only annotators can create Connect accounts' };
    }
    
    // Check if user already has a Stripe account
    if (user.stripeAccountId) {
      // Create an account link for existing account
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${process.env.NEXTAUTH_URL}/settings/payments?refresh=true`,
        return_url: `${process.env.NEXTAUTH_URL}/settings/payments?success=true`,
        type: 'account_onboarding',
      });
      
      return { url: accountLink.url };
    }
    
    // Create a new Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        // Enable additional payment methods
        sepa_debit_payments: { requested: true },
        ideal_payments: { requested: true },
        us_bank_account_ach_payments: { requested: true }
      },
      business_type: 'individual',
      business_profile: {
        name: user.name,
      },
      metadata: {
        userId: user._id.toString(),
      },
    });
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXTAUTH_URL}/settings/payments?refresh=true`,
      return_url: `${process.env.NEXTAUTH_URL}/settings/payments?success=true`,
      type: 'account_onboarding',
    });
    
    // Update user with Stripe account info
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'incomplete';
    await user.save();
    
    return { url: accountLink.url };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return { error: 'Failed to create Stripe account' };
  }
}

// Get Connect account status
export async function getConnectAccountStatus() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return { error: 'User not found' };
    }
    
    if (!user.stripeAccountId) {
      return { status: null };
    }
    
    // Get the latest account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    
    // Update account status based on Stripe response
    let status = 'incomplete';
    
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending';
    }
    
    // Update user if status changed
    if (user.stripeAccountStatus !== status) {
      user.stripeAccountStatus = status;
      await user.save();
    }
    
    return { status };
  } catch (error) {
    console.error('Error fetching Connect account status:', error);
    return { error: 'Failed to get account status' };
  }
}

// Create payment intent for project manager to pay expert
export async function createPaymentIntent(
  expertId: string, 
  projectId: string, 
  amount: number, 
  description: string,
  paymentMethod: string = 'card' // Default to card payment
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }
    
    const projectManager = await User.findById(session.user.id);
    
    if (!projectManager || projectManager.role !== 'project manager') {
      return { error: 'Not authorized as project manager' };
    }
    
    // Find the expert
    const expert = await User.findById(expertId);
    
    if (!expert || expert.role !== 'annotator') {
      return { error: 'Expert not found or not an annotator' };
    }
    
    // Check if expert has set up a Stripe account
    if (!expert.stripeAccountId) {
      return { error: 'Expert has not set up their payment account yet' };
    }
    
    if (expert.stripeAccountStatus !== 'active') {
      return { error: 'Expert has not completed Stripe onboarding' };
    }
    
    // Calculate platform fee (e.g., 10%)
    const platformFeePercent = 0;
    const amountInCents = Math.round(amount * 100);
    const platformFeeAmount = Math.round(amountInCents * platformFeePercent);
    
    // Set up payment method types based on selection
    const paymentMethodTypes: string[] = [paymentMethod];
    
    // For 'link' payments, we need to include 'card' as well
    if (paymentMethod === 'link') {
      paymentMethodTypes.push('card');
    }
    
    // Create a Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: paymentMethodTypes,
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: expert.stripeAccountId,
      },
      metadata: {
        projectManagerId: projectManager._id.toString(),
        expertId: expert._id.toString(),
        projectId: projectId,
        paymentMethod: paymentMethod
      },
    });
    
    // Create a payment record in the database
    const payment = new Payment({
      projectManager: projectManager._id,
      expert: expert._id,
      project: projectId === 'direct-payment' ? null : projectId,
      amount: amount,
      description: description || `Payment for expert services`,
      stripePaymentIntentId: paymentIntent.id,
      platformFee: platformFeeAmount / 100,
      status: 'pending',
      paymentMethod: paymentMethod
    });
    
    await payment.save();
    
    return { 
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    };
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return { error: error.message || 'Failed to create payment' };
  }
}

// Get payments for the current user
export async function getMyPayments() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }
    
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return { error: 'User not found' };
    }
    
    let payments;
    
    if (user.role === 'project manager') {
      // Get payments made by this project manager
      payments = await Payment.find({ projectManager: user._id })
        .populate('expert', 'name email')
        .populate('project', 'name')
        .sort({ created_at: -1 });
    } else if (user.role === 'annotator') {
      // Get payments received by this expert
      payments = await Payment.find({ expert: user._id })
        .populate('projectManager', 'name email')
        .populate('project', 'name')
        .sort({ created_at: -1 });
    } else {
      return { error: 'Invalid user role' };
    }
    
    return { data: JSON.stringify(payments) };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { error: 'Failed to get payments' };
  }
}