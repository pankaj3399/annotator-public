'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import Rework from "@/models/Rework";
import Task from "@/models/Task";
import { Template } from "@/models/Template";
import { User } from "@/models/User";
import mongoose from 'mongoose'
import { getServerSession } from "next-auth";

export async function getTasksStatusOfManager() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions)
    const res = await Task.find({ project_Manager: session?.user.id })
      .select('status') 
      .lean();
    return { data: JSON.stringify(res) }
  } catch (error) {
    console.error(error)
    return { error: 'Error occurred while fetching tasks of manager' }
  }
}

export async function getGlobalDashboard() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const managerId = session?.user.id;

    if (!managerId) {
      return { error: 'User is not authenticated' };
    }

    // Aggregating project, task, and other related data
    const result = await Task.aggregate([
      { $match: { project_Manager: new mongoose.Types.ObjectId(managerId) } }, // Match tasks by manager
      
      // Group to count tasks, calculate average time, and statuses/submissions
      {
        $group: {
          _id: "$project_Manager",
          totalTasks: { $sum: 1 },
          averageTime: { $avg: "$timeTaken" },
          submittedTasks: { $sum: { $cond: [{ $eq: ["$submitted", true] }, 1, 0] } }, // Count submitted tasks
          statuses: { $push: "$status" } // Collect all statuses
        }
      }
    ]);

    // Count projects and templates using Project and Template collections
    const projects = await Project.countDocuments({ project_Manager: managerId });
    const templates = await Template.countDocuments({
      project: { $in: await Project.find({ project_Manager: managerId }) }
    });

    // Count annotators
    const annotators = await User.countDocuments({ role: 'annotator' });

    return JSON.stringify({
      tasksData: result.length ? result[0] : {},
      projects,
      templates,
      annotators
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { error: 'Error occurred while fetching dashboard data' };
  }
}


export async function getProjectDashboard(id:string) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const managerId = session?.user.id;

    if (!managerId) {
      return { error: 'User is not authenticated' };
    }

    // Aggregating project, task, and other related data
    const result = await Task.aggregate([
      { $match: { project_Manager: new mongoose.Types.ObjectId(managerId), project: new mongoose.Types.ObjectId(id) } }, // Match tasks by manager
      
      // Group to count tasks, calculate average time, and statuses/submissions
      {
        $group: {
          _id: "$project_Manager",
          totalTasks: { $sum: 1 },
          averageTime: { $avg: "$timeTaken" },
          submittedTasks: { $sum: { $cond: [{ $eq: ["$submitted", true] }, 1, 0] } }, // Count submitted tasks
          statuses: { $push: "$status" } // Collect all statuses
        }
      }
    ]);

    // Count projects and templates using Project and Template collections
    const rework: number = await Rework.countDocuments({ project: new mongoose.Types.ObjectId(id) });

    // Count annotators
    const annotators = await User.countDocuments({ role: 'annotator' });

    return JSON.stringify({
      tasksData: result.length ? result[0] : {},
      rework,
      annotators
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { error: 'Error occurred while fetching dashboard data' };
  }
}

export async function getTasksSubmittedOfManager() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions)
    const res = await Task.find({ project_Manager: session?.user.id })
      .select('submitted')
      .lean();
    return { data: JSON.stringify(res) }
  } catch (error) {
    console.error(error)
    return { error: 'Error occurred while fetching tasks of manager' }
  }
}
export async function getTasksAverageTimeOfManager() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions)
    const res = await Task.find({ project_Manager: session?.user.id })
      .select('timeTaken')
      .lean();
    return { data: JSON.stringify(res) }
  } catch (error) {
    console.error(error)
    return { error: 'Error occurred while fetching tasks of manager' }
  }
}

export async function getProjectDetailsByManager() {
  try {
    const session = await getServerSession(authOptions)
    const managerId = session?.user.id;
    const projects = await Project.countDocuments({ project_Manager: managerId });

    const templates = await Template.countDocuments({
      project: { $in: await Project.find({ project_Manager: managerId }).distinct('_id') }
    });

    const tasks = await Task.countDocuments({ project_Manager: managerId });

    const annotators = await User.countDocuments({ role: 'annotator' });

    return {
      projects,
      templates,
      tasks,
      annotators,
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw error;
  }
}