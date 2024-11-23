"use server";
import mongoose from "mongoose";
import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Task from "@/models/Task";
import { getServerSession } from "next-auth";
import { template } from "../template/page";
import Rework from "@/models/Rework";
import { AIJob } from "@/models/aiModel";

export async function updateTask(
  template: template,
  _id: string,
  projectid: string,
  time: number
) {
  await connectToDatabase();

  const res = await Task.findOneAndUpdate(
    { _id },
    {
      ...template,
      content: template.content,
      submitted: true,
      project: projectid,
      timeTaken: time,
    }
  );

  return JSON.stringify(res);
}

export async function createTasks(
  tasks: {
    project: string;
    name: string;
    content: string;
    timer: number;
    reviewer: string;
  }[]
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const taskData = tasks.map((task) => ({
    ...task,
    project_Manager: session.user.id,
    reviewer: task.reviewer || null,
  }));

  await Task.insertMany(taskData);
}

export async function getAllTasks(projectid: string) {
  await connectToDatabase();
  const res = await Task.find({ project: projectid });
  return JSON.stringify(res);
}

export async function getATask(projectid: string) {
  await connectToDatabase();
  const res = await Task.findOne({ project: projectid });
  return JSON.stringify(res);
}

export async function getAllAcceptedTasks(projectid: string) {
  await connectToDatabase();
  const res = await Task.find({ project: projectid, status: "accepted" });
  return JSON.stringify(res);
}

export async function deleteTask(_id: string) {
  await connectToDatabase();
  await AIJob.deleteMany({ taskid: _id });
  const res = await Task.deleteOne({ _id });
  return JSON.stringify(res);
}

export async function changeAnnotator(
  _id: string,
  annotator: string,
  ai: boolean = false,
  isReviewer: boolean = false
) {
  await connectToDatabase();

  // If AI is being assigned
  if (ai) {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        annotator: null,
        ai: annotator,
        // Don't modify reviewer when assigning AI
        $setOnInsert: { reviewer: undefined },
      },
      {
        new: true,
      }
    );
    return JSON.stringify(res);
  }

  // If assigning a reviewer
  if (isReviewer) {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        reviewer: annotator,
        // Don't modify existing annotator or AI status
        $setOnInsert: { ai: null },
      },
      {
        new: true,
      }
    );
    return JSON.stringify(res);
  }

  // If assigning an annotator (default case)
  const res = await Task.findOneAndUpdate(
    { _id },
    {
      annotator,
      ai: null,
      // Don't modify existing reviewer
      $setOnInsert: { reviewer: undefined },
    },
    {
      new: true,
    }
  );
  return JSON.stringify(res);
}

export async function getTasksByProject(id: string) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  const res = await Task.find({ annotator: annotatorId, project: id });
  return JSON.stringify(res);
}

export async function getTasksOfAnnotator() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  const res = await Task.find({ annotator: annotatorId });
  return JSON.stringify(res);
}

export async function getTask(_id: string) {
  await connectToDatabase();
  const res = await Task.findById(_id);
  return JSON.stringify(res);
}

export async function setTaskStatus(
  _id: string,
  status: string,
  feedback?: string,
  annotator?: string
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (status == "reassigned") {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        submitted: false,
        status,
        timeTaken: 0,
        feedback: "",
        annotator,
        ai: null, // Set to null instead of false
      }
    );
    return res.status;
  }

  if (status == "rejected") {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        submitted: false,
        status,
        timeTaken: 0,
        feedback,
        ai: null, // Set to null instead of false
      }
    );

    // Create rework record with reviewer information
    await Rework.create({
      name: res.name,
      created_at: res.created_at,
      project: res.project,
      project_Manager: res.project_Manager,
      annotator: res.annotator,
      reviewer: userId, // Add reviewer information
      task: res._id,
      feedback: res.feedback,
    });

    return res.status;
  }

  const sanitizedAI = typeof annotator === "string" ? annotator : null;

  if (status == "reassigned") {
    const res = await Task.findOneAndUpdate(
      { _id },
      {
        submitted: false,
        status,
        timeTaken: 0,
        feedback: "",
        annotator,
        ai: sanitizedAI, // Use sanitized value
      }
    );
    return res.status;
  }

  const res = await Task.findOneAndUpdate(
    { _id },
    {
      status,
      feedback: "",
    }
  );
  return res.status;
}
export async function getDistinctProjectsByAnnotator() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const annotatorId = session?.user.id;

  try {
    const uniqueProjects = await Task.aggregate([
      { $match: { annotator: new mongoose.Types.ObjectId(annotatorId) } },
      { $group: { _id: "$project" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      { $project: { _id: 0, project: "$projectDetails" } },
    ]);
    const pro = uniqueProjects.map((project) => project.project);

    return JSON.stringify(pro);
  } catch (error) {
    console.error("Error fetching distinct projects by annotator:", error);
    throw error;
  }
}

export async function getTasksToReview() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const reviewerId = session?.user.id;

  if (!reviewerId) {
    throw new Error("Unauthorized");
  }

  const res = await Task.find({
    reviewer: reviewerId,
    submitted: true,
    status: "pending",
  }).populate([
    { path: "project", select: "name" },
    { path: "annotator", select: "name email" },
  ]);

  return JSON.stringify(res);
}

export async function getDistinctProjectsByReviewer() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const reviewerId = session?.user.id;

  try {
    const uniqueProjects = await Task.aggregate([
      { $match: { reviewer: new mongoose.Types.ObjectId(reviewerId) } },
      { $group: { _id: "$project" } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      { $project: { _id: 0, project: "$projectDetails" } },
    ]);

    return JSON.stringify(uniqueProjects.map((project) => project.project));
  } catch (error) {
    console.error("Error fetching distinct projects by reviewer:", error);
    throw error;
  }
}

export async function assignReviewer(_id: string, reviewerId: string | null) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Find the task to ensure it belongs to the user's project
  const existingTask = await Task.findById(_id);

  if (!existingTask) {
    throw new Error("Task not found");
  }

  // Perform the update
  const res = await Task.findOneAndUpdate(
    { _id },
    {
      reviewer: reviewerId,
      // Ensure AI is set to null when assigning a reviewer
      ai: null,
    },
    {
      new: true,
    }
  );

  return JSON.stringify(res);
}
