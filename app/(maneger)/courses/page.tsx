'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { S3Upload } from '@/components/S3Upload';
import { Plus, Book, Tag, Clock, Trash2, Upload, Search, ChevronDown } from 'lucide-react';
import {
  createCourse,
  deleteCourse,
  getCourseByProjectManager,
} from '@/app/actions/course';
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from 'next/image';
import Loader from '@/components/ui/Loader/Loader';

interface Video {
  title: string;
  description: string;
  url: string;
  duration: number;
}

export interface Instructor {
  name: string;
}

export interface CourseData {
  _id: string;
  name: string;
  description: string;
  thumbnail: string;
  tags: string[];
  videos: Video[];
  instructor: Instructor;
  created_at: string;
  updated_at: string;
}

const DEFAULT_THUMBNAIL = '/courseThumbnail.jpg';

export default function CoursePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    thumbnail: string;
    tags: string;
  }>({
    name: '',
    description: '',
    thumbnail: '',
    tags: '',
  });


  const fetchCourses = async () => {
    if (session?.user?.role === 'project manager') {
      try {
        const result = await getCourseByProjectManager();
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
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [session?.user?.role]);

  useEffect(() => {
    const filtered = courses.filter(course => 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    setFilteredCourses(sorted);
  }, [courses, searchTerm, sortBy]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsUploading(true);
    try {
      const courseData: Partial<CourseData> = {
        name: formData.name,
        description: formData.description,
        thumbnail: formData.thumbnail || DEFAULT_THUMBNAIL,
        tags: formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        videos: [],
      };

      const result = await createCourse(courseData as CourseData);
      if (result.error) {
        toast.error("Failed to create course");
      } else if (result.data) {
        const newCourse = JSON.parse(result.data);
        setCourses(prevCourses => [...prevCourses, newCourse]);
        toast.success("Course created successfully");
        setIsDialogOpen(false);
        setFormData({ name: '', description: '', thumbnail: '', tags: '' });
      }
    } catch (error) {
      toast.error("An error occurred while creating the course");
    } finally {
      setIsUploading(false);
    }
  };

  console.log(courses);

  const handleUploadComplete = (uploadedFile: string) => {
    setFormData({ ...formData, thumbnail: uploadedFile });
  };
  

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    try {
      const result = await deleteCourse(courseId);
      if (result.error) {
        toast.error("Failed to delete course");
      } else {
        setCourses((prev) => prev.filter((course) => course._id !== courseId));
        toast.success("Course deleted successfully");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the course");
    }
  };

  if (!session || session.user.role !== 'project manager') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Access Denied</h1>
          <p className="text-gray-600 mb-6">You do not have access to this page.</p>
          <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Your Courses
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search courses..."
                className="pl-10 pr-4 py-2 w-64 rounded-full border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to create a new course. Don't forget to add a thumbnail!
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCourse} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Course Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter course name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter course description"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail</Label>
                    <S3Upload
                      onUploadComplete={handleUploadComplete}
                      currentFile={formData.thumbnail}
                      accept="image/*"
                      uploadType="imageUploader"
                      label="Course Thumbnail"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="Enter tags (comma-separated)"
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                      disabled={isUploading}
                    >
                      {isUploading ? "Uploading..." : "Create Course"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          {loading ? (
            <Loader></Loader>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Book className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">No courses found</h3>
              <p className="mt-2 text-gray-500">Get started by creating a new course or try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course) => (
                <Card
                  key={course._id}
                  className="overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col h-[400px] bg-white rounded-xl"
                  onClick={() => router.push(`/courses/${course._id}`)}
                >
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={course.thumbnail || DEFAULT_THUMBNAIL}
                      alt={course.name}
                      className="transition-transform duration-300 hover:scale-110"
                    />
                  </div>

                  <CardHeader className="flex-shrink-0 pb-2">
                    <CardTitle className="text-xl font-semibold text-gray-900 truncate">{course.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="flex-grow flex flex-col justify-between py-2">
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                      {course.description || "No description available"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {course.tags.length > 0 ? (
                        course.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">No tags available</span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between items-center text-sm text-gray-500 pt-2 pb-4 px-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(course.created_at).toLocaleDateString()}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="hover:bg-red-600 transition-colors duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course._id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

