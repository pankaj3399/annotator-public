"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Link } from "lucide-react";
import { addToWishlist } from "@/app/actions/product";
import { toast } from "sonner";

interface ExternalProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

export function ExternalProductDialog({
  isOpen,
  onClose,
  session,
}: ExternalProductDialogProps) {
  const [externalProduct, setExternalProduct] = useState({
    name: "",
    description: "",
    product_url: "",
  });
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error("Please log in to add products to your wishlist.");
      return;
    }
    try {
      const result = await addToWishlist(
        {
          externalRequest: {
            name: externalProduct.name || "External Product", // You might want to add name field to your form
            description: externalProduct.description,
            product_url: externalProduct.product_url,
          },
          address // Make sure you're collecting address for external products too
        }
      );

      if (result.success) {
        toast.success("External product submitted for approval!");
        setExternalProduct({ product_url: "", description: "", name: "" }); // Remove price if not needed
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error submitting external product:", error);
      toast.error("Failed to add product to wishlist.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request External Product</DialogTitle>
          <DialogDescription>
            Submit an external product for approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleExternalSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                id="product_url"
                type="url"
                value={externalProduct.product_url}
                onChange={(e) =>
                  setExternalProduct({
                    ...externalProduct,
                    product_url: e.target.value,
                  })
                }
                required
                placeholder="Product URL"
              />
            </div>
            <div className="col-span-2">
              <Textarea
                id="description"
                value={externalProduct.description}
                onChange={(e) =>
                  setExternalProduct({
                    ...externalProduct,
                    description: e.target.value,
                  })
                }
                required
                placeholder="Product description"
                rows={2}
              />
            </div>
            <Input
              id="street"
              value={address.street}
              onChange={(e) =>
                setAddress({ ...address, street: e.target.value })
              }
              required
              placeholder="Street"
            />
            <Input
              id="city"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              required
              placeholder="City"
            />
            <Input
              id="state"
              value={address.state}
              onChange={(e) =>
                setAddress({ ...address, state: e.target.value })
              }
              required
              placeholder="State"
            />
            <Input
              id="postal_code"
              value={address.postal_code}
              onChange={(e) =>
                setAddress({ ...address, postal_code: e.target.value })
              }
              required
              placeholder="Postal Code"
            />
            <div className="col-span-2">
              <Input
                id="country"
                value={address.country}
                onChange={(e) =>
                  setAddress({ ...address, country: e.target.value })
                }
                required
                placeholder="Country"
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            <Link className="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
