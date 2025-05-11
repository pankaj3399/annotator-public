'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { approveWishlistItem } from '@/app/actions/product';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { stripe } from '@/app/actions/stripe';
import { Badge } from './ui/badge';

interface ApproveButtonProps {
  wishlistId: string;
  item: any;
}

export default function ApproveButton({
  wishlistId,
  item,
}: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentHandled, setPaymentHandled] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if payment is already handled in sessionStorage
    const status = searchParams.get('payment');
    const isPaymentProcessed = sessionStorage.getItem('paymentProcessed');

    if (isPaymentProcessed === 'true') {
      return; // Don't process payment if it's already handled
    }

    if (status === 'cancelled' && !paymentHandled) {
      toast.error('Payment was cancelled. Please try again.');
      setPaymentHandled(true);
      sessionStorage.setItem('paymentProcessed', 'true'); // Mark payment as processed
    } else if (status === 'success' && !paymentHandled) {
      toast.success('Payment was successful.');
      handleApprove(); // Handle approval after successful payment
      setPaymentStatus(status);
      setPaymentHandled(true);
      sessionStorage.setItem('paymentProcessed', 'true'); // Mark payment as processed
    }
  }, [searchParams, paymentHandled]);

  const handleApprove = async () => {
    try {
      const itemId = item._id;
      setIsLoading(true);
      await approveWishlistItem(wishlistId, itemId);
      toast.success('Wishlist item approved successfully');
    } catch (error) {
      console.error('Error approving wishlist item:', error);
      toast.error('Error approving wishlist item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      const stripeData = {
        id: wishlistId.toString(),
        name: item.catalog_details.name,
        itemId: item._id,
        // price: parseFloat(item.catalog_details.price),
        type: 'product',
      };
      const { url } = await stripe(stripeData);
      if (url) {
        router.push(url); // Redirect to Stripe checkout URL
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Payment error:', error);
      toast.error('Error processing payment. Please try again.');
    }
  };

  console.log(item);
  if (item.payment_data?.stripe_payment_intent) {
    return (
      <Badge
        variant='default'
        className='bg-green-500 hover:bg-green-600 text-white'
      >
        Paid
      </Badge>
    );
  }

  return (
    <Button size='sm' onClick={handlePayment} disabled={isLoading}>
      {isLoading ? 'Redirecting...' : 'Pay now'}
    </Button>
  );
}
