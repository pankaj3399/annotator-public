'use client'
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ApproveButton from "@/components/ApproveButton";
import { getWishlists } from "@/app/actions/stripe";
import Loader from "@/components/ui/NewLoader/Loader";

// Define types for better TypeScript support
interface WishlistItem {
  _id: string;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  status: string;
  created_at: string;
  is_external_request: boolean;
  catalog_details?: {
    product_id?: string;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    admin?: string;
  };
  request_details?: {
    name: string;
    description: string;
    product_url: string;
    submitted_by?: string;
  };
  payment_data?: {
    stripe_payment_intent?: string;
    payment_status: string;
    total_price_paid?: number;
    paid_at?: string;
    paid_by?: string;
  };
}

interface Wishlist {
  _id: string;
  expert: {
    _id: string;
    name: string;
    email: string;
  };
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}

interface FlattenedItem extends WishlistItem {
  expertName: string;
  expertEmail: string;
  wishlistId: string;
}

export default function PMWishlistsPage() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fetch function to prevent infinite re-renders
  const fetchWishlists = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await getWishlists();
      setWishlists(response || []); // Ensure we always have an array
    } catch (error) {
      console.error('Error fetching wishlists:', error);
      setError("Failed to fetch wishlists.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on anything

  useEffect(() => {
    fetchWishlists();
  }, [fetchWishlists]); // Now we can safely include fetchWishlists as a dependency

  // If the data is loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // If there's an error fetching the data, show the error message
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-red-500 text-center">{error}</div>
        <div className="text-center mt-4">
          <Button onClick={fetchWishlists}>Retry</Button>
        </div>
      </div>
    );
  }

  // Safe flattening with proper error handling
  const flattenedItems: FlattenedItem[] = wishlists.flatMap((wishlist: Wishlist) => {
    if (!wishlist?.items || !Array.isArray(wishlist.items)) {
      return [];
    }
    
    return wishlist.items.map((item: WishlistItem) => ({
      ...item,
      expertName: wishlist.expert?.name || 'Unknown Expert',
      expertEmail: wishlist.expert?.email || 'No email',
      wishlistId: wishlist._id,
    }));
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Expert Wishlists</h1>
        <Button onClick={fetchWishlists} variant="outline">
          Refresh
        </Button>
      </div>
      
      {flattenedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No wishlist items found.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expert</TableHead>
                <TableHead>Product Details</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Shipping Address</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedItems.map((item) => (
                <TableRow key={`${item.wishlistId}-${item._id}`}>
                  <TableCell>
                    <div>
                      <div>{item.expertName}</div>
                      <div className="text-sm text-gray-500">
                        {item.expertEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.is_external_request ? (
                      <div>
                        <div className="font-medium">
                          {item.request_details?.name || 'External Request'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.request_details?.description}
                        </div>
                        {item.request_details?.product_url && (
                          <a
                            href={item.request_details.product_url}
                            className="text-blue-500 hover:underline text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Product
                          </a>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">
                          {item.catalog_details?.name || 'Catalog Item'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.catalog_details?.description}
                        </div>
                        {item.catalog_details?.image_url && (
                          <img
                            src={item.catalog_details.image_url || "/placeholder.svg"}
                            alt={item.catalog_details.name || 'Product'}
                            className="w-16 h-16 object-cover mt-1 rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    $
                    {(item.is_external_request
                      ? 0
                      : item.catalog_details?.price || 0
                    ).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {item.shipping_address ? (
                      <div className="text-sm">
                        {item.shipping_address.street},<br />
                        {item.shipping_address.city}, {item.shipping_address.state}
                        <br />
                        {item.shipping_address.postal_code},{" "}
                        {item.shipping_address.country}
                      </div>
                    ) : (
                      <span className="text-gray-500">No address</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.created_at 
                      ? new Date(item.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {!item.is_external_request && (
                      <ApproveButton
                        wishlistId={item.wishlistId.toString()}
                        item={item}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}