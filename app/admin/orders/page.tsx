"use client";

import { getPaidWishlistProducts } from "@/app/actions/product";
import type React from "react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingBag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  total_price_paid: number;
  paid_at: string;
  stripe_payment_intent: string;
  user_details: {
    userId: string;
    userName: string;
    email: string;
  };
}

const OrdersPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const result = await getPaidWishlistProducts();
        setProducts(result);
      } catch (err) {
        setError("Failed to fetch products. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <ShoppingBag className="mr-2" />
            Paid Wishlist Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Total Price Paid</TableHead>
                  <TableHead>Payment intent reference</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.stripe_payment_intent}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      ${product.total_price_paid.toFixed(2)}
                    </TableCell>
                    {/* <TableCell className="text-blue-500 underline">{product.stripe_payment_intent}</TableCell> */}
                    <TableCell>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(product.stripe_payment_intent);
                          toast.success("Payment intent ID copied!");
                        }}
                        className="text-blue-500 underline"
                      >
                        {product.stripe_payment_intent}
                      </button>
                    </TableCell>
                    <TableCell>
                      {new Date(product.paid_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>{product.user_details.userName}</div>
                      <div className="text-sm text-gray-500">
                        {product.user_details.email}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;
