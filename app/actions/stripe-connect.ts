'use server';

import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
import { Payment } from '@/models/Payment';
import { SUPPORTED_COUNTRIES, SupportedCountry } from '@/lib/constants';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Get platform account country (should match your Stripe account's country)
function getPlatformCountry(): string {
  // Set this to match your main Stripe account's country
  // Examples: 'US', 'GB', 'DE', etc.
  return process.env.STRIPE_PLATFORM_COUNTRY || 'US';
}

// Determine if we need special handling for cross-border payments
function needsCrossBorderHandling(
  expertCountry: string,
  platformCountry: string
): boolean {
  // SEPA countries can generally transfer between each other more easily
  const sepaCountries = [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
  ];

  const platformInSepa = sepaCountries.includes(platformCountry);
  const expertInSepa = sepaCountries.includes(expertCountry);

  // If both are in SEPA, less likely to have issues, but still different countries
  if (platformInSepa && expertInSepa && expertCountry !== platformCountry) {
    return true; // Still cross-border, but should work
  }

  // Different countries definitely need special handling
  return expertCountry !== platformCountry;
}
// Get capabilities for each country
function getCapabilitiesForCountry(country: SupportedCountry) {
  const baseCapabilities: Record<string, { requested: boolean }> = {
    transfers: { requested: true },
  };

  const noCardPaymentsCountries: SupportedCountry[] = ['MX', 'HK', 'TH', 'IS'];
  // Only add card_payments for supported countries
  if (!noCardPaymentsCountries.includes(country)) {
    baseCapabilities.card_payments = { requested: true };
  }

  const countrySpecificCapabilities: Record<
    SupportedCountry,
    Record<string, { requested: boolean }>
  > = {
    // North America
    US: {
      us_bank_account_ach_payments: { requested: true },
      link_payments: { requested: true },
    },
    CA: {
      acss_debit_payments: { requested: true },
    },
    MX: {}, // Cards only

    // Europe (SEPA countries)
    AT: { sepa_debit_payments: { requested: true } },
    BE: { sepa_debit_payments: { requested: true } },
    BG: { sepa_debit_payments: { requested: true } },
    HR: { sepa_debit_payments: { requested: true } },
    CY: { sepa_debit_payments: { requested: true } },
    CZ: { sepa_debit_payments: { requested: true } },
    DK: { sepa_debit_payments: { requested: true } },
    EE: { sepa_debit_payments: { requested: true } },
    FI: { sepa_debit_payments: { requested: true } },
    FR: { sepa_debit_payments: { requested: true } },
    DE: {
      sepa_debit_payments: { requested: true },
      giropay_payments: { requested: true },
    },
    GR: { sepa_debit_payments: { requested: true } },
    HU: { sepa_debit_payments: { requested: true } },
    IE: { sepa_debit_payments: { requested: true } },
    IT: { sepa_debit_payments: { requested: true } },
    LV: { sepa_debit_payments: { requested: true } },
    LT: { sepa_debit_payments: { requested: true } },
    LU: { sepa_debit_payments: { requested: true } },
    MT: { sepa_debit_payments: { requested: true } },
    NL: {
      sepa_debit_payments: { requested: true },
      ideal_payments: { requested: true },
    },
    PL: { sepa_debit_payments: { requested: true } },
    PT: { sepa_debit_payments: { requested: true } },
    RO: { sepa_debit_payments: { requested: true } },
    SK: { sepa_debit_payments: { requested: true } },
    SI: { sepa_debit_payments: { requested: true } },
    ES: { sepa_debit_payments: { requested: true } },
    SE: { sepa_debit_payments: { requested: true } },

    // Other European countries
    GB: { bacs_debit_payments: { requested: true } },
    CH: { sepa_debit_payments: { requested: true } },
    NO: { sepa_debit_payments: { requested: true } },
    IS: {},

    // Asia Pacific
    HK: {}, // Cards only
    TH: {}, // Cards only
  };

  return {
    ...baseCapabilities,
    ...(countrySpecificCapabilities[country] || {}),
  };
}

// Get supported currencies for each country
function getSupportedCurrencies(country: SupportedCountry): string[] {
  const currencyMap: Record<SupportedCountry, string[]> = {
    US: ['usd'],
    CA: ['cad', 'usd'],
    GB: ['gbp', 'eur', 'usd'],
    AU: ['aud', 'usd'],
    JP: ['jpy', 'usd'],
    SG: ['sgd', 'usd'],
    HK: ['hkd', 'usd'],
    NZ: ['nzd', 'usd'],
    MY: ['myr', 'usd'],
    TH: ['thb', 'usd'],
    MX: ['mxn', 'usd'],
    BR: ['brl', 'usd'],
    IN: ['inr', 'usd'],
    AE: ['aed', 'usd'],
    CH: ['chf', 'eur', 'usd'],
    NO: ['nok', 'eur', 'usd'],
    IS: ['isk', 'eur', 'usd'],
    LI: ['chf', 'eur', 'usd'],
    PR: ['usd'],
    PH: ['php', 'usd'], // Add Philippines with PHP and USD
    SA: ['sar', 'usd'],
    // European countries
    AT: ['eur', 'usd'],
    BE: ['eur', 'usd'],
    BG: ['bgn', 'eur', 'usd'],
    HR: ['hrk', 'eur', 'usd'],
    CY: ['eur', 'usd'],
    CZ: ['czk', 'eur', 'usd'],
    DK: ['dkk', 'eur', 'usd'],
    EE: ['eur', 'usd'],
    FI: ['eur', 'usd'],
    FR: ['eur', 'usd'],
    DE: ['eur', 'usd'],
    GR: ['eur', 'usd'],
    HU: ['huf', 'eur', 'usd'],
    IE: ['eur', 'usd'],
    IT: ['eur', 'usd'],
    LV: ['eur', 'usd'],
    LT: ['eur', 'usd'],
    LU: ['eur', 'usd'],
    MT: ['eur', 'usd'],
    NL: ['eur', 'usd'],
    PL: ['pln', 'eur', 'usd'],
    PT: ['eur', 'usd'],
    RO: ['ron', 'eur', 'usd'],
    SK: ['eur', 'usd'],
    SI: ['eur', 'usd'],
    ES: ['eur', 'usd'],
    SE: ['sek', 'eur', 'usd'],
    EG: ['egp', 'usd'],
    TR: ['try', 'usd'],
    AR: ['ars', 'usd'],
    NG: ['ngn', 'usd'],
    KE: ['kes', 'usd'],
    ZA: ['zar', 'usd'],
  };

  return currencyMap[country] || ['usd'];
}

function getAvailablePaymentMethods(country: string): string[] {
  const baseMethods = ['card']; // Card works everywhere

  const countryMethods: Record<string, string[]> = {
    // North America
    US: ['us_bank_account', 'link'],
    CA: ['acss_debit'],

    // Europe - SEPA countries
    AT: ['sepa_debit'],
    BE: ['sepa_debit'],
    BG: ['sepa_debit'],
    HR: ['sepa_debit'],
    CY: ['sepa_debit'],
    CZ: ['sepa_debit'],
    DK: ['sepa_debit'],
    EE: ['sepa_debit'],
    FI: ['sepa_debit'],
    FR: ['sepa_debit'],
    GR: ['sepa_debit'],
    HU: ['sepa_debit'],
    IE: ['sepa_debit'],
    IT: ['sepa_debit'],
    LV: ['sepa_debit'],
    LT: ['sepa_debit'],
    LU: ['sepa_debit'],
    MT: ['sepa_debit'],
    PL: ['sepa_debit'],
    PT: ['sepa_debit'],
    RO: ['sepa_debit'],
    SK: ['sepa_debit'],
    SI: ['sepa_debit'],
    ES: ['sepa_debit'],
    SE: ['sepa_debit'],
    CH: ['sepa_debit'],
    NO: ['sepa_debit'],

    // Special cases
    DE: ['sepa_debit', 'giropay'],
    NL: ['sepa_debit', 'ideal'],
    GB: ['bacs_debit'],
  };

  return [...baseMethods, ...(countryMethods[country] || [])];
}

// Helper function to convert amounts to minor currency units
function convertToMinorUnits(amount: number, currency: string): number {
  // Zero-decimal currencies (no cents)
  const zeroDecimalCurrencies = [
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
  ];

  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }

  // Three-decimal currencies
  const threeDecimalCurrencies = ['bhd', 'jod', 'kwd', 'omr', 'tnd'];
  if (threeDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(amount * 1000);
  }

  // Standard two-decimal currencies
  return Math.round(amount * 100);
}

