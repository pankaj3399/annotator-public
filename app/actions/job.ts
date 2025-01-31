// app/actions/jobPost.ts
"use server";

import { revalidatePath } from "next/cache";
import JobPost, { IJobPost } from "@/models/JobPost";
import { connectToDatabase } from "@/lib/db";
import TurndownService from "turndown";
import { getServerSession } from "next-auth";
import JobApplication from "@/models/JobApplication";
import { authOptions } from "@/auth";

const turndownService = new TurndownService();
export async function geocodeLocation(location: string) {
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.GEOCODING_API}`);

    const data = await response.json();

    if (data.status === 'OK') {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      return { lat, lng };
    } else {
      console.error("Geocoding API error:", data.status);
      return null;
    }
  } catch (error) {
    console.error("Error geocoding location:", error);
    return null;
  }
}
export async function createJobPost(data: {
  title: string;
  content: string; // HTML content from ReactQuill
  startDate: Date;
  endDate: Date;
  compensation: string;
  status?: "draft" | "published";
  projectId: string;
  location: string;
}) {
  let geocodedData: { lat: string; lng: string } = { lat: '', lng: '' }; // Default values for lat and lng

  try {
    await connectToDatabase();

    // Safely handle conversion with try-catch for potential RangeError
    let markdownContent = "";
    try {
      markdownContent = turndownService.turndown(data.content);
    } catch (error) {
      if (error instanceof RangeError) {
        console.error("RangeError occurred during content conversion, but proceeding without converting HTML.");
        markdownContent = data.content;  // Use the original content as fallback
      } else {
        throw error;  // Re-throw if it's not a RangeError
      }
    }

    // Use geocodeLocation with fetch
    try {
      const result = await geocodeLocation(data.location);
      if (result) {
        geocodedData = result;
      } else {
        console.warn("Geocoding failed, using default coordinates.");
      }
    } catch (e) {
      // Do nothing if geocoding fails, just proceed
      console.warn("Geocoding failed, using default coordinates.");
    } finally {
      // This block will execute regardless of success/failure of geocoding
      const { lat, lng } = geocodedData;

      // Proceed with job post creation
      const jobPost = await JobPost.create({
        title: data.title,
        content: markdownContent,
        projectDuration: {
          startDate: data.startDate,
          endDate: data.endDate,
        },
        compensation: data.compensation,
        status: data.status || "draft",
        projectId: data.projectId,
        location: data.location,
        coordinates: [lat, lng], // lat and lng are strings
      });

      revalidatePath("/jobs"); // Revalidate the jobs listing page
      return { success: true, data: jobPost };
    }
  } catch (error) {
    // Handle unexpected errors gracefully
    console.error("Error creating job post:", error);
    return { success: false, error: "Failed to create job post" };
  }
}


export async function getJobPosts(options: {
  status?: "draft" | "published";
  page?: number;
  limit?: 10 | 20 | 50 | 100;
}) {
  try {
    await connectToDatabase();
    let limit = options.limit || 10;

    if (![10, 20, 50, 100].includes(limit)) {
      limit = 10; 
    }
    const { status, page = 1} = options;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};

    const [posts, total] = await Promise.all([
      JobPost.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobPost.countDocuments(query),
    ]);

    const response = {
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    return JSON.stringify(response); // Stringify the response before returning
  } catch (error) {
    console.error("Error fetching job posts:", error);
    const errorResponse = { success: false, error: "Failed to fetch job posts" };
    return JSON.stringify(errorResponse); // Stringify error response
  }
}


export async function updateJobPost(
  id: string,
  data: {
    title?: string;
    content?: string;
    startDate?: Date;
    endDate?: Date;
    compensation?: string;
    status?: "draft" | "published";
  }
) {
  try {
    await connectToDatabase();

    const updateData: any = { ...data };

    // If content is provided in HTML format, convert to Markdown
    if (data.content) {
      updateData.content = turndownService.turndown(data.content);
    }

    // Update the dates if provided
    if (data.startDate || data.endDate) {
      updateData.projectDuration = {
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate && { endDate: data.endDate }),
      };
    }

    const jobPost = await JobPost.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!jobPost) {
      return { success: false, error: "Job post not found" };
    }

    revalidatePath("/jobs");
    return { success: true, data: jobPost };
  } catch (error) {
    console.error("Error updating job post:", error);
    return { success: false, error: "Failed to update job post" };
  }
}

export async function getJobPost(id: string) {
  try {
    await connectToDatabase();

    console.log(id);
    const jobPost = await JobPost.findById(id).lean();

    if (!jobPost) {
      return { success: false, error: "Job post not found" };
    }

    return { success: true, data: jobPost };
  } catch (error) {
    console.error("Error fetching job post:", error);
    return { success: false, error: "Failed to fetch job post" };
  }
}

export async function applyForJob(jobId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      throw new Error("Authentication required");
    }

    await connectToDatabase();

    // Check if job exists
    const job = await JobPost.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      jobId: jobId,
      userId: session.user.id,
    });

    if (existingApplication) {
      throw new Error("You have already applied for this job");
    }

    // Create new application
    const application = await JobApplication.create({
      jobId: jobId,
      userId: session.user.id,
      appliedAt: new Date(),
      status: "pending",
    });

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);

    return { success: true, application };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to apply for job",
    };
  }
}

export async function getJobApplications(jobId: string) {
  try {
    await connectToDatabase();

    const applications = await JobApplication.find({ jobId })
      .sort({ appliedAt: -1 })
      .populate("userId", "name email")
      .lean();

    return { success: true, data: applications };
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return { success: false, error: "Failed to fetch job applications" };
  }
}

export const getAllJobApplications = async() => {
  try {
    await connectToDatabase();

    const applications = await JobApplication.find()
      .sort({ appliedAt: -1 })
      .populate("jobId")
      .populate("userId", "name email")
      .lean();

    return { success: true, data: applications };
  } catch (error) {
    console.error("Error fetching job applications:", error);
    return { success: false, error: "Failed to fetch job applications" };
  }
};
