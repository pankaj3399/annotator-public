'use client';

import { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  createPaymentIntent,
  getExpertSupportedCurrencies,
} from '@/app/actions/stripe-connect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Wallet,
  Clock,
  BanknoteIcon,
  Globe,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAnnotatorById } from '@/app/actions/annotator';
import { SupportedCountry } from '@/lib/constants';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type PaymentMethodType =
  | 'card'
  | 'us_bank_account'
  | 'sepa_debit'
  | 'ideal'
  | 'link'
  | 'giropay'
  | 'bacs_debit'
  | 'acss_debit'
  | 'au_becs_debit';

// Currency mapping with proper formatting
const CURRENCY_CONFIG = {
  usd: { symbol: '$', name: 'US Dollar', country: 'US' },
  eur: { symbol: '€', name: 'Euro', country: 'EU' },
  gbp: { symbol: '£', name: 'British Pound', country: 'GB' },
  cad: { symbol: 'C$', name: 'Canadian Dollar', country: 'CA' },
  aud: { symbol: 'A$', name: 'Australian Dollar', country: 'AU' },
  jpy: { symbol: '¥', name: 'Japanese Yen', country: 'JP' },
  sgd: { symbol: 'S$', name: 'Singapore Dollar', country: 'SG' },
  hkd: { symbol: 'HK$', name: 'Hong Kong Dollar', country: 'HK' },
  chf: { symbol: 'CHF', name: 'Swiss Franc', country: 'CH' },
  nok: { symbol: 'kr', name: 'Norwegian Krone', country: 'NO' },
  sek: { symbol: 'kr', name: 'Swedish Krona', country: 'SE' },
  dkk: { symbol: 'kr', name: 'Danish Krone', country: 'DK' },
  pln: { symbol: 'zł', name: 'Polish Zloty', country: 'PL' },
  czk: { symbol: 'Kč', name: 'Czech Koruna', country: 'CZ' },
  huf: { symbol: 'Ft', name: 'Hungarian Forint', country: 'HU' },
  ron: { symbol: 'lei', name: 'Romanian Leu', country: 'RO' },
  bgn: { symbol: 'лв', name: 'Bulgarian Lev', country: 'BG' },
  hrk: { symbol: 'kn', name: 'Croatian Kuna', country: 'HR' },
  nzd: { symbol: 'NZ$', name: 'New Zealand Dollar', country: 'NZ' },
  myr: { symbol: 'RM', name: 'Malaysian Ringgit', country: 'MY' },
  thb: { symbol: '฿', name: 'Thai Baht', country: 'TH' },
  inr: { symbol: '₹', name: 'Indian Rupee', country: 'IN' },
  brl: { symbol: 'R$', name: 'Brazilian Real', country: 'BR' },
  mxn: { symbol: 'MX$', name: 'Mexican Peso', country: 'MX' },
  aed: { symbol: 'AED', name: 'UAE Dirham', country: 'AE' },
  isk: { symbol: 'kr', name: 'Icelandic Krona', country: 'IS' },
};

