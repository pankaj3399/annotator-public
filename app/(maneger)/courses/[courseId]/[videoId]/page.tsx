'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCourseById } from '@/app/actions/course';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/audio.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from 'lucide-react'
import { useSession } from "next-auth/react"

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

const Loader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
);

const VideoPlayerPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const courseId = pathname.split('/')[2];
  const videoId = pathname.split('/')[3];

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!courseId) return;

    const fetchCourseDetails = async () => {
      try {
        const response = await getCourseById(courseId);
        const courseData: Course = JSON.parse(response.data!);

        const selected = courseData.videos.find((video) => video._id === videoId);
        setCourse(courseData);
        setSelectedVideo(selected || courseData.videos[0]);
      } catch (error) {
        console.error('Error fetching course details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId, videoId, session, status, router]);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    router.push(`/courses/${courseId}/${video._id}`);
  };

  if (status === "loading" || !session) {
    return <Loader />;
  }

  if (!selectedVideo) {
    <Loader></Loader>
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{course?.name}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="col-span-2">
            <CardContent className="p-0">
              <div className="relative w-full aspect-video bg-black">
                <MediaPlayer
                  src={selectedVideo?.url}
                  viewType="video"
                  streamType="on-demand"
                  logLevel="warn"
                  crossOrigin
                  playsInline
                  title={selectedVideo?.title}
                >
                  <MediaProvider />
                  <DefaultVideoLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
              </div>
            </CardContent>
          </Card>
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                {course?.videos.map((video) => (
                  <div
                    key={video._id}
                    className={`p-4 rounded-lg cursor-pointer mb-2 transition-colors duration-200 ${
                      video._id === selectedVideo?._id
                        ? 'bg-zinc-200'
                        : 'hover:bg-secondary'
                    }`}
                    onClick={() => handleVideoClick(video)}
                  >
                    <h4 className="font-semibold">{video.title}</h4>
                    <p className="text-sm mt-1 line-clamp-2">{video.description}</p>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>{selectedVideo?.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{selectedVideo?.description}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerPage;
