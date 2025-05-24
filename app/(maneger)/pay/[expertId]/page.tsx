'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement, PaymentElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createPaymentIntent } from '@/app/actions/stripe-connect';
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
import { Loader2, AlertCircle, CheckCircle, CreditCard, Wallet, Clock, BanknoteIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAnnotatorById } from '@/app/actions/annotator';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Payment method types
type PaymentMethodType = 'card' | 'us_bank_account' | 'sepa_debit' | 'ideal' | 'link';

// Payment Method Selector Component
function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange 
}: { 
  selectedMethod: PaymentMethodType, 
  onMethodChange: (method: PaymentMethodType) => void 
}) {
  return (
    <RadioGroup 
      value={selectedMethod} 
      onValueChange={(value) => onMethodChange(value as PaymentMethodType)}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className={`border rounded-lg p-4 cursor-pointer ${selectedMethod === 'card' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
        <RadioGroupItem value="card" id="card" className="sr-only" />
        <Label htmlFor="card" className="flex items-center cursor-pointer">
          <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
          <div>
            <div className="font-medium">Credit Card</div>
            <div className="text-sm text-gray-500">Pay with Visa, Mastercard, Amex, etc.</div>
          </div>
        </Label>
      </div>

    </RadioGroup>
  );
}

// Payment form component
function PaymentForm({ expertId }: { expertId: string }) {
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [expert, setExpert] = useState<any>(null);
  const [expertLoading, setExpertLoading] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentCreated, setIntentCreated] = useState(false);
const [paymentId, setPaymentId] = useState<string | null>(null);


  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  // Fetch expert details
  useEffect(() => {
    const fetchExpert = async () => {
      try {
        setExpertLoading(true);
        const result = await getAnnotatorById(expertId);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        if (result.data) {
          setExpert(JSON.parse(result.data));
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load expert details');
      } finally {
        setExpertLoading(false);
      }
    };

    fetchExpert();
  }, [expertId]);

  // Create payment intent when amount is confirmed
  const createIntent = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent on the server
      const result = await createPaymentIntent(
        expertId,
        'direct-payment', 
        amount,
        description || 'Payment for expert services',
        paymentMethod // Pass the selected payment method
      );

      if (result.error) {
        throw new Error(result.error);
      }

      setClientSecret(result.clientSecret!);
      if (result.paymentId) {
      setPaymentId(result.paymentId);
    }
      setIntentCreated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment. Please try again.');
    } finally {
      setLoading(false);
    }
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
          paymentResult = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: {
                card: elements.getElement(CardElement)!,
              },
            }
          );
          break;
          
        case 'us_bank_account':
          // For ACH, you might need to collect additional details
          paymentResult = await stripe.confirmUsBankAccountPayment(clientSecret);
          break;
          
        case 'sepa_debit':
          // For SEPA, you'll need to collect IBAN information first
          paymentResult = await stripe.confirmSepaDebitPayment(
            clientSecret,
            {
              payment_method: {
                sepa_debit: {
                  iban: 'IBAN_NUMBER', // This should be collected from the user
                },
                billing_details: {
                  name: 'ACCOUNT_HOLDER_NAME', // This should be collected from the user
                  email: 'EMAIL', // This should be collected from the user
                },
              },
            }
          );
          break;
          
        case 'ideal':
          paymentResult = await stripe.confirmIdealPayment(
            clientSecret,
            {
              payment_method: {
                ideal: {
                  bank: 'abn_amro', // This should be selected by the user
                },
              },
              return_url: `${window.location.origin}/payments-manager?success=true`,
            }
          );
          break;
          
        case 'link':
          paymentResult = await stripe.confirmLinkPayment(
            clientSecret,
            {
              payment_method: 'link',
            }
          );
          break;
          
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      if (paymentResult.error) {
        throw new Error(paymentResult.error.message);
      }

      // Check if payment needs additional actions
      if (paymentResult.paymentIntent) {
        if (paymentResult.paymentIntent.status === 'succeeded') {
          // Payment is complete
          setSuccess(true);
          setTimeout(() => {
    router.push(`/payments-manager?success=true&payment_id=${paymentId}`);
          }, 2000);
        } else if (paymentResult.paymentIntent.status === 'requires_action') {
          // Payment requires additional action (e.g., 3D Secure)
          // Stripe.js will handle this automatically
        } else if (paymentResult.paymentIntent.status === 'processing') {
          // Payment is processing (common for bank transfers)
          setSuccess(true);
          setTimeout(() => {
    router.push(`/payments-manager?status=processing&payment_id=${paymentId}`);
          }, 2000);
        }
      } else {
        // Payment might be handled via redirect (e.g., iDEAL)
        // The return_url will handle the final status
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (expertLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error && !expert) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            className="ml-2 mt-2" 
            variant="outline" 
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
      <Alert className="my-8 bg-green-50 border-green-200 text-green-800">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle>Payment Successful!</AlertTitle>
        <AlertDescription className="text-green-700">
          Your payment is being processed. You'll be redirected to the payments page shortly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!intentCreated ? (
        // Step 1: Enter payment details
        <form onSubmit={(e) => { e.preventDefault(); createIntent(); }}>
          {expert && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-gray-700">Expert Details</h3>
              <p className="text-sm text-gray-600 mt-1">Name: {expert.name}</p>
              <p className="text-sm text-gray-600">Email: {expert.email}</p>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2 mb-6">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this payment for?"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Select Payment Method</h3>
            <PaymentMethodSelector 
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={loading || amount <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              `Continue to Pay $${amount ? amount.toFixed(2) : '0.00'}`
            )}
          </Button>
        </form>
      ) : (
        // Step 2: Enter payment method specific details and confirm
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Payment Details</h3>
            <p className="text-sm text-gray-600">Amount: ${amount.toFixed(2)}</p>
            {description && (
              <p className="text-sm text-gray-600">Description: {description}</p>
            )}
          </div>

          {paymentMethod === 'card' && (
            <div className="space-y-2 mb-6">
              <Label htmlFor="card-element">Card Information</Label>
              <div className="border rounded-md p-3">
                <CardElement
                  id="card-element"
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

          {/* For other payment methods, we would display method-specific inputs */}
          {paymentMethod === 'us_bank_account' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-yellow-800">ACH Direct Debit</h3>
              <p className="text-sm text-yellow-700 mt-1">
                To complete ACH payment, you will need to provide your bank account details and authorize the transaction.
              </p>
            </div>
          )}

          {paymentMethod === 'sepa_debit' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-purple-800">SEPA Direct Debit</h3>
              <p className="text-sm text-purple-700 mt-1">
                You'll need to provide your IBAN and account holder details to proceed with SEPA payment.
              </p>
            </div>
          )}

          {paymentMethod === 'ideal' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-orange-800">iDEAL Payment</h3>
              <p className="text-sm text-orange-700 mt-1">
                You'll be redirected to your bank's website to complete the payment.
              </p>
            </div>
          )}

          {paymentMethod === 'link' && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-teal-800">Link by Stripe</h3>
              <p className="text-sm text-teal-700 mt-1">
                Fast, secure checkout with your saved payment methods.
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIntentCreated(false)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!stripe || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Page component
export default function PayExpertPage({ params }: { params: { expertId: string } }) {
  const { expertId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'project manager') {
    router.push('/');
    return null;
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Pay Expert</CardTitle>
          <CardDescription>
            Make a direct payment to this expert using your preferred payment method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise}>
            <PaymentForm expertId={expertId} />
          </Elements>
        </CardContent>
        <CardFooter className="flex justify-between text-xs text-gray-500">
          <div>Payments processed securely by Stripe</div>
        </CardFooter>
      </Card>
    </div>
  );
}