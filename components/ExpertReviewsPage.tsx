'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from '@/components/ui/card';
import { Users, Star, StarHalf, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import {
 Pagination,
 PaginationContent,
 PaginationEllipsis,
 PaginationItem,
 PaginationLink,
 PaginationNext,
 PaginationPrevious,
} from '@/components/ui/pagination';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';

interface Expert {
 id: string;
 name: string | null;
 email: string;
 status: 'pending' | 'accepted';
 averageRating?: number;
 totalReviews?: number;
}

interface Review {
 id: string;
 text: string;
 title: string | null;
 givenBy: {
   id: string;
   name: string;
   email: string;
 };
 createdAt: string;
}

interface Rating {
 value: number;
 givenBy: {
   id: string;
   name: string;
   email: string;
 };
 createdAt: string;
}

export default function ExpertReviewsPage() {
 const { data: session } = useSession();
 const { toast } = useToast();
 const router = useRouter();
 const searchParams = useSearchParams();

 const [experts, setExperts] = useState<Expert[]>([]);
 const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
 const [reviews, setReviews] = useState<Review[]>([]);
 const [ratings, setRatings] = useState<Rating[]>([]);
 const [loading, setLoading] = useState(true);
 const [reviewsLoading, setReviewsLoading] = useState(false);

 const [pageSize, setPageSize] = useState(10);
 const [currentPage, setCurrentPage] = useState(1);

 // New review state
 const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
 const [reviewText, setReviewText] = useState('');
 const [reviewTitle, setReviewTitle] = useState('');
 const [selectedRating, setSelectedRating] = useState(0);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Rating stars component
 const RatingStars = ({ rating }: { rating: number }) => {
   const fullStars = Math.floor(rating);
   const hasHalfStar = rating % 1 >= 0.5;

   return (
     <div className='flex items-center'>
       {[...Array(5)].map((_, i) => {
         if (i < fullStars) {
           return (
             <Star
               key={i}
               className='h-4 w-4 fill-yellow-400 text-yellow-400'
             />
           );
         } else if (i === fullStars && hasHalfStar) {
           return (
             <StarHalf
               key={i}
               className='h-4 w-4 fill-yellow-400 text-yellow-400'
             />
           );
         } else {
           return <Star key={i} className='h-4 w-4 text-gray-300' />;
         }
       })}
       <span className='ml-2 text-sm font-medium'>{rating.toFixed(1)}</span>
     </div>
   );
 };

 // Interactive rating stars for review form
 const InteractiveStars = () => {
   return (
     <div className='flex items-center space-x-1'>
       {[1, 2, 3, 4, 5].map((value) => (
         <button
           key={value}
           type='button'
           onClick={() => setSelectedRating(value)}
           className='focus:outline-none'
         >
           <Star
             className={`h-8 w-8 ${
               value <= selectedRating
                 ? 'fill-yellow-400 text-yellow-400'
                 : 'text-gray-300'
             }`}
           />
         </button>
       ))}
     </div>
   );
 };

 // Format date helper
 const formatDate = (dateString: string) => {
   try {
     return format(new Date(dateString), 'PPP');
   } catch (e) {
     return 'Invalid date';
   }
 };

 // Pagination helpers
 const currentPageExperts = experts.slice(
   (currentPage - 1) * pageSize,
   currentPage * pageSize
 );
 const totalPages = Math.ceil(experts.length / pageSize);

 const handlePageChange = (page: number) => {
   setCurrentPage(page);
   const params = new URLSearchParams(searchParams.toString());
   params.set('page', page.toString());
   router.push(`?${params.toString()}`, { scroll: false });
 };

 const handlePageSizeChange = (newSize: number) => {
   setPageSize(newSize);
   setCurrentPage(1);
   const params = new URLSearchParams(searchParams.toString());
   params.set('page', '1');
   params.set('size', newSize.toString());
   router.push(`?${params.toString()}`, { scroll: false });
 };

 const handleAddReview = async () => {
   if (!selectedExpert) {
     toast({
       variant: 'destructive',
       title: 'Error',
       description: 'No expert selected',
     });
     return;
   }
 
   // Add validation for rating and review
   if (selectedRating === 0) {
     toast({
       variant: 'destructive',
       title: 'Error',
       description: 'Please select a rating',
     });
     return;
   }
 
   if (reviewText.trim() === '') {
     toast({
       variant: 'destructive',
       title: 'Error',
       description: 'Please enter a review',
     });
     return;
   }
 
   try {
     setIsSubmitting(true);
 
     const response = await fetch(`/api/expert-reviews/${selectedExpert.id}`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         rating: selectedRating,
         review: reviewText,
         title: reviewTitle || null,
       }),
     });
 
     const responseData = await response.json();
     console.log('Full response:', responseData);
 
     if (!response.ok) {
       throw new Error(responseData.error || 'Failed to submit review');
     }
 
     // Update local state with new reviews and ratings
     if (responseData.success && responseData.data) {
       setReviews(responseData.data.reviews);
       setRatings(responseData.data.ratings);
 
       // Update experts list with new average rating
       setExperts(prev => 
         prev.map(expert => 
           expert.id === selectedExpert.id 
             ? {
                 ...expert, 
                 averageRating: responseData.data.avgRating,
                 totalReviews: responseData.data.ratings.length
               }
             : expert
         )
       );
     }
 
     // Reset form and close modal
     setReviewText('');
     setReviewTitle('');
     setSelectedRating(0);
     setIsReviewModalOpen(false);
 
     // Show success toast
     toast({
       title: 'Review Submitted',
       description: 'Your review has been added successfully.',
     });
 
   } catch (error) {
     console.error('Detailed error:', error);
     toast({
       variant: 'destructive',
       title: 'Error',
       description: error instanceof Error ? error.message : 'Failed to submit review',
     });
   } finally {
     setIsSubmitting(false);
   }
 };

 useEffect(() => {
   const fetchExperts = async () => {
     try {
       setLoading(true);
       const response = await fetch(
         '/api/agency/invited-users?status=accepted'
       );

       if (!response.ok) {
         throw new Error('Failed to fetch experts');
       }

       const data = await response.json();

       if (data.success) {
         // Fetch reviews for each expert concurrently
         const expertsWithReviews = await Promise.all(
           data.invitedUsers
             .filter((user: any) => user.status === 'accepted' && user.user)
             .map(async (user: any) => {
               // Fetch reviews for each expert
               const reviewResponse = await fetch(`/api/expert-reviews/${user.user.id}`);
               const reviewData = await reviewResponse.json();
               
               // Extract ratings and reviews
               const ratings = reviewData.success && reviewData.data 
                 ? reviewData.data.ratings || [] 
                 : [];
               
               const avgRating = ratings.length > 0
                 ? ratings.reduce((sum: number, r: any) => sum + r.value, 0) / ratings.length
                 : 0;

               return {
                 id: user.user.id,
                 name: user.user.name,
                 email: user.user.email || user.email,
                 status: user.status,
                 averageRating: avgRating,
                 totalReviews: ratings.length,
               };
             })
         );

         // Set experts with their actual review information
         setExperts(expertsWithReviews);

         // Check if there's an expert in the URL and fetch its details
         const expertId = searchParams.get('expert');
         if (expertId) {
           const selectedExpert = expertsWithReviews.find(e => e.id === expertId);
           if (selectedExpert) {
             await fetchExpertDetails(expertId);
           }
         }
       } else {
         throw new Error(data.error || 'Unknown error');
       }
     } catch (error) {
       console.error('Error fetching experts:', error);
       toast({
         variant: 'destructive',
         title: 'Error',
         description: 'Failed to load experts. Please try again.',
       });
     } finally {
       setLoading(false);
     }
   };

   if (session) {
     fetchExperts();
   }
 }, [session, toast, searchParams]);

 const fetchExpertDetails = async (expertId: string) => {
   if (!expertId) {
     console.error('Invalid expert ID:', expertId);
     toast({
       variant: 'destructive',
       title: 'Error',
       description: 'Invalid expert ID',
     });
     return;
   }
 
   try {
     setReviewsLoading(true);
 
     // Fetch reviews and ratings for this expert
     const response = await fetch(`/api/expert-reviews/${expertId}`);
 
     if (!response.ok) {
       throw new Error('Failed to fetch reviews');
     }
 
     const data = await response.json();
     
     // Handle both response formats (old and new)
     let reviewsData = [];
     let ratingsData = [];
     let avgRating = 0;
     
     // New response format (with success and data properties)
     if (data.success && data.data) {
       reviewsData = data.data.reviews || [];
       ratingsData = data.data.ratings || [];
       avgRating = data.data.avgRating || 0;
     } 
     // Old response format (direct properties)
     else {
       reviewsData = data.reviews || [];
       ratingsData = data.ratings || [];
       avgRating = data.avgRating || 0;
     }
     
     // Find the expert in the current list
     const expert = experts.find(e => e.id === expertId);
     
     // Update state
     setSelectedExpert(expert || null);
     setReviews(reviewsData);
     setRatings(ratingsData);
 
     // Update experts list with new average rating
     setExperts((prev) =>
       prev.map((e) => {
         if (e.id === expertId) {
           return {
             ...e,
             averageRating: avgRating,
             totalReviews: ratingsData.length,
           };
         }
         return e;
       })
     );
 
     // Update URL without reloading
     const params = new URLSearchParams(searchParams.toString());
     params.set('expert', expertId);
     router.push(`?${params.toString()}`, { scroll: false });
   } catch (error) {
     console.error('Error fetching expert details:', error);
     toast({
       variant: 'destructive',
       title: 'Error',
       description: 'Failed to load expert details. Please try again.',
     });
   } finally {
     setReviewsLoading(false);
   }
 };

  return (
    <div className='space-y-6'>
      {/* Dashboard Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Expert Reviews & Ratings
          </h1>
          <p className='text-muted-foreground mt-1'>
            View and manage reviews and ratings for your expert team members.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Experts List */}
        <Card className='md:col-span-1'>
          <CardHeader>
            <CardTitle>Experts</CardTitle>
            <CardDescription>
              Select an expert to view or add reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-3'>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className='flex items-center space-x-4'>
                    <Skeleton className='h-12 w-12 rounded-full' />
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-[150px]' />
                      <Skeleton className='h-4 w-[100px]' />
                    </div>
                  </div>
                ))}
              </div>
            ) : experts.length === 0 ? (
              <div className='text-center py-8'>
                <Users className='h-12 w-12 mx-auto text-gray-400' />
                <h3 className='mt-2 text-lg font-medium'>No experts found</h3>
                <p className='text-sm text-muted-foreground mt-1'>
                  There are no active experts in your team.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex justify-between items-center mb-2'>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) =>
                      handlePageSizeChange(parseInt(value))
                    }
                  >
                    <SelectTrigger className='w-20'>
                      <SelectValue>{pageSize}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='divide-y'>
                  {currentPageExperts.map((expert) => (
                    <div key={expert.id} className='py-3'>
                      <button
                        onClick={() => fetchExpertDetails(expert.id)}
                        className={`w-full text-left p-2 rounded hover:bg-gray-100 transition-colors ${
                          selectedExpert?.id === expert.id ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center space-x-3'>
                            <div className='rounded-full bg-primary/10 p-2'>
                              <User className='h-4 w-4' />
                            </div>
                            <div>
                              <div className='font-medium'>
                                {expert.name || expert.email}
                              </div>
                              {expert.name && (
                                <div className='text-xs text-muted-foreground'>
                                  {expert.email}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className='text-xs flex flex-col items-end'>
                            {expert.averageRating !== undefined &&
                            expert.averageRating > 0 ? (
                              <RatingStars rating={expert.averageRating} />
                            ) : (
                              <Badge variant='outline' className='text-xs'>
                                No ratings
                              </Badge>
                            )}
                            <span className='text-muted-foreground mt-1'>
                              {expert.totalReviews ?? 0}{' '}
                              {expert.totalReviews === 1 ? 'review' : 'reviews'}
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination className='mt-4'>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href='#'
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1)
                              handlePageChange(currentPage - 1);
                          }}
                          className={
                            currentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 &&
                            pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href='#'
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(pageNumber);
                                }}
                                isActive={pageNumber === currentPage}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return <PaginationEllipsis key={pageNumber} />;
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href='#'
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                              handlePageChange(currentPage + 1);
                          }}
                          className={
                            currentPage === totalPages
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expert Reviews and Ratings */}
        <Card className='md:col-span-2'>
          <CardHeader className='flex flex-row justify-between items-start'>
            <div>
              <CardTitle>
                {selectedExpert
                  ? `Reviews for ${selectedExpert.name || selectedExpert.email}`
                  : 'Expert Reviews'}
              </CardTitle>
              <CardDescription>
                {selectedExpert
                  ? `View and manage all reviews for this expert`
                  : 'Select an expert from the list to view their reviews'}
              </CardDescription>
            </div>
            {selectedExpert && (
              <Button onClick={() => setIsReviewModalOpen(true)}>
                Add Review
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedExpert ? (
              <div className='text-center py-12'>
                <MessageSquare className='h-12 w-12 mx-auto text-gray-400' />
                <h3 className='mt-2 text-lg font-medium'>No expert selected</h3>
                <p className='text-sm text-muted-foreground mt-1'>
                  Select an expert from the list to view their reviews and
                  ratings.
                </p>
              </div>
            ) : reviewsLoading ? (
              <div className='space-y-4'>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className='space-y-2'>
                    <Skeleton className='h-4 w-1/4' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                  </div>
                ))}
              </div>
            ) : (
              <div className='space-y-6'>
                {/* Expert Average Rating */}
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-lg font-medium'>Overall Rating</h3>
                      <p className='text-sm text-muted-foreground'>
                        Based on {ratings.length}{' '}
                        {ratings.length === 1 ? 'rating' : 'ratings'}
                      </p>
                    </div>
                    <div className='text-center'>
                      {ratings.length > 0 ? (
                        <>
                          <div className='text-4xl font-bold'>
                            {(
                              ratings.reduce((sum, r) => sum + r.value, 0) /
                              ratings.length
                            ).toFixed(1)}
                          </div>
                          <RatingStars
                            rating={
                              ratings.reduce((sum, r) => sum + r.value, 0) /
                              ratings.length
                            }
                          />
                        </>
                      ) : (
                        <div className='text-center'>
                          <div className='text-lg font-medium text-gray-500'>
                            No ratings yet
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                <div>
                  <h3 className='text-lg font-medium mb-4'>
                    {reviews.length}{' '}
                    {reviews.length === 1 ? 'Review' : 'Reviews'}
                  </h3>

                  {reviews.length === 0 ? (
                    <div className='text-center py-8 bg-gray-50 rounded-lg'>
                      <MessageSquare className='h-8 w-8 mx-auto text-gray-400' />
                      <p className='text-sm text-muted-foreground mt-2'>
                        No reviews yet. Be the first to review this expert.
                      </p>
                      <Button
                        variant='outline'
                        className='mt-4'
                        onClick={() => setIsReviewModalOpen(true)}
                      >
                        Add Review
                      </Button>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      {reviews.map((review) => {
                        // Find corresponding rating
                        const rating = ratings.find(
                          (r) => r.givenBy.id === review.givenBy.id
                        );

                        return (
                          <div
                            key={review.id}
                            className='border rounded-lg p-4'
                          >
                            <div className='flex justify-between'>
                              <div className='font-medium'>
                                {review.title || 'Review'}
                              </div>
                              {rating && <RatingStars rating={rating.value} />}
                            </div>
                            <p className='mt-2 text-sm'>{review.text}</p>
                            <div className='mt-3 flex justify-between items-center text-xs text-muted-foreground'>
                              <div>
                                By {review.givenBy.name || review.givenBy.email}
                              </div>
                              <div>{formatDate(review.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              Add Review for {selectedExpert?.name || selectedExpert?.email}
            </DialogTitle>
            <DialogDescription>
              Share your feedback about this expert's work and performance.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Rating</label>
              <InteractiveStars />
              {selectedRating === 0 && (
                <p className='text-xs text-red-500'>Please select a rating</p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>
                Review Title (Optional)
              </label>
              <input
                type='text'
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder='e.g., Excellent communication skills'
                className='w-full p-2 border rounded-md'
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Review</label>
              <Textarea
                placeholder='Write your review here...'
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={5}
                className='resize-none'
              />
              {reviewText.trim() === '' && (
                <p className='text-xs text-red-500'>Review text is required</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddReview}
              disabled={
                isSubmitting || selectedRating === 0 || reviewText.trim() === ''
              }
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
