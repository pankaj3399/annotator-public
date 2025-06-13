'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AddProductForm from '@/components/AddProduct';
import { fetchProducts } from '@/app/actions/product';
import { toast } from 'sonner';
import Loader from '@/components/ui/NewLoader/Loader';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  admin: string;
  created_at?: Date;
}

const AdminProductsPage = () => {
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await fetchProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductAdded = () => {
    loadProducts(); // Refresh the products list
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader /></div>;
  }

  return (
    <>
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className="text-3xl font-bold">Products Management</h1>
          <p className="text-gray-600 mt-2">Manage products that experts can request</p>
        </div>
        <Button
          onClick={() => setIsAddProductModalOpen(true)}
          className='flex items-center gap-2'
        >
          <PlusCircle className='w-4 h-4' />
          Add Product
        </Button>
      </div>

      <div className='space-y-6'>
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium">No products</h3>
                <p className="mt-1 text-gray-500">Get started by creating a new product.</p>
                <Button onClick={() => setIsAddProductModalOpen(true)} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product._id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.png'; // Add a placeholder image
                    }}
                  />
                </div>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="text-lg font-semibold line-clamp-2">{product.name}</span>
                    <div className="flex space-x-1 ml-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="text-lg font-semibold">
                      ${product.price.toFixed(2)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      ID: {product._id.slice(-6)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {isAddProductModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg max-w-md w-full'>
            <AddProductForm 
              onClose={() => setIsAddProductModalOpen(false)}
              onProductAdded={handleProductAdded}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AdminProductsPage;