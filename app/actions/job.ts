// app/actions/jobPost.ts
"use server";

import { revalidatePath } from "next/cache";
import JobPost, { IJobPost } from "@/models/JobPost";
import { connectToDatabase } from "@/lib/db";
import TurndownService from "turndown";
import { getServerSession } from "next-auth";
import JobApplication from "@/models/JobApplication";
import { authOptions } from "@/auth";
import { getProjectDetailsByManager } from "./dashboard";
import { getLabels, getProjectLabels } from "./label";

const turndownService = new TurndownService();
export async function createJobPost(data: {
  title: string;
  content: string; // HTML content from ReactQuill
  startDate: Date;
  endDate: Date;
  compensation: string;
  status?: "draft" | "published";
  projectId: string;
  location: string;
  lat: number;
  lng: number;
  image:string;
}) {
  try {
    await connectToDatabase();

    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(data.content);

    console.log(data);

    if(data.image == ''){
      data.image = `https://${process.env.AWS_BUCKET_NAME}.${process.env.AWS_REGION}.amazonaws.com/images/defaultJobThumbnail.jpg`
    }

    const labels = await getProjectLabels(data.projectId);

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
      lat:data.lat,
      lng:data.lng,
      image:data.image,
      label:labels
    });

    return { success: true, data: jobPost };
  } catch (error) {
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
