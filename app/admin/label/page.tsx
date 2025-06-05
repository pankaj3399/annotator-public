'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getLabelsForAdmin, createCustomLabel } from '@/app/actions/label';

interface Label {
  _id: string;
  name: string;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabel, setNewLabel] = useState<Label>({ _id: '', name: '' });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    setIsLoading(true);
    try {
      const fetchedLabels = await getLabelsForAdmin();
      setLabels(fetchedLabels || []);
    } catch (error) {
      console.error(error);
      setError('Failed to fetch labels. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) {
      setError('Please provide a name for the label.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCustomLabel(newLabel.name.trim());

      // Refresh the labels list instead of trying to parse the result
      await fetchLabels();

      setNewLabel({ _id: '', name: '' });
      setError('');
      setIsDialogOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create label');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'>
      <div className='container mx-auto py-8 max-w-6xl px-4'>
        {/* Header Card */}
        <div className='mb-8 group relative rounded-2xl overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-all duration-300'>
          {/* Gradient border effect */}
          <div className='absolute inset-0 opacity-100 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'></div>
          <div className='absolute inset-0.5 bg-white rounded-2xl'></div>

          <div className='relative'>
            <CardHeader className='bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl'>
              <CardTitle className='text-3xl font-bold'>
                Label Management
              </CardTitle>
              <CardDescription className='text-blue-100'>
                Create and manage labels to organize your content efficiently
              </CardDescription>
            </CardHeader>
            <CardContent className='p-6'>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-gray-600 font-medium'>
                  {labels.length} label{labels.length !== 1 ? 's' : ''} total
                </span>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className='gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200'>
                      <Plus className='w-4 h-4' />
                      Create Label
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='bg-white sm:max-w-lg'>
                    <DialogHeader>
                      <DialogTitle className='text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                        Create New Label
                      </DialogTitle>
                      <DialogDescription className='text-gray-600'>
                        Add a new label to organize your content effectively
                      </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-6 mt-6'>
                      <div className='space-y-3'>
                        <label className='text-sm font-semibold text-gray-700'>
                          Label Name
                        </label>
                        <Input
                          placeholder='Enter a descriptive label name'
                          value={newLabel.name}
                          onChange={(e) =>
                            setNewLabel({ ...newLabel, name: e.target.value })
                          }
                          className='border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isLoading) {
                              handleCreateLabel();
                            }
                          }}
                        />
                      </div>
                      <Button
                        className='w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 py-3'
                        onClick={handleCreateLabel}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <Plus className='w-4 h-4' />
                        )}
                        {isLoading ? 'Creating...' : 'Create Label'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className='mb-6 group relative rounded-2xl overflow-hidden bg-white shadow-lg transition-all duration-300'>
            <div className='absolute inset-0 opacity-100 bg-gradient-to-r from-red-500 to-orange-500'></div>
            <div className='absolute inset-0.5 bg-white rounded-2xl'></div>
            <div className='relative'>
              <Alert
                variant='destructive'
                className='bg-red-50 border-0 rounded-2xl'
              >
                <AlertCircle className='h-4 w-4' />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className='mb-6 group relative rounded-2xl overflow-hidden bg-white shadow-lg transition-all duration-300'>
            <div className='absolute inset-0 opacity-100 bg-gradient-to-r from-green-500 to-emerald-500'></div>
            <div className='absolute inset-0.5 bg-white rounded-2xl'></div>
            <div className='relative'>
              <Alert className='bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-0 rounded-2xl'>
                <Check className='h-4 w-4' />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>Label created successfully!</AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && labels.length === 0 ? (
          <div className='flex items-center justify-center p-12'>
            <div className='text-center'>
              <Loader2 className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
              <p className='text-gray-500'>Loading labels...</p>
            </div>
          </div>
        ) : (
          /* Labels Grid */
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {labels.map((label, index) => {
              const gradients = [
                'from-blue-500 to-indigo-500',
                'from-purple-500 to-pink-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-red-500',
              ];

              return (
                <div
                  key={label._id}
                  className='group relative rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1'
                >
                  {/* Gradient border effect */}
                  <div
                    className={`absolute inset-0 opacity-100 bg-gradient-to-r ${gradients[index % 4]}`}
                  ></div>
                  <div className='absolute inset-0.5 bg-white rounded-2xl'></div>

                  <div className='relative p-6'>
                    <span className='font-semibold text-gray-800 group-hover:text-gray-900 transition-colors'>
                      {label.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && labels.length === 0 && (
          <div className='text-center py-12'>
            <div className='group relative rounded-2xl overflow-hidden inline-block'>
              <div className='absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500'></div>
              <div className='absolute inset-0.5 bg-white rounded-2xl'></div>
              <div className='relative w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center'>
                <Plus className='w-8 h-8 text-blue-500' />
              </div>
            </div>
            <h3 className='text-lg font-semibold text-gray-700 mb-2 mt-4'>
              No labels yet
            </h3>
            <p className='text-gray-500 mb-6'>
              Create your first label to get started organizing your content
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className='gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            >
              <Plus className='w-4 h-4' />
              Create Your First Label
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
