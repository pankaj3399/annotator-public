'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCourseById } from '@/app/actions/course';
import { Skeleton } from '@/components/ui/skeleton';

interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  duration: number;
  thumbnail: string;
}

interface Course {
  _id: string;
  name: string;
  description: string;
  instructor: string;
  thumbnail: string;
  tags: string[];
  videos: Video[];
  created_at: string;
  updated_at: string;
}

const VideoPlayerPage: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const courseId = pathname.split('/')[2];
  const videoId = pathname.split('/')[3];

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourseDetails = async () => {
      try {
        const response = await getCourseById(courseId);
        const courseData: Course = JSON.parse(response.data!);

        const selected = courseData.videos.find((video) => video._id === videoId);
        setCourse(courseData);
        setSelectedVideo(selected || courseData.videos[0]); // Default to the first video if no match
      } catch (error) {
        console.error('Error fetching course details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId, videoId]);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    router.push(`/courses/${courseId}/${video._id}`); // Update the URL to reflect the selected video
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!selectedVideo) {
    return <div className="p-8">Video not found or invalid course ID.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row p-8 space-y-6 md:space-y-0 md:space-x-6">
      <div className="flex-1 space-y-4">
        {/* Video Player */}
        <div className="relative w-full bg-black">
          <video
            controls
            className="w-full max-w-full"
            poster={selectedVideo.thumbnail || '/default-video-thumbnail.jpg'}
          >
            <source src={selectedVideo.url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <h2 className="text-2xl font-bold">{selectedVideo.title}</h2>
        <p className="text-lg">{selectedVideo.description}</p>
      </div>

      <div className="w-full md:w-96">
        {/* Video List */}
        <h3 className="text-lg font-bold mb-4">Other Videos in the Course</h3>
        <div className="space-y-4">
          {course?.videos.map((video) => (
            <div
              key={video._id}
              className={`p-4 rounded-lg cursor-pointer border ${
                video._id === selectedVideo._id
                  ? 'bg-gray-200 border-gray-400'
                  : 'hover:bg-gray-100 border-gray-300'
              }`}
              onClick={() => handleVideoClick(video)}
            >
              <h4 className="font-semibold text-lg">{video.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{video.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerPage;
