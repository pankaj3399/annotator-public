"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveWishlistItem } from "@/app/actions/product";
import { toast } from "sonner";

interface ApproveButtonProps {
  wishlistId: string;
  itemId: string;
}

export default function ApproveButton({
  wishlistId,
  itemId,
}: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      await approveWishlistItem(wishlistId, itemId);
      // Optionally refresh the page or update the UI
      toast.success("Wishlist item approved successfully");
      // window.location.reload();
    } catch (error) {
      console.error("Error approving wishlist item:", error);
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleApprove} disabled={isLoading}>
      {isLoading ? "Approving..." : "Approve"}
    </Button>
  );
}
