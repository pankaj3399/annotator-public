"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { addToWishlist, AddToWishlistParams } from "@/app/actions/product";
import { Toast } from "./ui/toast";

interface WishlistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  session: any;
}

export function WishlistDialog({
  isOpen,
  onClose,
  product,
  session,
}: WishlistDialogProps) {
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error("Please log in to add products to your wishlist.");
      return;
    }

    try {
      const payload = { productId: product._id, address };

      const result = await addToWishlist(payload);

      if (result.success) {
        toast.success("Successfully added to wishlist");
        setAddress({
          street: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
        });
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error adding product to wishlist:", error);
      toast("Failed to add product to wishlist.");
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Wishlist</DialogTitle>
          <DialogDescription>
            Confirm the product details and provide your address to add this
            item to your wishlist.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start space-x-4 mb-4">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-20 h-20 object-cover rounded"
          />
          <div>
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.description}
            </p>
            <p className="font-bold mt-1">${product.price.toFixed(2)}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="street" className="block text-sm font-medium mb-1">
              Street Address
            </label>
            <Input
              id="street"
              value={address.street}
              onChange={(e) =>
                setAddress({ ...address, street: e.target.value })
              }
              required
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">
              City
            </label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              required
              placeholder="New York"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium mb-1">
              State
            </label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) =>
                setAddress({ ...address, state: e.target.value })
              }
              required
              placeholder="NY"
            />
          </div>
          <div>
            <label
              htmlFor="postal_code"
              className="block text-sm font-medium mb-1"
            >
              Postal Code
            </label>
            <Input
              id="postal_code"
              value={address.postal_code}
              onChange={(e) =>
                setAddress({ ...address, postal_code: e.target.value })
              }
              required
              placeholder="10001"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1">
              Country
            </label>
            <Input
              id="country"
              value={address.country}
              onChange={(e) =>
                setAddress({ ...address, country: e.target.value })
              }
              required
              placeholder="United States"
            />
          </div>
          <Button type="submit" className="w-full">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Wishlist
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
