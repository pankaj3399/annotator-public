"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "next-auth/react";
import { fetchProducts } from "@/app/actions/product";
import { Loader2, ShoppingCart, DollarSign, PlusCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ExternalProductDialog } from "@/components/ExternalProductDialog";
import { WishlistDialog } from "@/components/WishlistDialog";
import Loader from "@/components/ui/NewLoader/Loader";

export default function AvailableProductsPage() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExternalDialogOpen, setIsExternalDialogOpen] = useState(false);
  const [isWishlistDialogOpen, setIsWishlistDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const userSession = await getSession();
        if (!userSession) {
          toast({
            title: "Authentication required",
            description: "You need to be logged in to access this page.",
            variant: "destructive",
          });
          return;
        }
        setSession(userSession);

        const productList = await fetchProducts();
        setProducts(productList);
      } catch (error) {
        console.error("Error initializing:", error);
        setError("Failed to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleAddToWishlist = (product: any) => {
    setSelectedProduct(product);
    setIsWishlistDialogOpen(true);
  };

  if (loading) {
    return (
    <Loader/>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Products</h1>
        <Button
          onClick={() => setIsExternalDialogOpen(true)}
          className="flex items-center"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Request Product Not in Catalogue
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product: any) => (
            <Card key={product._id} className="overflow-hidden">
              <img
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <CardContent className="p-4">
                <h3 className="font-semibold text-xl mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-lg flex items-center">
                    <DollarSign className="w-5 h-5 mr-1" />
                    {product.price.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => handleAddToWishlist(product)}
                    className="flex items-center"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Wishlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 my-12">
          No products available at the moment.
        </p>
      )}

      <ExternalProductDialog
        isOpen={isExternalDialogOpen}
        onClose={() => setIsExternalDialogOpen(false)}
        session={session}
      />

      {selectedProduct && (
        <WishlistDialog
          isOpen={isWishlistDialogOpen}
          onClose={() => setIsWishlistDialogOpen(false)}
          product={selectedProduct}
          session={session}
        />
      )}
    </div>
  );
}
