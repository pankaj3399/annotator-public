'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function PaymentsManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const processingStatus = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');

  // Redirect non-project managers
  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user?.role !== 'project manager') {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center min-h-[60vh]'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto py-12 px-4'>
      <h1 className='text-3xl font-bold mb-8'>Payments</h1>

      {success === 'true' && (
        <Alert className='mb-8 bg-green-50 border-green-200 text-green-800'>
          <CheckCircle className='h-5 w-5 text-green-600' />
          <AlertTitle className='text-lg font-semibold'>
            Payment Successful!
          </AlertTitle>
          <AlertDescription className='text-green-700'>
            Your payment has been processed successfully. The annotator will be
            notified of the payment.
          </AlertDescription>
        </Alert>
      )}

      {processingStatus === 'processing' && (
        <Alert className='mb-8 bg-blue-50 border-blue-200 text-blue-800'>
          <AlertCircle className='h-5 w-5 text-blue-600' />
          <AlertTitle className='text-lg font-semibold'>
            Payment Processing
          </AlertTitle>
          <AlertDescription className='text-blue-700'>
            Your payment is being processed. This may take a few moments to
            complete.
          </AlertDescription>
        </Alert>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <FileText className='h-5 w-5 mr-2 text-primary' />
              Payment History
            </CardTitle>
            <CardDescription>
              View all your payments to annotators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600'>
              Access your complete payment history, including transaction
              details, status, and recipient information.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant='outline'
              className='w-full'
              onClick={() => router.push('/payments/history')}
            >
              View Payment History
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <ArrowLeft className='h-5 w-5 mr-2 text-primary' />
              Return to Dashboard
            </CardTitle>
            <CardDescription>Go back to your main dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600'>
              Return to the project management dashboard to manage your
              projects, annotators, and tasks.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className='w-full'
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Questions about payments or transaction issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-gray-600 mb-4'>
            If you have any questions about your payment or need assistance with
            transaction issues, our support team is here to help.
          </p>
          <div className='bg-gray-50 p-4 rounded-lg border border-gray-100'>
            <h3 className='font-medium text-gray-800 mb-2'>Payment Support</h3>
            <p className='text-sm text-gray-600 mb-3'>
              For payment-related inquiries, please contact us at{' '}
              <span className='font-medium'>support@blomegalab.com</span>
            </p>
            <p className='text-sm text-gray-600'>
              Please include the payment ID and annotator name in your email for
              faster assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
