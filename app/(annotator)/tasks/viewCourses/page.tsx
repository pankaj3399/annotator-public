'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  enrollCourse,
  getCourses,
  getEnrolledCourses,
} from '@/app/actions/course';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BookOpen,
  Clock,
  User,
  ChevronRight,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import Loader from '@/components/ui/NewLoader/Loader';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { stripe } from '@/app/actions/stripe';
import { useSearchParams } from 'next/navigation';

export interface CourseData {
  _id: string;
  name: string;
  description: string;
  thumbnail: string;
  tags: string[];
  instructor: {
    name: string;
  };
  price: number;
  created_at: string;
  duration?: string;
}

export default function CoursePage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for payment status in URL parameters
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const [coursesResult, enrolledResult] = await Promise.all([
          getCourses(),
          getEnrolledCourses(),
        ]);

        if (coursesResult.error) {
          toast.error('Failed to fetch courses');
        } else if (coursesResult.data) {
          const parsedCourses = JSON.parse(coursesResult.data);
          setCourses(parsedCourses);
          setFilteredCourses(parsedCourses);
        }

        if (enrolledResult.error) {
          toast.error('Failed to fetch enrolled courses');
        } else if (enrolledResult.data) {
          // Directly set the data since it's already serialized
          setEnrolledCourses(enrolledResult.data);
        }
      } catch (error) {
        toast.error('An error occurred while fetching courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const filtered = courses.filter(
      (course) =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  const handleCourseClick = (courseId: string) => {
    // router.push(`/tasks/viewCourses/${courseId}`);
  };

  const handleEnrollClick = async (course: any) => {
    try {
      const stripeData = {
        id: course._id.toString(),
        name: course.name,
        type: 'course',
      };
      console.log(stripeData);
      //@ts-ignore
      const { url, session } = await stripe(stripeData);
      if (url) {
        router.push(url);
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  if (loading) {
    return <Loader></Loader>;
  }

  console.log(enrolledCourses);

  return (
    <div className='min-h-screen bg-gradient-to-b from-blue-50 to-white'>
      {/* Hero Section */}
      <div className='relative overflow-hidden'>
        <div className='absolute inset-0'>
          <div className="absolute inset-0 bg-[url('/courseThumbnail.jpg')] bg-cover bg-center opacity-90 mix-blend-overlay"></div>
          <div className='absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500/90'></div>
        </div>

        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24'>
          <div className='max-w-3xl'>
            <div className='flex items-center gap-2 mb-6'>
              <Badge className='bg-blue-400/20 text-white border-0 backdrop-blur-sm'>
                <Sparkles className='w-4 h-4 mr-1' />
                Featured Courses
              </Badge>
            </div>
            <h1 className='text-6xl font-bold text-white mb-6 leading-tight'>
              Discover Your Next
              <span className='block bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent'>
                Learning Adventure
              </span>
            </h1>
            <p className='text-xl text-blue-100 leading-relaxed'>
              Embark on a journey of knowledge with our expert-crafted courses
              designed to transform your skills and advance your career.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10'>
        {/* Search Section */}
        <Card className='bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border-0 mb-12'>
          <CardContent className='p-6'>
            <div className='flex flex-col md:flex-row gap-4 items-center'>
              <div className='relative flex-grow'>
                <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <Input
                  type='text'
                  placeholder='Search courses by name, description, or tags...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-12 pr-4 py-3 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-300 bg-white/50'
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className='flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-blue-50 rounded-lg'>
                  <BookOpen className='w-5 h-5 text-blue-600' />
                </div>
                <span className='text-gray-600 font-medium'>
                  {courses.length} Courses Available
                </span>
              </div>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-blue-50 rounded-lg'>
                  <Clock className='w-5 h-5 text-blue-600' />
                </div>
                <span className='text-gray-600 font-medium'>
                  Updated Weekly
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrolled courses */}

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className='text-center py-16 bg-white rounded-xl shadow-lg'>
            <h3 className='text-2xl font-semibold text-gray-700 mb-2'>
              No courses found
            </h3>
            <p className='text-gray-500'>
              Try adjusting your search terms or browse all courses
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16'>
            {filteredCourses.map((course) => (
              <Card
                key={course._id.toString()}
                className='group cursor-pointer bg-white hover:bg-blue-50 transition-all duration-300 border-0 shadow-lg hover:shadow-xl rounded-2xl overflow-hidden transform hover:-translate-y-1'
              >
                <div className='relative h-56'>
                  <img
                    src={course.thumbnail || '/courseThumbnail.jpg'}
                    alt={course.name}
                    className='w-full h-full object-cover'
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent'></div>
                  <div className='absolute top-4 right-4'>
                    <Badge className='bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 text-sm font-medium'>
                      {course.duration || 'Self-paced'}
                    </Badge>
                  </div>
                  <button className='absolute top-4 left-4 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors group-hover:scale-110'>
                    <Bookmark className='w-5 h-5 text-white' />
                  </button>
                </div>

                <CardContent className='p-6'>
                  <h3 className='text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors'>
                    {course.name}
                  </h3>
                  <p className='text-gray-600 text-sm mb-4 line-clamp-2'>
                    {course.description}
                  </p>

                  <div className='flex flex-wrap gap-2 mb-4'>
                    {course.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant='secondary'
                        className='bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium'
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {!enrolledCourses.find(
                    (enrolled: any) => enrolled.course._id === course._id
                  ) && (
                    <Button
                      onClick={() => handleEnrollClick(course)}
                      className='w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
                    >
                      Enroll Now - ${course.price}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
