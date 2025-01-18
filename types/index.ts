import { Types } from 'mongoose';

export interface CourseVideo {
  title: string;
  description?: string;
  url: string;
  duration?: string;
  isPublished: boolean;
}

export interface CourseDocument {
  _id: Types.ObjectId;
  name: string;
  description: string;
  instructor: Types.ObjectId;
  thumbnail?: string;
  tags?: string[];
  videos: CourseVideo[];
  created_at: Date;
  updated_at: Date;
}