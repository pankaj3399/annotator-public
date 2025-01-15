'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCourseByIdAndPublishedVideo } from '@/app/actions/course';
import { notFound } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlayCircle, Clock, ChevronRight } from 'lucide-react';
import Loader from '@/components/ui/Loader/Loader';
export interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  duration: number;
}

export interface Instructor {
  name: string;
}

export interface Course {
  _id: string;
  name: string;
  description: string;
  instructor: Instructor;
  thumbnail: string | null;
  tags: string[];
  videos: Video[];
  created_at: string;
  updated_at: string;
}
const DEFAULT_THUMBNAIL = '/courseThumbnail.jpg';

const CourseDetails: React.FC = () => {
  const pathName = usePathname();
  const courseId = pathName.split('/')[3];
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async (): Promise<void> => {
      try {
        const result = await getCourseByIdAndPublishedVideo(courseId);
        if (result.error) {
          notFound();
        }
        if (result.data) {
          setCourse(JSON.parse(result.data));
        }
      } catch (error) {
        console.error('Error fetching course:', error);
        notFound();
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleVideoClick = (videoId: string): void => {
    setActiveVideoId(videoId);
    router.push(`/tasks/viewCourses/${courseId}/${videoId}`);
  };

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(Math.round(duration) / 60);
    const seconds = Math.round(duration) % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!course) {
    return <Loader />;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="relative">
            <div className="h-64 overflow-hidden">
              <img
                src={course.thumbnail || DEFAULT_THUMBNAIL}
                alt={course.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
            </div>
            
            {/* Course Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold text-white mb-4">{course.name}</h1>
                <p className="text-lg text-gray-200 mb-4">{course.description}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary" className="text-sm py-1.5 px-3">
                    Instructor: {course.instructor.name}
                  </Badge>
                  {course.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-white border-white text-sm py-1.5 px-3"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Course Content Section */}
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Course Content</h2>
            {course.videos.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No videos available for this course.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {course.videos.map((video: Video) => (
                  <div
                    key={video._id}
                    onClick={() => handleVideoClick(video._id)}
                    className={`
                      group bg-white rounded-lg border p-4 transition-all duration-200 cursor-pointer
                      hover:border-blue-300 hover:shadow-md 
                      ${activeVideoId === video._id ? 'border-blue-500 shadow-md bg-blue-50' : 'border-gray-200'}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`
                          w-12 h-12 rounded-full flex items-center justify-center transition-colors
                          ${activeVideoId === video._id 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'}
                        `}>
                          <PlayCircle className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {video.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{video.duration ? formatDuration(video.duration) : ""}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{video.description}</p>
                      </div>
                      <ChevronRight className={`
                        w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1
                        ${activeVideoId === video._id ? 'text-blue-500' : 'text-gray-400'}
                      `} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;