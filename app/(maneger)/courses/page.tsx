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
import { FileUpload } from "@/components/FileUpload";
import { Plus, Book, Tag, Clock, Trash2, Upload } from 'lucide-react';
import {
  createCourse,
  deleteCourse,
  getCourseByProjectManager,
} from '@/app/actions/course';
import { toast } from "sonner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';

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
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
          setCourses(JSON.parse(result.data));
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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        const newCourse: CourseData = JSON.parse(result.data).course;
        setCourses((prev) => [...prev, newCourse]);
        toast.success("Course created successfully");
        setIsDialogOpen(false);
        setFormData({ name: '', description: '', thumbnail: '', tags: '' });
        // Fetch courses again to ensure we have the latest data
        await fetchCourses();
      }
    } catch (error) {
      toast.error("An error occurred while creating the course");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCourse = async (courseId: string) => {
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

  const handleThumbnailUpload = (url: string) => {
    setFormData(prev => ({ ...prev, thumbnail: url }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'project manager') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Courses by {session.user.name}
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
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
                  <FileUpload
                    onUploadComplete={handleThumbnailUpload}
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
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    Create Course
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-12">
            <Book className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
  key={course._id}
  className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer flex flex-col h-[450px] p-2"
  onClick={() => router.push(`/courses/${course._id}`)}
>
  <div className="relative h-64 w-full rounded-lg overflow-hidden">
    <Image
      src={course.thumbnail || DEFAULT_THUMBNAIL}
      alt={course.name}
      layout="fill"
      objectFit="cover"
      className="rounded-lg"
    />
  </div>

  <CardHeader className="flex-shrink-0 ">
    <CardTitle className="text-xl font-semibold text-gray-900 truncate">{course.name}</CardTitle>
  </CardHeader>

  <CardContent className="flex-grow flex flex-col justify-between">
    <p className="text-gray-600 text-sm line-clamp-3 mb-3 truncate">
      {course.description || "No description available"}
    </p>
    <div className="flex flex-wrap gap-1 mt-auto">
      {course.tags.length > 0 ? (
        course.tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
            <Tag className="w-3 h-3 mr-1" />
            {tag}
          </Badge>
        ))
      ) : (
        <span className="text-gray-500 text-sm">No tags available</span>
      )}
    </div>
  </CardContent>

  <CardFooter className="mt-2 flex justify-between items-center text-sm text-gray-500">
    <div className="flex items-center">
      <Clock className="w-4 h-4 mr-1" />
      {new Date(course.created_at).toLocaleDateString()}
    </div>
    <Button
      variant="destructive"
      size="sm"
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
      </div>
    </div>
  );
}

