"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveWishlistItem } from "@/app/actions/product";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { stripe } from "@/app/actions/stripe";
import { Badge } from "./ui/badge";

interface ApproveButtonProps {
  wishlistId: string;
  item: any;
}

export default function ApproveButton({
  wishlistId,
  item,
}: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentStatus = searchParams.get("payment");
  if (paymentStatus === "cancelled") {
    toast.error("Payment was cancelled. Please try again.");
  } else if (paymentStatus === "success") {
    toast.success("Payment was successful.");
  }

  console.log("approveButton", item);

  // const handleApprove = async () => {
  //   try {
  //     setIsLoading(true);
  //     await approveWishlistItem(wishlistId, itemId);
  //     // Optionally refresh the page or update the UI
  //     toast.success("Wishlist item approved successfully");
  //     // window.location.reload();
  //   } catch (error) {
  //     console.error("Error approving wishlist item:", error);
  //     // You might want to show an error toast here
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      const stripeData = {
        id: wishlistId.toString(),
        name: item.catalog_details.name,
        itemId: item._id,
        price: parseFloat(item.catalog_details.price),
        type: "product",
      };
      console.log(stripeData);
      //@ts-ignore
      const { url, session } = await stripe(stripeData);
      if (url) {
        router.push(url);
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Payment error:", error);
    }
  };

  if (item.payment_data?.stripe_payment_intent) {
    return (
      <Badge
        variant="default"
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        Paid
      </Badge>
    );
  }
  return (
    <Button size="sm" onClick={handlePayment} disabled={isLoading}>
      {isLoading ? "Redirecting..." : "Pay now"}
    </Button>
  );
}
