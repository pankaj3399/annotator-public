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
      {
        $match: {
          project_Manager: new mongoose.Types.ObjectId(managerId),
          timeTaken: { $gt: 0 } // Only include tasks with time > 0
        }
      },
      {
        $group: {
          _id: "$project_Manager",
          totalTasks: { $sum: 1 },
          averageTime: { $avg: "$timeTaken" },
          submittedTasks: { $sum: { $cond: [{ $eq: ["$submitted", true] }, 1, 0] } },
          statuses: { $push: "$status" }
        }
      }
    ]);

    // Count projects and templates using Project and Template collections
    const projects = await Project.countDocuments({ project_Manager: managerId });
    const templates = await Template.countDocuments({
      project: { $in: await Project.find({ project_Manager: managerId },) }
    });

    // Count annotators
    const annotators = await User.countDocuments({ role: 'annotator' });
    const zeroTimeTasks = await Task.countDocuments({
      project_Manager: managerId,
      timeTaken: 0
    });

    return JSON.stringify({
      tasksData: result.length ? { ...result[0], zeroTimeTasks } : { zeroTimeTasks },
      projects,
      templates,
      annotators
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { error: 'Error occurred while fetching dashboard data' };
  }
}



export async function getProjectNameAndId(): Promise<string> {
  try {
    await connectToDatabase();

    const projects = await Project.find({}, "name _id");

    // Return a stringified object with project IDs and names
    const response = projects.map((project) => ({
      id: project._id,
      name: project.name
    }));

    return JSON.stringify(response);
  } catch (e) {
    console.error("Error fetching names of projects!", e);
    return JSON.stringify([]);
  }
}

export async function getSelectedProjectsDashboard(selectedProjects: string[]) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const managerId = session?.user.id;

    if (!managerId) {
      return { error: 'User is not authenticated' };
    }

    // Aggregating data for the selected projects
    const result = await Task.aggregate([
      {
        $match: {
          project: { $in: selectedProjects },
          project_Manager: new mongoose.Types.ObjectId(managerId),
          timeTaken: { $gt: 0 } // Only include tasks with time > 0
        }
      },
      {
        $group: {
          _id: "$project",
          totalTasks: { $sum: 1 },
          averageTime: { $avg: "$timeTaken" },
          submittedTasks: { $sum: { $cond: [{ $eq: ["$submitted", true] }, 1, 0] } },
          statuses: { $push: "$status" }
        }
      }
    ]);

    // Fetch project count and template count for the selected projects
    const projectsCount = await Project.countDocuments({
      _id: { $in: selectedProjects },
      project_Manager: new mongoose.Types.ObjectId(managerId)
    });

    const templatesCount = await Template.countDocuments({
      project: { $in: selectedProjects }
    });

    // Count annotators
    const annotatorsCount = await User.countDocuments({ role: 'annotator' });

    // Count zero time tasks for the selected projects
    const zeroTimeTasks = await Task.countDocuments({
      project: { $in: selectedProjects },
      project_Manager: new mongoose.Types.ObjectId(managerId),
      timeTaken: 0
    });

    return JSON.stringify({
      tasksData: result.length ? result : [],
      projects: projectsCount,
      templates: templatesCount,
      annotators: annotatorsCount,
      zeroTimeTasks
    });

  } catch (error) {
    console.error('Error fetching selected projects dashboard data:', error);
    return { error: 'Error occurred while fetching dashboard data for selected projects' };
  }
}


export async function getProjectDashboard(id: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const managerId = session?.user.id;

    if (!managerId) {
      return { error: 'User is not authenticated' };
    }

    // Aggregating project, task, and other related data
    const result = await Task.aggregate([
      {
        $match: {
          project_Manager: new mongoose.Types.ObjectId(managerId),
          project: new mongoose.Types.ObjectId(id),
          timeTaken: { $gt: 0 } // Only include tasks with time > 0
        }
      },

      // Group to count tasks, calculate average time, and statuses/submissions
      {
        $group: {
          _id: "$project_Manager",
          totalTasks: { $sum: 1 },
          averageTime: { $avg: "$timeTaken" },
          submittedTasks: { $sum: { $cond: [{ $eq: ["$submitted", true] }, 1, 0] } },
          statuses: { $push: "$status" }
        }
      }
    ]);

    // To get the total number of tasks (including those with zero time)
    const totalTasksResult = await Task.aggregate([
      {
        $match: {
          project_Manager: new mongoose.Types.ObjectId(managerId),
          project: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $group: {
          _id: "$project_Manager",
          totalTasks: { $sum: 1 },
          submittedTasks: { $sum: { $cond: [{ $eq: ["$submitted", true] }, 1, 0] } },
          statuses: { $push: "$status" }
        }
      }
    ]);

    // Count projects and templates using Project and Template collections
    const rework: number = await Rework.countDocuments({ project: new mongoose.Types.ObjectId(id) });

    // Count annotators
    const annotators = await User.countDocuments({ role: 'annotator' });

    const zeroTimeTasks = await Task.countDocuments({
      project_Manager: new mongoose.Types.ObjectId(managerId),
      project: new mongoose.Types.ObjectId(id),
      timeTaken: 0
    });


    // Combine the results
    const tasksData = result.length ? {
      ...result[0],
      totalTasks: totalTasksResult.length ? totalTasksResult[0].totalTasks : 0,
      submittedTasks: totalTasksResult.length ? totalTasksResult[0].submittedTasks : 0,
      statuses: totalTasksResult.length ? totalTasksResult[0].statuses : [],
      zeroTimeTasks: zeroTimeTasks
    } : {};

    return JSON.stringify({
      tasksData,
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



