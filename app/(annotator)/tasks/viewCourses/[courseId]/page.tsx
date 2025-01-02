'use client';

import React, { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { getCourseById } from '@/app/actions/course';
import { notFound } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlayCircle, Clock, ChevronRight } from 'lucide-react';

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

const DEFAULT_THUMBNAIL = '/videoThumbnail.jpg';

const CourseDetails = () => {
  const pathName = usePathname();
  const courseId = pathName.split('/')[3];
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      const result = await getCourseById(courseId);
      if (result.error) {
        notFound();
      }
      if (result.data) {
        setCourse(JSON.parse(result.data));
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleVideoClick = (videoId: string) => {
    setActiveVideoId(videoId);
    router.push(`/tasks/viewCourses/${courseId}/${videoId}`);
  };

  if (!course) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        <div className="bg-white shadow-xl rounded-sm overflow-hidden">
          <div className="relative h-96">
            <Image
              src={course.thumbnail || DEFAULT_THUMBNAIL}
              alt={course.name}
              layout="fill"
              objectFit="cover"
              className="w-full h-full object-center"
            />
            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-end p-6">
              <h1 className="text-4xl font-bold text-white mb-2">{course.name}</h1>
              <p className="text-xl text-gray-300 mb-4">{course.description}</p>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-sm py-1 px-2">
                  {course.instructor.name}
                </Badge>
                {course.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-white border-white text-sm py-1 px-2">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Course Content</h2>
            {course.videos.length === 0 ? (
              <p className="text-center text-gray-600">No videos available for this course.</p>
            ) : (
              <div className="grid gap-4">
                {course.videos.map((video, index) => (
                  <div
                    key={video._id}
                    onClick={() => handleVideoClick(video._id)}
                    className={`
                      group relative bg-white rounded-lg border border-gray-200 p-4
                      hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer
                      ${activeVideoId === video._id ? 'border-blue-500 shadow-md bg-blue-50' : ''}
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${activeVideoId === video._id 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'}
                        `}>
                          <PlayCircle className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {video.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>
                            {video.duration 
  ? `${Math.floor(Math.round(video.duration) / 60)}:${(Math.round(video.duration) % 60).toString().padStart(2, '0')}` 
  : ""}


                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-gray-600 line-clamp-2">{video.description}</p>
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