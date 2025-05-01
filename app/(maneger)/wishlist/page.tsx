'use client'
import { useState, useEffect } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
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

export default function PMWishlistsPage() {
  const [wishlists, setWishlists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle session check here
  useEffect(() => {
    const fetchWishlists = async () => {
      try {
        // Fetch wishlists data
        const response = await getWishlists();
        setWishlists(response); // Set fetched wishlists
      } catch (error) {
        setError("Failed to fetch wishlists.");
      } finally {
        setIsLoading(false); // Set loading to false after data is fetched
      }
    };

    fetchWishlists();
  }, []); // Empty dependency array ensures this runs only once on component mount

  // If the data is loading, show a loading indicator
  if (isLoading) {
    return <div> <Loader/> </div>;
  }

  // If there's an error fetching the data, show the error message
  if (error) {
    return <div>{error}</div>;
  }

  // Flatten the wishlist items with proper typing
  const flattenedItems = wishlists.flatMap((wishlist: any) =>
    wishlist.items.map((item: any) => ({
      ...item, // This includes the item details
      expertName: wishlist.expert.name, // Adding expert name
      expertEmail: wishlist.expert.email, // Adding expert email
      wishlistId: wishlist._id, // Adding the wishlist ID
    }))
  );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Expert Wishlists</h1>
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
              <TableRow key={item._id}>
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
                        {item.request_details.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.request_details.description}
                      </div>
                      <a
                        href={item.request_details.product_url}
                        className="text-blue-500 hover:underline text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Product
                      </a>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">
                        {item.catalog_details.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.catalog_details.description}
                      </div>
                      {item.catalog_details.image_url && (
                        <img
                          src={
                            item.catalog_details.image_url || "/placeholder.svg"
                          }
                          alt={item.catalog_details.name}
                          className="w-16 h-16 object-cover mt-1 rounded"
                        />
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  $
                  {(item.is_external_request
                    ? 0 // External requests might not have a price
                    : item.catalog_details.price
                  ).toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {item.shipping_address.street},<br />
                    {item.shipping_address.city}, {item.shipping_address.state}
                    <br />
                    {item.shipping_address.postal_code},{" "}
                    {item.shipping_address.country}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(item.created_at).toLocaleDateString()}
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
    </div>
  );
}
