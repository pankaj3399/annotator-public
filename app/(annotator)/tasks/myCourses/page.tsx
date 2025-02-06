"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getEnrolledCourses } from "@/app/actions/course";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BookOpen,
  Clock,
  User,
  ChevronRight,
  Bookmark,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import Loader from "@/components/ui/Loader/Loader";
import { toast } from "sonner";

interface EnrolledCourse {
  course: {
    _id: string;
    name: string;
    description: string;
    thumbnail: string;
    tags: string[];
    instructor: {
      name: string;
    };
    duration?: string;
  };
  enrolledAt: string;
  progress?: number;
}

export default function EnrolledCoursesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const result = await getEnrolledCourses();
        if (result.error) {
          toast.error("Failed to fetch enrolled courses");
        } else if (result.data) {
          setEnrolledCourses(result.data);
          setFilteredCourses(result.data);
        }
      } catch (error) {
        toast.error("An error occurred while fetching enrolled courses");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    const filtered = enrolledCourses.filter(
      (enrolled) =>
        enrolled.course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrolled.course.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        enrolled.course.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
    setFilteredCourses(filtered);
  }, [searchTerm, enrolledCourses]);

  const handleCourseClick = (courseId: string) => {
    router.push(`/tasks/myCourses/${courseId}`);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/courseThumbnail.jpg')] bg-cover bg-center opacity-90 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500/90"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <Badge className="bg-blue-400/20 text-white border-0 backdrop-blur-sm">
                <GraduationCap className="w-4 h-4 mr-1" />
                My Learning Journey
              </Badge>
            </div>
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Your Enrolled
              <span className="block bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                Courses
              </span>
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Continue your learning journey with your enrolled courses. Track
              your progress and pick up right where you left off.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        {/* Search Section */}
        <Card className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl border-0 mb-12">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search your enrolled courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-300 bg-white/50"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">
                  {enrolledCourses.length} Enrolled Courses
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">
                  Continue Learning
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              No enrolled courses found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search terms or enroll in new courses
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-16">
            {filteredCourses.map((enrolled) => (
              <Card
                key={enrolled.course._id}
                className="group cursor-pointer bg-white hover:bg-blue-50 transition-all duration-300 border-0 shadow-lg hover:shadow-xl rounded-2xl overflow-hidden transform hover:-translate-y-1"
                onClick={() => handleCourseClick(enrolled.course._id)}
              >
                <div className="relative h-56">
                  <img
                    src={enrolled.course.thumbnail || "/courseThumbnail.jpg"}
                    alt={enrolled.course.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 text-sm font-medium">
                      {enrolled.course.duration || "Self-paced"}
                    </Badge>
                  </div>
                  {/* progress bar */}
                  
                  {/* <div className="absolute bottom-4 left-4 right-4">
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${enrolled.progress || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-white text-sm mt-2">
                      {enrolled.progress || 0}% Complete
                    </p>
                  </div> */}
                </div>

                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {enrolled.course.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {enrolled.course.description}
                  </p>
{/* 
                  <div className="flex flex-wrap gap-2 mb-4">
                    {enrolled.course.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div> */}


                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