// Create Stripe account for expert
export async function createConnectAccount(country?: SupportedCountry) {
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
      try {
        // Verify the account still exists
        const existingAccount = await stripe.accounts.retrieve(
          user.stripeAccountId
        );

        const accountLink = await stripe.accountLinks.create({
          account: user.stripeAccountId,
          refresh_url: `${process.env.NEXTAUTH_URL}/payments/bank-settings?refresh=true`,
          return_url: `${process.env.NEXTAUTH_URL}/payments/bank-settings?success=true`,
          type: 'account_onboarding',
        });

        return { url: accountLink.url };
      } catch (error: any) {
        if (error.code === 'account_invalid') {
          // Account was deleted, clear it and create new one
          user.stripeAccountId = undefined;
          user.stripeAccountStatus = undefined;
          user.stripeAccountCountry = undefined;
          await user.save();
        } else {
          throw error;
        }
      }
    }

    // For new accounts, country is required
    if (!country) {
      return { error: 'Country is required for new accounts' };
    }

    if (!SUPPORTED_COUNTRIES.includes(country)) {
      return { error: `Country ${country} is not supported by Stripe Connect` };
    }

    // Get capabilities for the country
    const capabilities = getCapabilitiesForCountry(country);

    // Determine if we need recipient service agreement
    const needsRecipientAgreement = !capabilities.card_payments;

    // Enhanced account creation with better cross-border support
    const accountConfig: Stripe.AccountCreateParams = {
      type: 'express',
      country: country,
      email: user.email,
      capabilities,
      business_type: 'individual',
      business_profile: {
        name: user.name,
        product_description: 'Expert annotation and consulting services',
        mcc: '8999', // Professional services
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual', // Allow manual payouts for better control
          },
        },
      },
      metadata: {
        userId: user._id.toString(),
        userCountry: country,
        platformCountry: getPlatformCountry(),
      },
    };

    // For countries that don't support card_payments, use recipient service agreement
    if (needsRecipientAgreement) {
      accountConfig.tos_acceptance = {
        service_agreement: 'recipient',
      };
    }

    const account = await stripe.accounts.create(accountConfig);

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXTAUTH_URL}/payments/bank-settings?refresh=true`,
      return_url: `${process.env.NEXTAUTH_URL}/payments/bank-settings?success=true`,
      type: 'account_onboarding',
    });

    // Update user with Stripe account info
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'incomplete';
    user.stripeAccountCountry = country;
    await user.save();

    return { url: accountLink.url };
  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);

    if (error.code === 'country_unsupported') {
      return {
        error: `Stripe Connect is not available in ${country}. Please contact support.`,
      };
    }

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
      return {
        status: null,
        supportedCountries: SUPPORTED_COUNTRIES,
        userCountry: user.stripeAccountCountry,
      };
    }

    // Get the latest account details from Stripe
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // Update account status based on Stripe response
    let status = 'incomplete';

    if (
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
    ) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending';
    }

    // Update user if status changed
    if (user.stripeAccountStatus !== status) {
      user.stripeAccountStatus = status;
      await user.save();
    }

    return {
      status,
      country: account.country,
      supportedCurrencies: getSupportedCurrencies(
        account.country as SupportedCountry
      ),
    };
  } catch (error) {
    console.error('Error fetching Connect account status:', error);
    return { error: 'Failed to get account status' };
  }
}

// FIXED: Enhanced payment intent creation with cross-border handling
export async function createPaymentIntent(
  expertId: string,
  projectId: string,
  amount: number,
  description: string,
  currency: string = 'usd',
  paymentMethod: string = 'card'
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

    // Get expert's account details
    const expertAccount = await stripe.accounts.retrieve(
      expert.stripeAccountId
    );

    // ALWAYS use lowercase for currency
    const normalizedCurrency = currency.toLowerCase();

    console.log('Expert country:', expertAccount.country);
    console.log('Platform country:', getPlatformCountry());
    console.log(
      'Supported currencies:',
      getSupportedCurrencies(expertAccount.country as SupportedCountry)
    );
    console.log('Requested currency:', normalizedCurrency);

    // Validate currency is supported for expert's country
    const supportedCurrencies = getSupportedCurrencies(
      expertAccount.country as SupportedCountry
    );
    if (!supportedCurrencies.includes(normalizedCurrency)) {
      return {
        error: `Currency ${normalizedCurrency.toUpperCase()} is not supported for ${
          expertAccount.country
        }. Supported currencies: ${supportedCurrencies
          .join(', ')
          .toUpperCase()}`,
        supportedCurrencies: supportedCurrencies,
      };
    }

    // Validate payment method
    const platformCountry = getPlatformCountry();
    const validPaymentMethods = getAvailablePaymentMethods(platformCountry);
    if (!validPaymentMethods.includes(paymentMethod)) {
      return { error: `Payment method ${paymentMethod} is not supported` };
    }

    // Calculate platform fee
    const platformFeePercent = 0.05; // 5% platform fee
    const amountInMinorUnits = convertToMinorUnits(amount, normalizedCurrency);
    const platformFeeAmount = Math.round(
      amountInMinorUnits * platformFeePercent
    );

    // Validate minimum amount based on currency
    const minimumAmounts: Record<string, number> = {
      usd: 50,
      eur: 50,
      gbp: 30,
      cad: 50,
      chf: 50,
      dkk: 250,
      sek: 300,
      nok: 300,
      pln: 200,
      czk: 1500,
      huf: 17500,
      ron: 200,
      bgn: 100,
      hrk: 350,
      isk: 7000,
      hkd: 400,
      thb: 2000,
      mxn: 1000,
    };

    const minAmount = minimumAmounts[normalizedCurrency] || 50;
    if (amountInMinorUnits < minAmount) {
      const minAmountFormatted = (
        minAmount / convertToMinorUnits(1, normalizedCurrency)
      ).toFixed(2);
      return {
        error: `Minimum amount is ${minAmountFormatted} ${normalizedCurrency.toUpperCase()}`,
      };
    }

    // Check if we need cross-border handling
    const needsCrossBorder = needsCrossBorderHandling(
      expertAccount.country!,
      platformCountry
    );

    console.log('Cross-border handling needed:', needsCrossBorder);

    // Create Payment Intent with proper configuration for cross-border payments
    const paymentIntentConfig: Stripe.PaymentIntentCreateParams = {
      amount: amountInMinorUnits,
      currency: normalizedCurrency,
      payment_method_types: [paymentMethod],
      metadata: {
        projectManagerId: projectManager._id.toString(),
        expertId: expert._id.toString(),
        projectId: projectId,
        expertCountry: expertAccount.country || '',
        platformCountry: platformCountry,
        paymentMethod: paymentMethod,
        crossBorder: needsCrossBorder.toString(),
        platformFeeAmount: platformFeeAmount.toString(),
        originalAmount: amountInMinorUnits.toString(),
      },
    };

    // CRITICAL: For cross-border payments, use on_behalf_of instead of transfer_data
    if (needsCrossBorder) {
      console.log(
        'Using on_behalf_of for cross-border payment - no application_fee_amount'
      );
      paymentIntentConfig.on_behalf_of = expert.stripeAccountId;
      // For cross-border payments with on_behalf_of, we cannot use application_fee_amount
      // We'll handle the platform fee by transferring the net amount after payment succeeds
    } else {
      console.log('Using transfer_data for same-country payment');
      paymentIntentConfig.application_fee_amount = platformFeeAmount;
      paymentIntentConfig.transfer_data = {
        destination: expert.stripeAccountId,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentConfig
    );

    // Create a payment record in the database
    const payment = new Payment({
      projectManager: projectManager._id,
      expert: expert._id,
      project: projectId === 'direct-payment' ? null : projectId,
      amount: amount,
      currency: normalizedCurrency,
      description: description || `Payment for expert services`,
      stripePaymentIntentId: paymentIntent.id,
      platformFee:
        platformFeeAmount / convertToMinorUnits(1, normalizedCurrency),
      status: 'pending',
      paymentMethod: paymentMethod,
      expertCountry: expertAccount.country || null,
      crossBorderPayment: needsCrossBorder, // NEW FIELD
    });

    await payment.save();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id.toString(),
      supportedCurrencies: supportedCurrencies,
      crossBorderPayment: needsCrossBorder,
    };
  } catch (error: any) {
    console.error('Error creating payment:', error);

    // Enhanced error handling for cross-border issues
    if (error.code === 'account_country_invalid_address') {
      return {
        error:
          "There is an issue with the expert's account setup. Please ask them to complete their Stripe onboarding.",
      };
    }

    if (error.code === 'transfers_not_allowed') {
      return {
        error:
          'Cross-border transfers are not supported for this account combination. Please contact support.',
      };
    }

    if (error.message?.includes('destination')) {
      return {
        error:
          'Cannot process payment to this expert due to cross-border restrictions. Please try using on_behalf_of payment method.',
      };
    }

    return { error: error.message || 'Failed to create payment' };
  }
}

// NEW: Handle successful payments and create transfers for cross-border payments
export async function handlePaymentSucceeded(paymentIntentId: string) {
  try {
    await connectToDatabase();

    // Find the payment record
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!payment) {
      console.error(
        'Payment record not found for PaymentIntent:',
        paymentIntentId
      );
      return { error: 'Payment record not found' };
    }

    console.log(
      'Processing payment success for:',
      paymentIntentId,
      'CrossBorder:',
      payment.crossBorderPayment
    );

    // If this was a cross-border payment with on_behalf_of, create a separate transfer
    if (payment.crossBorderPayment) {
      const expert = await User.findById(payment.expert);

      if (expert && expert.stripeAccountId) {
        const transferAmount =
          convertToMinorUnits(payment.amount, payment.currency) -
          convertToMinorUnits(payment.platformFee, payment.currency);

        try {
          console.log('Creating cross-border transfer:', {
            amount: transferAmount,
            currency: payment.currency,
            destination: expert.stripeAccountId,
          });

          // For cross-border payments, we need to calculate the transfer amount
          // after deducting the platform fee from the total payment amount
          const totalAmountInMinorUnits = convertToMinorUnits(
            payment.amount,
            payment.currency
          );
          const platformFeeInMinorUnits = convertToMinorUnits(
            payment.platformFee,
            payment.currency
          );
          const netTransferAmount =
            totalAmountInMinorUnits - platformFeeInMinorUnits;

          const transfer = await stripe.transfers.create({
            amount: netTransferAmount,
            currency: payment.currency,
            destination: expert.stripeAccountId,
            metadata: {
              paymentId: payment._id.toString(),
              expertId: expert._id.toString(),
              paymentIntentId: paymentIntentId,
              platformFee: platformFeeInMinorUnits.toString(),
              originalAmount: totalAmountInMinorUnits.toString(),
            },
          });

          console.log('Cross-border transfer created:', transfer.id);

          // Update payment record with transfer info
          payment.stripeTransferId = transfer.id; // NEW FIELD
          payment.status = 'completed';
          await payment.save();

          return { success: true, transferId: transfer.id };
        } catch (transferError: any) {
          console.error(
            'Failed to create cross-border transfer:',
            transferError
          );
          payment.status = 'transfer_failed';
          payment.errorMessage = transferError.message; // NEW FIELD
          await payment.save();

          return { error: 'Transfer failed', details: transferError.message };
        }
      } else {
        console.error(
          'Expert not found or no Stripe account for payment:',
          payment._id
        );
        payment.status = 'transfer_failed';
        payment.errorMessage = 'Expert account not found';
        await payment.save();

        return { error: 'Expert account not found' };
      }
    } else {
      // Regular transfer_data payment, just update status
      payment.status = 'completed';
      await payment.save();

      console.log('Regular payment completed:', paymentIntentId);
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error handling payment succeeded webhook:', error);
    return { error: error.message };
  }
}

export async function getExpertSupportedCurrencies(expertId: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Find the expert
    const expert = await User.findById(expertId);

    if (!expert || expert.role !== 'annotator') {
      return { error: 'Expert not found or not an annotator' };
    }

    // Check if expert has set up a Stripe account
    if (!expert.stripeAccountId) {
      console.log('Expert has no Stripe account, returning default currencies');
      return { supportedCurrencies: ['usd'] }; // Default fallback
    }

    if (expert.stripeAccountStatus !== 'active') {
      console.log(
        'Expert Stripe account not active, returning default currencies'
      );
      return { supportedCurrencies: ['usd'] }; // Default fallback
    }

    // Get expert's account details
    const expertAccount = await stripe.accounts.retrieve(
      expert.stripeAccountId
    );

    console.log('Expert account country:', expertAccount.country);

    // Get supported currencies for the expert's country
    const supportedCurrencies = getSupportedCurrencies(
      expertAccount.country as SupportedCountry
    );

    console.log(
      'Supported currencies for',
      expertAccount.country,
      ':',
      supportedCurrencies
    );

    return {
      supportedCurrencies: supportedCurrencies,
      expertCountry: expertAccount.country,
    };
  } catch (error: any) {
    console.error('Error getting expert currencies:', error);
    return { supportedCurrencies: ['usd'] }; // Default fallback
  }
}

// Get supported countries and their details
export async function getSupportedCountriesInfo() {
  const countriesInfo = SUPPORTED_COUNTRIES.map((country) => ({
    code: country,
    currencies: getSupportedCurrencies(country),
    capabilities: Object.keys(getCapabilitiesForCountry(country)),
  }));

  return { countries: countriesInfo };
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
      payments = await Payment.find({ projectManager: user._id })
        .populate('expert', 'name email stripeAccountCountry')
        .populate('project', 'name')
        .sort({ created_at: -1 });
    } else if (user.role === 'annotator') {
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
