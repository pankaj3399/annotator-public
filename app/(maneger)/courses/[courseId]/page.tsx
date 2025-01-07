// pages/course/[id].tsx

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { addVideoToCourse, getCourseById } from '@/app/actions/course';
import { notFound } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
import VideoUploader from '@/components/S3VideoUpload';  // Ensure the path is correct
import { toast } from 'sonner';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Clock, User, Calendar, Tag } from 'lucide-react';

const DEFAULT_COURSE_THUMBNAIL = '/courseThumbnail.jpg';
const DEFAULT_VIDEO_THUMBNAIL = '/videoThumbnail.jpg';

export interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  duration: string;
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

const getCourseDetails = async (courseId: string) => {
  const result = await getCourseById(courseId);
  if (result.error) {
    return null;
  }
  if (result.data)
    return JSON.parse(result?.data);
  return null;
};

const CourseDetails = () => {
  const pathName = usePathname();
  const courseId = pathName.split('/')[2];
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [newVideo, setNewVideo] = useState<Video | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoDuration,setVideoDuration]=useState('')
  const [loading, setLoading] = useState(false);  // New state for loading

  useEffect(() => {
    const fetchCourse = async () => {
      const courseData = await getCourseDetails(courseId);
      if (courseData) {
        setCourse(courseData);
      } else {
        notFound();
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleVideoUploadComplete = (mongoId: string) => {

    setVideoDuration(videoDuration)
    // Now, you can update the state with the correct video data
    setNewVideo(prevState => ({
      ...prevState!,
      url: `${process.env.NEXT_PUBLIC_S3_BASE_URL}/hls/${mongoId}/${mongoId}.m3u8`,  // Store playlist URL
      _id: mongoId,
      duration:"0"
    }));
  
    toast.success('Video uploaded successfully!');
  };
  


  const handleAddVideo = async () => {
    if (!newVideo || !videoTitle || !newVideo.url) {
      toast.error('Please fill all fields before adding a video.');
      return;
    }

    const video = {
      ...newVideo,
      title: videoTitle,
      description: videoDescription,
      duration: videoDuration,
    };

    setLoading(true);  // Set loading to true when adding the video

    try {
      const result = await addVideoToCourse(courseId, video);

      if (result.error) {
        toast.error(result.error);
        setLoading(false);  // Set loading to false if there is an error
        return;
      }

      const updatedCourse = {
        ...course!,
        videos: [...course!.videos, video],
      };
      setCourse(updatedCourse);

      setVideoTitle('');
      setVideoDescription('');
      setNewVideo(null);
      setIsDialogOpen(false);

      toast.success('Video added successfully!');
    } catch (error) {
      toast.error('Error adding video to course.');
      console.error(error);
    } finally {
      setLoading(false);  // Set loading to false once process is completed
    }
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
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div 
          className="absolute inset-0 opacity-30 bg-[url('/courseThumbnail.jpg')] bg-cover bg-center mix-blend-overlay"
          aria-hidden="true"
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:flex-1 md:pr-8">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-4">
                {course.name}
              </h1>
              <p className="text-xl max-w-3xl mb-6 line-clamp-3">{course.description}</p>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  <span>{course.instructor.name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>Updated {new Date(course.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="bg-white text-blue-600">
                    <Tag className="w-4 h-4 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="mt-8 md:mt-0 md:flex-shrink-0">
              {course.thumbnail && course.thumbnail !== '/courseThumbnail.jpg' && (
                <Image
                  src={course.thumbnail}
                  alt={course.name}
                  width={400}
                  height={220}
                  className="rounded-lg shadow-xl object-cover w-full md:w-auto"
                  style={{ maxHeight: '220px' }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-900">Course Videos</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                Add New Video
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add a New Video</DialogTitle>
                <DialogDescription>Fill in the details of the new video you want to add to this course.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="videoTitle" className="text-sm font-medium text-gray-700">Video Title</label>
                  <Input
                    id="videoTitle"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter video title"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="videoDescription" className="text-sm font-medium text-gray-700">Video Description</label>
                  <Textarea
                    id="videoDescription"
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    placeholder="Enter video description"
                  />
                </div>

                {/* Video Upload Section */}
                <VideoUploader onSuccess={handleVideoUploadComplete}/>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleAddVideo}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Processing...' : 'Add Video'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {course.videos.length === 0 ? (
          <div className="text-center py-12">
            <PlayCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No videos</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new video to this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {course.videos.map((video) => (
              <Card key={video._id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300" onClick={() => router.push(`/courses/${course._id}/${video._id}`)}>
                <div className="relative h-48">
                  <Image
                    src={DEFAULT_VIDEO_THUMBNAIL}
                    alt="Video Thumbnail"
                    layout="fill"
                    objectFit="cover"
                    className="absolute inset-0"
                  />
                </div>
                <CardContent>
                  <CardTitle>{video.title}</CardTitle>
                  <p className="text-sm text-gray-600">{video.description}</p>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  {/* <span className="text-xs text-gray-500">Duration: {video.duration} seconds</span> */}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
