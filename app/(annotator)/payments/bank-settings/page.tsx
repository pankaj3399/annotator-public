'use client';

import { useState, useEffect } from 'react';
import {
  createConnectAccount,
  getConnectAccountStatus,
} from '@/app/actions/stripe-connect';
import { useRouter, useSearchParams } from 'next/navigation';
import { SupportedCountry } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  DollarSign,
  CreditCard,
  FileText,
  Shield,
  PiggyBank,
  Globe,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
  { code: 'IS', name: 'Iceland' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AR', name: 'Argentina' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
];

export default function AnnotatorPaymentsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showCountrySelection, setShowCountrySelection] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user?.role !== 'annotator') {
      router.push('/');
      return;
    }

    fetchAccountStatus();

    // Check if returning from Stripe onboarding
    const refresh = searchParams.get('refresh');
    const success = searchParams.get('success');

    if (refresh === 'true' || success === 'true') {
      fetchAccountStatus();
    }
  }, [session, status, searchParams, router]);

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      const result = await getConnectAccountStatus();

      if (result.error) {
        setError(result.error);
      } else {
        setAccountStatus(result.status || null);
        setError(null);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch account status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAccount = async () => {
    // If account exists but is incomplete, go directly to Stripe
    if (accountStatus === 'incomplete') {
      proceedToStripeConnect();
    } else {
      // Show country selection for new accounts
      setShowCountrySelection(true);
    }
  };

  const proceedToStripeConnect = async (country: string | null = null) => {
    setShowInfoDialog(false);
    setShowCountrySelection(false);
    setLoading(true);
    setError(null);

    try {
      // For incomplete accounts, don't pass country (backend will use existing)
      const result =
        accountStatus === 'incomplete'
          ? await createConnectAccount()
          : country
            ? await createConnectAccount(country as SupportedCountry)
            : await createConnectAccount();

      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        // Redirect to Stripe onboarding
        window.location.href = result.url;
        return;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create Stripe account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = () => {
    if (!selectedCountry) {
      setError('Please select a country');
      return;
    }
    setShowCountrySelection(false);
    setShowInfoDialog(true);
  };

  const getStatusBadge = () => {
    if (!accountStatus) {
      return (
        <Badge variant='outline' className='bg-gray-100 text-gray-800'>
          Not set up
        </Badge>
      );
    }

    switch (accountStatus) {
      case 'active':
        return (
          <Badge variant='outline' className='bg-green-100 text-green-800'>
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant='outline' className='bg-yellow-100 text-yellow-800'>
            Pending
          </Badge>
        );
      case 'incomplete':
        return (
          <Badge variant='outline' className='bg-red-100 text-red-800'>
            Incomplete
          </Badge>
        );
      default:
        return (
          <Badge variant='outline' className='bg-gray-100 text-gray-800'>
            Unknown
          </Badge>
        );
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className='flex justify-center items-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-500' />
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto py-8 px-4'>
      <h1 className='text-3xl font-bold mb-8'>Payment Settings</h1>

      <div className='space-y-8'>
        {/* Account Status Card */}
        <Card>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <div>
                <CardTitle className='flex items-center'>
                  <DollarSign className='h-5 w-5 mr-2 text-primary' />
                  Payment Account Status
                </CardTitle>
                <CardDescription>
                  Manage your Stripe Connect account for receiving payments
                </CardDescription>
              </div>
              <div>{getStatusBadge()}</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className='mb-6'>
              <div className='mb-4'>
                {!accountStatus && (
                  <div className='p-4 bg-gray-50 rounded-lg border border-gray-100 mb-4'>
                    <p className='text-gray-700 mb-2'>
                      <strong>Not Set Up:</strong> You need to create a Stripe
                      Connect account to receive payments from project managers.
                    </p>
                    <p className='text-gray-600 text-sm'>
                      Setting up your account typically takes 5-10 minutes.
                      You'll need identification and banking information.
                    </p>
                  </div>
                )}
                {accountStatus === 'active' && (
                  <div className='p-4 bg-green-50 rounded-lg border border-green-100 mb-4'>
                    <p className='text-green-700 flex items-center mb-2'>
                      <CheckCircle className='h-5 w-5 mr-2' />
                      <strong>Account Active:</strong> Your Stripe Connect
                      account is fully set up and ready to receive payments.
                    </p>
                    <p className='text-green-600 text-sm'>
                      You can view your balance and payment history directly in
                      your Stripe dashboard.
                    </p>
                  </div>
                )}
                {accountStatus === 'pending' && (
                  <div className='p-4 bg-yellow-50 rounded-lg border border-yellow-100 mb-4'>
                    <p className='text-yellow-700 mb-2'>
                      <strong>Account Pending:</strong> Your account is under
                      review by Stripe.
                    </p>
                    <p className='text-yellow-600 text-sm'>
                      This process typically takes 1-2 business days. You'll
                      receive an email when your account is approved.
                    </p>
                  </div>
                )}
                {accountStatus === 'incomplete' && (
                  <div className='p-4 bg-red-50 rounded-lg border border-red-100 mb-4'>
                    <p className='text-red-700 mb-2'>
                      <strong>Setup Incomplete:</strong> You need to finish
                      setting up your Stripe Connect account.
                    </p>
                    <p className='text-red-600 text-sm'>
                      Click below to continue the setup process where you left
                      off.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant='destructive' className='mb-4'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {(!accountStatus || accountStatus === 'incomplete') && (
                <Button
                  onClick={handleSetupAccount}
                  disabled={loading}
                  size='lg'
                  className='w-full sm:w-auto'
                >
                  {loading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />{' '}
                      Processing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className='mr-2 h-4 w-4' />
                      {accountStatus === 'incomplete'
                        ? 'Continue Stripe Setup'
                        : 'Set Up Payment Account'}
                    </>
                  )}
                </Button>
              )}

              {accountStatus === 'active' && (
                <div className='flex flex-col sm:flex-row gap-4'>
                  <Button
                    variant='outline'
                    onClick={() =>
                      window.open('https://dashboard.stripe.com/', '_blank')
                    }
                    className='flex-1'
                  >
                    <ExternalLink className='mr-2 h-4 w-4' /> View Stripe
                    Dashboard
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* About Payments Card */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <FileText className='h-5 w-5 mr-2 text-primary' />
              About Payments
            </CardTitle>
            <CardDescription>How payment processing works</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='flex items-start'>
                  <div className='bg-primary/10 p-2 rounded-lg mr-3'>
                    <CreditCard className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-medium mb-1'>Direct Payments</h3>
                    <p className='text-gray-600 text-sm'>
                      Receive payments directly for your work, with funds
                      automatically transferred to your bank account.
                    </p>
                  </div>
                </div>

                <div className='flex items-start'>
                  <div className='bg-primary/10 p-2 rounded-lg mr-3'>
                    <PiggyBank className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-medium mb-1'>Automatic Deposits</h3>
                    <p className='text-gray-600 text-sm'>
                      Set up automatic deposits to your bank account on your
                      preferred schedule.
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <div className='flex items-start'>
                  <div className='bg-primary/10 p-2 rounded-lg mr-3'>
                    <Shield className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-medium mb-1'>Secure Handling</h3>
                    <p className='text-gray-600 text-sm'>
                      Your banking information is securely handled by Stripe and
                      never stored on our servers.
                    </p>
                  </div>
                </div>

                <div className='flex items-start'>
                  <div className='bg-primary/10 p-2 rounded-lg mr-3'>
                    <DollarSign className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h3 className='font-medium mb-1'>Track Earnings</h3>
                    <p className='text-gray-600 text-sm'>
                      Monitor all your earnings in one place through your Stripe
                      dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Selection Dialog */}
      <Dialog
        open={showCountrySelection}
        onOpenChange={setShowCountrySelection}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center'>
              <Globe className='h-5 w-5 mr-2' />
              Select Your Country
            </DialogTitle>
            <DialogDescription>
              Choose the country where you legally reside and have banking
              access. This cannot be changed later.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div>
              <label
                htmlFor='country-select'
                className='block text-sm font-medium mb-2'
              >
                Country/Region
              </label>
              <Select
                value={selectedCountry}
                onValueChange={setSelectedCountry}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Choose your country...' />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Your Stripe account will be permanently tied to this country.
                Make sure to select the country where you legally reside and
                have banking access.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>Cancel</Button>
            </DialogClose>
            <Button onClick={handleCountrySelect} disabled={!selectedCountry}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stripe Connect Information Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='text-xl'>
              Setting Up Your Stripe Connect Account
            </DialogTitle>
            <DialogDescription>
              Here's what you need to know before proceeding to Stripe
              {selectedCountry && (
                <span className='block mt-1 font-medium'>
                  Account will be created for:{' '}
                  {
                    SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry)
                      ?.name
                  }
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue='requirements'>
            <TabsList className='grid grid-cols-3 mb-4'>
              <TabsTrigger value='requirements'>Requirements</TabsTrigger>
              <TabsTrigger value='process'>Process</TabsTrigger>
              <TabsTrigger value='faq'>FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value='requirements' className='space-y-4'>
              <div className='border rounded-lg p-4'>
                <h3 className='font-medium text-lg mb-3'>
                  You'll need to provide:
                </h3>
                <ul className='space-y-2'>
                  <li className='flex items-start'>
                    <CheckCircle className='h-5 w-5 mr-2 text-green-600 mt-0.5' />
                    <div>
                      <strong>Personal Information</strong>
                      <p className='text-sm text-gray-600'>
                        Full name, date of birth, address, phone number, and
                        email
                      </p>
                    </div>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-5 w-5 mr-2 text-green-600 mt-0.5' />
                    <div>
                      <strong>Identification</strong>
                      <p className='text-sm text-gray-600'>
                        Government-issued photo ID (driver's license, passport,
                        etc.)
                      </p>
                    </div>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-5 w-5 mr-2 text-green-600 mt-0.5' />
                    <div>
                      <strong>Banking Information</strong>
                      <p className='text-sm text-gray-600'>
                        Bank account and routing numbers for receiving payouts
                      </p>
                    </div>
                  </li>
                  <li className='flex items-start'>
                    <CheckCircle className='h-5 w-5 mr-2 text-green-600 mt-0.5' />
                    <div>
                      <strong>Tax Information</strong>
                      <p className='text-sm text-gray-600'>
                        Social Security Number (for US individuals) or Tax ID
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className='bg-yellow-50 border border-yellow-100 rounded-lg p-4'>
                <p className='text-yellow-800 text-sm'>
                  <strong>Important:</strong> Make sure the information you
                  provide matches your official records to avoid verification
                  issues.
                </p>
              </div>
            </TabsContent>

            <TabsContent value='process' className='space-y-4'>
              <div className='border rounded-lg p-4'>
                <h3 className='font-medium text-lg mb-3'>
                  Here's what to expect:
                </h3>

                <ol className='space-y-4'>
                  <li className='flex'>
                    <div className='flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-3'>
                      1
                    </div>
                    <div>
                      <h4 className='font-medium'>Account Creation</h4>
                      <p className='text-sm text-gray-600'>
                        After clicking "Continue," you'll be redirected to
                        Stripe where you'll create your Express account.
                      </p>
                    </div>
                  </li>

                  <li className='flex'>
                    <div className='flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-3'>
                      2
                    </div>
                    <div>
                      <h4 className='font-medium'>Verification Process</h4>
                      <p className='text-sm text-gray-600'>
                        Provide your personal, financial, and tax information.
                        This typically takes 5-10 minutes.
                      </p>
                    </div>
                  </li>

                  <li className='flex'>
                    <div className='flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-3'>
                      3
                    </div>
                    <div>
                      <h4 className='font-medium'>Stripe Review</h4>
                      <p className='text-sm text-gray-600'>
                        Stripe will review your information, which usually takes
                        1-2 business days.
                      </p>
                    </div>
                  </li>

                  <li className='flex'>
                    <div className='flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-3'>
                      4
                    </div>
                    <div>
                      <h4 className='font-medium'>Account Activation</h4>
                      <p className='text-sm text-gray-600'>
                        Once approved, your account will be activated, and
                        you'll be able to receive payments.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </TabsContent>

            <TabsContent value='faq' className='space-y-4'>
              <div className='border rounded-lg p-4 space-y-4'>
                <div>
                  <h4 className='font-medium'>
                    Are there any fees for using Stripe Connect?
                  </h4>
                  <p className='text-sm text-gray-600 mt-1'>
                    Our platform charges a 5% fee on each transaction. This fee
                    is automatically deducted from payments you receive.
                  </p>
                </div>

                <div>
                  <h4 className='font-medium'>
                    How long does it take to receive money in my bank account?
                  </h4>
                  <p className='text-sm text-gray-600 mt-1'>
                    Typically 2-3 business days after a payment is made, but
                    this can vary depending on your bank and location.
                  </p>
                </div>

                <div>
                  <h4 className='font-medium'>Is my information secure?</h4>
                  <p className='text-sm text-gray-600 mt-1'>
                    Yes, Stripe is a PCI-compliant payment processor that uses
                    bank-level security to protect your data.
                  </p>
                </div>

                <div>
                  <h4 className='font-medium'>
                    What if I need to update my information later?
                  </h4>
                  <p className='text-sm text-gray-600 mt-1'>
                    You can update your information at any time through your
                    Stripe Dashboard.
                  </p>
                </div>

                <div>
                  <h4 className='font-medium'>
                    Can I use my existing Stripe account?
                  </h4>
                  <p className='text-sm text-gray-600 mt-1'>
                    No, you'll need to create a new Stripe Connect account
                    specifically for our platform.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className='flex flex-col sm:flex-row gap-3'>
            <DialogClose asChild>
              <Button variant='outline'>Cancel</Button>
            </DialogClose>
            <Button onClick={() => proceedToStripeConnect(selectedCountry)}>
              Continue to Stripe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
