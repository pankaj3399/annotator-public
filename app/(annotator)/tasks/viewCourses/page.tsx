'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCourses } from '@/app/actions/course';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Clock, User, ChevronRight, Bookmark, Filter } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

export interface CourseData {
  _id: string;
  name: string;
  description: string;
  thumbnail: string;
  tags: string[];
  instructor: {
    name: string;
  };
  created_at: string;
  duration?: string;
}

export default function CoursePage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const result = await getCourses();
        if (result.error) {
          toast.error("Failed to fetch courses");
        } else if (result.data) {
          const parsedCourses = JSON.parse(result.data);
          setCourses(parsedCourses);
          setFilteredCourses(parsedCourses);
        }
      } catch (error) {
        toast.error("An error occurred while fetching courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const filtered = courses.filter(course => 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCourses(filtered);
  }, [searchTerm, courses]);

  const handleCourseClick = (courseId: string) => {
    router.push(`/tasks/viewCourses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-blue-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/courseThumbnail.jpg')] bg-cover bg-center opacity-90 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-blue-600/80"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Discover Your Next
              <span className="block text-blue-200">Learning Adventure</span>
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Embark on a journey of knowledge with our expert-crafted courses designed to transform your skills and advance your career.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search courses by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border-gray-200 focus:border-blue-300 focus:ring-blue-300"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-blue-600 transition-colors">
              <Filter className="w-5 h-5" />
              <span className="hidden md:inline">Filters</span>
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-gray-600">{courses.length} Courses Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-gray-600">Updated Recently</span>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow">
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No courses found</h3>
            <p className="text-gray-500">Try adjusting your search terms or browse all courses</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <Card 
                key={course._id} 
                className="group cursor-pointer bg-white hover:bg-blue-50 transition-all duration-300 border-0 shadow-md hover:shadow-lg rounded-xl overflow-hidden"
                onClick={() => handleCourseClick(course._id)}
              >
                <div className="relative h-48">
                  <Image
                    src={course.thumbnail || '/videoThumbnail.jpg'}
                    alt={course.name}
                    layout="fill"
                    objectFit="cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-blue-600 text-white px-3 py-1">
                      {course.duration || "Self-paced"}
                    </Badge>
                  </div>
                  <button className="absolute top-4 left-4 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors">
                    <Bookmark className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {course.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.tags.slice(0, 3).map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      <span>{course.instructor.name}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}