// Payment Method Selector Component
function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  expertCountry,
}: {
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType) => void;
  expertCountry?: string;
}) {
  // Show different payment methods based on expert's country
  const getAvailablePaymentMethods = () => {
    const methods = [
      {
        id: 'card' as PaymentMethodType,
        name: 'Credit Card',
        description: 'Pay with Visa, Mastercard, Amex, etc.',
        icon: CreditCard,
        available: true,
      },
    ];

    // Add country-specific payment methods
    if (expertCountry) {
      if (expertCountry === 'US') {
        methods.push({
          id: 'us_bank_account' as PaymentMethodType,
          name: 'ACH Direct Debit',
          description: 'Pay directly from your US bank account',
          icon: BanknoteIcon,
          available: true,
        });
      }

      // SEPA countries
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
      if (sepaCountries.includes(expertCountry)) {
        methods.push({
          id: 'sepa_debit' as PaymentMethodType,
          name: 'SEPA Direct Debit',
          description: 'Pay with your European bank account',
          icon: BanknoteIcon,
          available: true,
        });
      }

      if (expertCountry === 'NL') {
        methods.push({
          id: 'ideal' as PaymentMethodType,
          name: 'iDEAL',
          description: 'Pay with your Dutch bank account',
          icon: BanknoteIcon,
          available: true,
        });
      }
    }

    return methods;
  };

  const availableMethods = getAvailablePaymentMethods();

  return (
    <RadioGroup
      value={selectedMethod}
      onValueChange={(value) => onMethodChange(value as PaymentMethodType)}
      className='grid grid-cols-1 gap-3'
    >
      {availableMethods.map((method) => (
        <div
          key={method.id}
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedMethod === method.id
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <RadioGroupItem
            value={method.id}
            id={method.id}
            className='sr-only'
          />
          <Label
            htmlFor={method.id}
            className='flex items-center cursor-pointer'
          >
            <method.icon className='h-5 w-5 mr-3 text-blue-600' />
            <div>
              <div className='font-medium'>{method.name}</div>
              <div className='text-sm text-gray-500'>{method.description}</div>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

// Cross-border payment info component
function CrossBorderInfo({
  expertCountry,
  platformCountry,
}: {
  expertCountry?: string;
  platformCountry?: string;
}) {
  if (!expertCountry || !platformCountry || expertCountry === platformCountry) {
    return null;
  }

  return (
    <Alert className='mb-6 bg-blue-50 border-blue-200'>
      <Globe className='h-4 w-4 text-blue-600' />
      <AlertTitle className='text-blue-800'>Cross-Border Payment</AlertTitle>
      <AlertDescription className='text-blue-700'>
        This is a cross-border payment from {platformCountry} to {expertCountry}
        . The payment may take additional time to process, and your expert will
        receive the funds after currency conversion if applicable.
      </AlertDescription>
    </Alert>
  );
}

function PaymentForm({ expertId }: { expertId: string }) {
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [expert, setExpert] = useState<any>(null);
  const [expertLoading, setExpertLoading] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [currency, setCurrency] = useState<string>('usd');
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([
    'usd',
  ]);
  const [expertCountry, setExpertCountry] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentCreated, setIntentCreated] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isCrossBorder, setIsCrossBorder] = useState<boolean>(false);

  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  // Get platform country from environment or default to US
  const platformCountry =
    process.env.NEXT_PUBLIC_STRIPE_PLATFORM_COUNTRY || 'US';

  // Fetch expert details and their supported currencies
  useEffect(() => {
    const fetchExpert = async () => {
      try {
        setExpertLoading(true);
        setError(null);

        console.log('Fetching expert details for:', expertId);

        // Fetch expert details
        const expertResult = await getAnnotatorById(expertId);
        if (expertResult.error) {
          throw new Error(expertResult.error);
        }

        if (expertResult.data) {
          const expertData = JSON.parse(expertResult.data);
          setExpert(expertData);

          console.log('Expert data loaded:', {
            name: expertData.name,
            stripeStatus: expertData.stripeAccountStatus,
            country: expertData.stripeAccountCountry,
          });

          // Get expert's supported currencies from the server
          try {
            const currencyResult = await getExpertSupportedCurrencies(expertId);
            if (currencyResult.error) {
              console.warn(
                'Could not fetch expert currencies:',
                currencyResult.error
              );
              // Fallback to default currencies based on expert country
              const country = expertData.stripeAccountCountry;
              if (country) {
                setExpertCountry(country);
                setIsCrossBorder(country !== platformCountry);
                // Set default currencies based on country (fallback)
                const fallbackCurrencies = getFallbackCurrencies(country);
                setSupportedCurrencies(fallbackCurrencies);
                setCurrency(fallbackCurrencies[0]);
              }
            } else {
              console.log('Expert currencies fetched:', currencyResult);
              setSupportedCurrencies(
                currencyResult.supportedCurrencies || ['usd']
              );
              setExpertCountry(currencyResult.expertCountry || '');
              setIsCrossBorder(
                currencyResult.expertCountry !== platformCountry
              );

              // Set default currency to the first supported one
              if (
                currencyResult.supportedCurrencies &&
                currencyResult.supportedCurrencies.length > 0
              ) {
                setCurrency(currencyResult.supportedCurrencies[0]);
              }
            }
          } catch (currencyError) {
            console.error('Error fetching currencies:', currencyError);
            // Use fallback
            setSupportedCurrencies(['usd']);
          }
        }
      } catch (error: any) {
        console.error('Error in fetchExpert:', error);
        setError(error.message || 'Failed to load expert details');
      } finally {
        setExpertLoading(false);
      }
    };

    fetchExpert();
  }, [expertId, platformCountry]);

  // Fallback currency mapping for when API calls fail
  const getFallbackCurrencies = (country: string): string[] => {
  const currencyMap: Record<SupportedCountry, string[]> = {
    'US': ['usd'],
    'CA': ['cad', 'usd'],
    'GB': ['gbp', 'eur', 'usd'],
    'HK': ['hkd', 'usd'],
    'TH': ['thb', 'usd'],
    'MX': ['mxn', 'usd'],
    'CH': ['chf', 'eur', 'usd'],
    'NO': ['nok', 'eur', 'usd'],
    'IS': ['isk', 'eur', 'usd'],
    // European countries
    'AT': ['eur', 'usd'], 'BE': ['eur', 'usd'], 'BG': ['bgn', 'eur', 'usd'],
    'HR': ['hrk', 'eur', 'usd'], 'CY': ['eur', 'usd'], 'CZ': ['czk', 'eur', 'usd'],
    'DK': ['dkk', 'eur', 'usd'], 'EE': ['eur', 'usd'], 'FI': ['eur', 'usd'],
    'FR': ['eur', 'usd'], 'DE': ['eur', 'usd'], 'GR': ['eur', 'usd'],
    'HU': ['huf', 'eur', 'usd'], 'IE': ['eur', 'usd'], 'IT': ['eur', 'usd'],
    'LV': ['eur', 'usd'], 'LT': ['eur', 'usd'], 'LU': ['eur', 'usd'],
    'MT': ['eur', 'usd'], 'NL': ['eur', 'usd'], 'PL': ['pln', 'eur', 'usd'],
    'PT': ['eur', 'usd'], 'RO': ['ron', 'eur', 'usd'], 'SK': ['eur', 'usd'],
    'SI': ['eur', 'usd'], 'ES': ['eur', 'usd'], 'SE': ['sek', 'eur', 'usd'],
  };

    return currencyMap[country] || ['usd'];
  };

  // Create payment intent when amount is confirmed
  const createIntent = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    console.log('Creating intent with:', {
      expertId,
      amount,
      currency,
      paymentMethod,
      supportedCurrencies,
      expertCountry,
      platformCountry,
      isCrossBorder,
    });

    setLoading(true);
    setError(null);

    try {
      const result = await createPaymentIntent(
        expertId,
        'direct-payment',
        amount,
        description || 'Payment for expert services',
        currency,
        paymentMethod
      );

      console.log('Payment intent result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      setClientSecret(result.clientSecret!);
      if (result.paymentId) {
        setPaymentId(result.paymentId);
      }

      // Update supported currencies from the response if available
      if (result.supportedCurrencies) {
        console.log(
          'Updating supported currencies from response:',
          result.supportedCurrencies
        );
        setSupportedCurrencies(result.supportedCurrencies);
      }

      // Update cross-border status
      if (result.crossBorderPayment !== undefined) {
        setIsCrossBorder(result.crossBorderPayment);
      }

      setIntentCreated(true);
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Currency formatter
  const formatCurrency = (amount: number, currencyCode: string) => {
    const config =
      CURRENCY_CONFIG[currencyCode as keyof typeof CURRENCY_CONFIG];
    if (config) {
      return `${config.symbol}${amount.toFixed(2)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment processing not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let paymentResult;

      // Handle different payment methods
      switch (paymentMethod) {
        case 'card':
          paymentResult = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: elements.getElement(CardElement)!,
            },
          });
          break;

        case 'us_bank_account':
          paymentResult =
            await stripe.confirmUsBankAccountPayment(clientSecret);
          break;

        case 'sepa_debit':
          // Note: In a real implementation, you'd collect IBAN and billing details
          paymentResult = await stripe.confirmSepaDebitPayment(clientSecret, {
            payment_method: {
              sepa_debit: {
                iban: 'IBAN_NUMBER', // This should be collected from the user
              },
              billing_details: {
                name: 'ACCOUNT_HOLDER_NAME',
                email: 'EMAIL',
              },
            },
          });
          break;

        case 'ideal':
          paymentResult = await stripe.confirmIdealPayment(clientSecret, {
            payment_method: {
              ideal: {
                bank: 'abn_amro', // This should be selected by the user
              },
            },
            return_url: `${window.location.origin}/payments-manager?success=true`,
          });
          break;

        case 'link':
          paymentResult = await stripe.confirmLinkPayment(clientSecret, {
            payment_method: 'link',
          });
          break;

        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      if (paymentResult.error) {
        throw new Error(paymentResult.error.message);
      }

      // Check payment status
      if (paymentResult.paymentIntent) {
        if (paymentResult.paymentIntent.status === 'succeeded') {
          setSuccess(true);
          setTimeout(() => {
            router.push(
              `/payments-manager?success=true&payment_id=${paymentId}&cross_border=${isCrossBorder}`
            );
          }, 2000);
        } else if (paymentResult.paymentIntent.status === 'requires_action') {
          // Payment requires additional action (e.g., 3D Secure)
          // Stripe.js will handle this automatically
        } else if (paymentResult.paymentIntent.status === 'processing') {
          setSuccess(true);
          setTimeout(() => {
            router.push(
              `/payments-manager?status=processing&payment_id=${paymentId}&cross_border=${isCrossBorder}`
            );
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (expertLoading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-500' />
      </div>
    );
  }

  if (error && !expert) {
    return (
      <Alert variant='destructive' className='my-8'>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button
            className='ml-2 mt-2'
            variant='outline'
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <Alert className='my-8 bg-green-50 border-green-200 text-green-800'>
        <CheckCircle className='h-5 w-5 text-green-600' />
        <AlertTitle>Payment Successful!</AlertTitle>
        <AlertDescription className='text-green-700'>
          {isCrossBorder
            ? 'Your cross-border payment is being processed. The expert will receive funds after processing and any necessary currency conversion.'
            : "Your payment is being processed. You'll be redirected to the payments page shortly."}
        </AlertDescription>
      </Alert>
    );
  }

  // Debug information for development
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className='space-y-6'>
      {isDevelopment && (
        <div className='bg-blue-50 p-4 rounded-lg text-sm'>
          <h4 className='font-medium text-blue-800'>Debug Info:</h4>
          <p>Expert Country: {expertCountry || 'Not set'}</p>
          <p>Platform Country: {platformCountry}</p>
          <p>Cross-border: {isCrossBorder ? 'Yes' : 'No'}</p>
          <p>Supported Currencies: {supportedCurrencies.join(', ')}</p>
          <p>Selected Currency: {currency}</p>
          <p>
            Expert Stripe Status: {expert?.stripeAccountStatus || 'Not set'}
          </p>
          <p>
            Expert Stripe Account ID: {expert?.stripeAccountId || 'Not set'}
          </p>
        </div>
      )}

      {/* Cross-border payment info */}
      <CrossBorderInfo
        expertCountry={expertCountry}
        platformCountry={platformCountry}
      />

      {!intentCreated ? (
        // Step 1: Enter payment details
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createIntent();
          }}
        >
          {expert && (
            <div className='bg-gray-50 p-4 rounded-lg mb-6'>
              <h3 className='font-medium text-gray-700'>Expert Details</h3>
              <p className='text-sm text-gray-600 mt-1'>Name: {expert.name}</p>
              <p className='text-sm text-gray-600'>Email: {expert.email}</p>
              {expertCountry && (
                <p className='text-sm text-gray-600'>
                  Country: {expertCountry}
                </p>
              )}
              {expert.stripeAccountStatus && (
                <p className='text-sm text-gray-600'>
                  Payment Status:{' '}
                  <span className='capitalize'>
                    {expert.stripeAccountStatus}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className='grid grid-cols-2 gap-4 mb-4'>
            <div className='space-y-2'>
              <Label htmlFor='amount'>Amount</Label>
              <Input
                id='amount'
                type='number'
                min='0.01'
                step='0.01'
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder='0.00'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='currency'>Currency</Label>
              <select
                id='currency'
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              >
                {supportedCurrencies.map((curr) => {
                  const config =
                    CURRENCY_CONFIG[curr as keyof typeof CURRENCY_CONFIG];
                  return (
                    <option key={curr} value={curr}>
                      {curr.toUpperCase()} {config ? `(${config.name})` : ''}
                    </option>
                  );
                })}
              </select>
              {isCrossBorder && (
                <p className='text-xs text-blue-600'>
                  <Globe className='h-3 w-3 inline mr-1' />
                  Cross-border payment - currency conversion may apply
                </p>
              )}
            </div>
          </div>

          <div className='space-y-2 mb-6'>
            <Label htmlFor='description'>Description (optional)</Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is this payment for?'
              rows={3}
            />
          </div>

          <div className='space-y-4'>
            <h3 className='font-medium'>Select Payment Method</h3>
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
              expertCountry={expertCountry}
            />
          </div>

          {error && (
            <Alert variant='destructive' className='mt-6'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type='submit'
            className='w-full mt-6'
            disabled={loading || amount <= 0}
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Processing...
              </>
            ) : (
              `Continue to Pay ${formatCurrency(amount || 0, currency)}`
            )}
          </Button>
        </form>
      ) : (
        // Step 2: Enter payment method specific details and confirm
        <form onSubmit={handleSubmit}>
          <div className='mb-6'>
            <h3 className='font-medium text-gray-700 mb-2'>Payment Details</h3>
            <p className='text-sm text-gray-600'>
              Amount: {formatCurrency(amount, currency)}
            </p>
            {description && (
              <p className='text-sm text-gray-600'>
                Description: {description}
              </p>
            )}
            {isCrossBorder && (
              <p className='text-sm text-blue-600 mt-2'>
                <Globe className='h-4 w-4 inline mr-1' />
                Cross-border payment to {expertCountry}
              </p>
            )}
          </div>

          {/* Payment method specific UI */}
          {paymentMethod === 'card' && (
            <div className='space-y-2 mb-6'>
              <Label htmlFor='card-element'>Card Information</Label>
              <div className='border rounded-md p-3'>
                <CardElement
                  id='card-element'
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {paymentMethod === 'us_bank_account' && (
            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6'>
              <h3 className='font-medium text-yellow-800'>ACH Direct Debit</h3>
              <p className='text-sm text-yellow-700 mt-1'>
                To complete ACH payment, you will need to provide your bank
                account details and authorize the transaction.
              </p>
            </div>
          )}

          {paymentMethod === 'sepa_debit' && (
            <div className='bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6'>
              <h3 className='font-medium text-purple-800'>SEPA Direct Debit</h3>
              <p className='text-sm text-purple-700 mt-1'>
                You'll need to provide your IBAN and account holder details to
                proceed with SEPA payment.
              </p>
            </div>
          )}

          {paymentMethod === 'ideal' && (
            <div className='bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6'>
              <h3 className='font-medium text-orange-800'>iDEAL Payment</h3>
              <p className='text-sm text-orange-700 mt-1'>
                You'll be redirected to your bank's website to complete the
                payment.
              </p>
            </div>
          )}

          {paymentMethod === 'link' && (
            <div className='bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6'>
              <h3 className='font-medium text-teal-800'>Link by Stripe</h3>
              <p className='text-sm text-teal-700 mt-1'>
                Fast, secure checkout with your saved payment methods.
              </p>
            </div>
          )}

          {/* Cross-border payment additional info */}
          {isCrossBorder && (
            <Alert className='mb-6 bg-amber-50 border-amber-200'>
              <Info className='h-4 w-4 text-amber-600' />
              <AlertTitle className='text-amber-800'>
                Cross-Border Payment Processing
              </AlertTitle>
              <AlertDescription className='text-amber-700'>
                This payment will be processed using Stripe's cross-border
                payment system. The expert will receive the funds after
                processing, which may take 1-3 business days. Currency
                conversion fees may apply.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant='destructive' className='mb-6'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Payment Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className='flex gap-4'>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              onClick={() => setIntentCreated(false)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type='submit'
              className='flex-1'
              disabled={!stripe || loading}
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {isCrossBorder
                    ? 'Processing Cross-Border Payment...'
                    : 'Processing...'}
                </>
              ) : (
                `Pay ${formatCurrency(amount, currency)}`
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Page component
export default function PayExpertPage({
  params,
}: {
  params: { expertId: string };
}) {
  const { expertId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-500' />
      </div>
    );
  }

  if (!session || session.user?.role !== 'project manager') {
    router.push('/');
    return null;
  }

  return (
    <div className='max-w-md mx-auto py-12 px-4'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            Pay Expert
            <Globe className='h-5 w-5 text-gray-500' />
          </CardTitle>
          <CardDescription>
            Make a direct payment to this expert using your preferred payment
            method. Cross-border payments are automatically handled with secure
            processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise}>
            <PaymentForm expertId={expertId} />
          </Elements>
        </CardContent>
        <CardFooter className='flex justify-between text-xs text-gray-500'>
          <div>Payments processed securely by Stripe</div>
          <div>Cross-border support included</div>
        </CardFooter>
      </Card>
    </div>
  );
}
