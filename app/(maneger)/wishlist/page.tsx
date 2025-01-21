import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { approveWishlistItem } from "@/app/actions/product";
import { Wishlist } from "@/models/Wishlist";
import { connectToDatabase } from "@/lib/db";
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
import { authOptions } from "@/auth";

export default async function PMWishlistsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "project manager") {
    redirect("/");
  }

  await connectToDatabase();

  // Only populate the expert (user) field since catalog_details and request_details are embedded
  const wishlists = await Wishlist.find().populate({
    path: "expert",
    select: "name email", // Only select needed fields
  });

  // Flatten the wishlist items with proper typing
  const flattenedItems = wishlists.flatMap((wishlist) =>
    wishlist.items.map((item: any) => ({
      ...item.toObject(),
      expertName: wishlist.expert.name,
      expertEmail: wishlist.expert.email,
      wishlistId: wishlist._id,
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
              <TableHead>Status</TableHead>
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
                  <Badge
                    variant={
                      item.status === "approved"
                        ? "default"
                        : item.status === "pending"
                          ? "secondary"
                          : item.status === "purchased"
                            ? "default"
                            : "destructive"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(item.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {item.status === "pending" && (
                    <Button size="sm">Approve</Button>
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
