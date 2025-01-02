import React from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from 'next/image';
import { Star, StarHalf } from 'lucide-react';

interface CourseListProps {
  courses: CourseData[];
  onDeleteCourse: (courseId: string) => void;
}

interface Video {
  title: string;
  description: string;
  url: string;
  duration: number;
}

interface Instructor {
  name: string;
}

export interface CourseData {
  _id: string;
  name: string;
  description: string;
  thumbnail: string; // This should be a URL to your image in AWS S3
  tags: string[];
  videos: Video[]; // Make this optional
  instructor: Instructor;
  created_at: string;
  updated_at: string;
}

const DefaultThumbnail = () => (
  <div className="relative w-full aspect-video bg-slate-100 rounded-t-lg overflow-hidden">
    <svg
      className="absolute inset-0 w-full h-full text-slate-200"
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="50" height="50" fill="currentColor" />
      <path
        d="M25 20C26.6569 20 28 18.6569 28 17C28 15.3431 26.6569 14 25 14C23.3431 14 22 15.3431 22 17C22 18.6569 23.3431 20 25 20Z"
        fill="#94A3B8"
      />
      <path
        d="M33 32H17C16.4477 32 16 31.5523 16 31V27C16 24.2386 18.2386 22 21 22H29C31.7614 22 34 24.2386 34 27V31C34 31.5523 33.5523 32 33 32Z"
        fill="#94A3B8"
      />
    </svg>
  </div>
);

const CourseList: React.FC<CourseListProps> = ({ courses, onDeleteCourse }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {courses.length === 0 ? (
        <p className="text-muted-foreground col-span-full text-center py-8">
          No courses uploaded yet. Click the "Create Course" button to get started.
        </p>
      ) : (
        courses.map((course) => (
          <Card key={course._id} className="flex flex-col overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="relative">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail} // This should be the full URL to your AWS S3 image
                  alt={course.name}
                  width={400}
                  height={225}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <DefaultThumbnail />
              )}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  Popular
                </Badge>
              </div>
            </div>
            
            <CardContent className="flex-1 p-4">
              <h3 className="font-bold text-lg mb-2 line-clamp-2">{course.name}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{course.description}</p>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                {course.instructor && (
                  <>
                    <span>By</span>
                    <span className="font-medium text-foreground">
                      {course.instructor.name}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <StarHalf className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-sm text-muted-foreground">(4.5)</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {course.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 gap-2">
              <Button
                variant="outline"
                asChild
                className="flex-1"
              >
                <a href={`/courses/${course._id}`}>View Details</a>
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDeleteCourse(course._id)}
                className="flex-shrink-0"
              >
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
};

export default CourseList;
