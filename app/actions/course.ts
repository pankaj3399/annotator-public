'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Course from "@/models/Courses";
import { getServerSession } from "next-auth";
import ffmpeg from 'fluent-ffmpeg';

interface Video {
  title: string;
  description: string;
  url: string;
  duration: string;
}

interface CourseData {
  name: string;
  description: string;
  instructor: string;
  thumbnail: string;
  tags: string[];
  videos: Video[];
  created_at: string;
  updated_at: string;
}



export async function createCourse(courseData) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    // Ensure the instructor is the current logged-in user
    const newCourse = await Course.create({
      ...courseData,
      instructor: session?.user.id,
    });

    return { data: JSON.stringify(newCourse) };
  } catch (e) {
    console.error(e);
    return { error: "Error while creating the course" };
  }
}



export async function updateCourse(courseId: string, updatedData: any) {
    try {
      await connectToDatabase();
  
      // Update the course by its ID
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        updatedData,
        { new: true }
      );
  
      if (!updatedCourse) {
        return { error: "Course not found" };
      }
  
      return { data: JSON.stringify({ message: `Course updated successfully with title ${updatedCourse.title}` }) };
    } catch (e) {
      console.error(e);
      return { error: "Error while updating the course values" };
    }
  }


  export async function deleteCourse(courseId: string) {
    try {
      await connectToDatabase();
  
      // Delete the course by its ID
      const deletedCourse = await Course.findByIdAndDelete(courseId);
  
      if (!deletedCourse) {
        return { error: "Course not found" };
      }
  
      return { data: JSON.stringify({ message: "Course deleted successfully" }) };
    } catch (e) {
      console.error(e);
      return { error: "Error while deleting the course" };
    }
  }
  export async function getCourseById(courseId: string) {
    try {
      await connectToDatabase();
  
      const course = await Course.findById(courseId)
        .populate('instructor', 'name') // Populate the instructor's name
        .exec();
  
      if (!course) {
        return { error: "Course not found" };
      }
  
      return { data: JSON.stringify(course) };
    } catch (e) {
      console.error(e);
      return { error: "Error while retrieving the course" };
    }
  }
  
  export async function getCourseByIdAndPublishedVideo(courseId: string) {
    try {
      await connectToDatabase();
  
      // Fetch the course by its ID and populate the instructor
      const course = await Course.findById(courseId)
        .populate('instructor', 'name') // Populate the instructor's name
        .exec();
  
      if (!course) {
        return { error: "Course not found" };
      }
  
      // Filter the videos to include only those where isPublished is true
      course.videos = course.videos.filter(video => video.isPublished === true);
  
      // Return the course with only published videos (structure remains the same)
      return { data: JSON.stringify(course) };
    } catch (e) {
      console.error(e);
      return { error: "Error while retrieving the course" };
    }
  }
  
  


  export async function addVideoToCourse(courseId: string, video: Video) {
    try {
      await connectToDatabase();
      
      // Update the course with the new video without the duration
      console.log(video)
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        {
          $push: { videos: video },
        },
        { new: true }
      );
  
      if (!updatedCourse) {
        return { error: "Course not found" };
      }
  
      return { data: JSON.stringify({ message: `Video added successfully to course ${updatedCourse.title}` }) };
    } catch (e) {
      console.error(e);
      return { error: "Error while adding video to course" };
    }
  }
  
  
  async function getVideoDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg(url)
        .inputOptions('-v quiet') // Suppresses unnecessary output
        .ffprobe((err, metadata) => {
          if (err) {
            reject("Error retrieving video metadata");
          }
          const durationInSeconds = metadata.format?.duration;
          if (durationInSeconds === undefined) {
            reject("Duration is undefined");
          } else {
            resolve(durationInSeconds);
          }
        });
    });
  }
  


  export async function getCourseByProjectManager() {
    try { 
      await connectToDatabase();
      const session = await getServerSession(authOptions);
      // Use populate to get the instructor's data
      const res = await Course.find({ instructor: session?.user?.id })
        .populate('instructor', 'name email') // Add the fields you want from the User model
        .exec();
      return { data: JSON.stringify(res) };
    } catch(e) {
      console.error(e);
      return { error: "Error while fetching the courses according to project manager" };
    }
  }




  export async function getCourses(){
    try{
      await connectToDatabase(); 

      const res = await Course.find({}).populate('instructor', 'name email');
      return {data:JSON.stringify(res)}

    }
    catch(e){
      console.error(e);
      return {error:"Error while fetching all the projects"}
    }
  }


  export async function PublishVideo({ courseId, videoId }: { courseId: string, videoId: string }) {
    try {
      await connectToDatabase();
  
      // Find the course and toggle the isPublished field for the specific video
      const course = await Course.findById(courseId);
      if (!course) {
        return { error: "Course not found" };
      }
  
      // Find the video by its ID
      const video = course.videos.find(video => video._id.toString() === videoId);
      if (!video) {
        return { error: "Video not found" };
      }
  
      // Toggle the isPublished field
      video.isPublished = video.isPublished === "true" ? "false" : "true"; // Toggle between "true" and "false"
  
      // Save the updated course
      await course.save();
  
      return { success: true };
    } catch (error) {
      console.error(error);
      return { error: "An error occurred while updating the video status" };
    }
  }