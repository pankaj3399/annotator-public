//app/(manager)/dashboard/[projectId]/page.tsx
'use server';

import { getAllAnnotators } from '@/app/actions/annotator';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/Project';
import Rework from '@/models/Rework';
import Task from '@/models/Task';
import { Template } from '@/models/Template';
import { User } from '@/models/User'; // User model is still needed for other operations
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';

export async function getTasksStatusOfManager() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const res = await Task.find({ project_Manager: session?.user.id })
      .select('status')
      .lean();
    return { data: JSON.stringify(res) };
  } catch (error) {
    console.error(error);
    return { error: 'Error occurred while fetching tasks of manager' };
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
          timeTaken: { $gt: 0 }, // Only include tasks with time > 0
        },
      },
      {
        $group: {
          _id: '$project_Manager',
          totalTasks: { $sum: 1 },
          averageTime: { $avg: '$timeTaken' },
          submittedTasks: {
            $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] },
          },
          statuses: { $push: '$status' },
        },
      },
    ]);

    // Count projects and templates using Project and Template collections
    const projects = await Project.countDocuments({
      project_Manager: managerId,
    });
    const templates = await Template.countDocuments({
      project: {
        $in: await Project.find({ project_Manager: managerId }).distinct('_id'),
      },
    });

    // Count annotators using getAllAnnotators
    const annotatorsDataString = await getAllAnnotators(); // Fetches team-specific annotators
    const annotatorsArray = JSON.parse(annotatorsDataString);
    const annotators = annotatorsArray.length;

    const zeroTimeTasks = await Task.countDocuments({
      project_Manager: managerId,
      timeTaken: 0,
    });

    return JSON.stringify({
      tasksData: result.length
        ? { ...result[0], zeroTimeTasks }
        : { zeroTimeTasks },
      projects,
      templates,
      annotators, // This count is now from getAllAnnotators
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // If getAllAnnotators throws, this catch block will handle it.
    return { error: 'Error occurred while fetching dashboard data' };
  }
}

export async function getProjectNameAndId(): Promise<string> {
  try {
    await connectToDatabase();

    const projects = await Project.find({}, 'name _id');

    // Return a stringified object with project IDs and names
    const response = projects.map((project) => ({
      id: project._id,
      name: project.name,
    }));

    return JSON.stringify(response);
  } catch (e) {
    console.error('Error fetching names of projects!', e);
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
          project: {
            $in: selectedProjects.map((id) => new mongoose.Types.ObjectId(id)),
          }, // Ensure IDs are ObjectIds
          project_Manager: new mongoose.Types.ObjectId(managerId),
          timeTaken: { $gt: 0 }, // Only include tasks with time > 0
        },
      },
      {
        $group: {
          _id: '$project',
          totalTasks: { $sum: 1 },
          averageTime: { $avg: '$timeTaken' },
          submittedTasks: {
            $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] },
          },
          statuses: { $push: '$status' },
        },
      },
    ]);

    // Fetch project count and template count for the selected projects
    const projectsCount = await Project.countDocuments({
      _id: {
        $in: selectedProjects.map((id) => new mongoose.Types.ObjectId(id)),
      }, // Ensure IDs are ObjectIds
      project_Manager: new mongoose.Types.ObjectId(managerId),
    });

    const templatesCount = await Template.countDocuments({
      project: {
        $in: selectedProjects.map((id) => new mongoose.Types.ObjectId(id)),
      }, // Ensure IDs are ObjectIds
    });

    // Count annotators using getAllAnnotators
    const annotatorsDataString = await getAllAnnotators(); // Fetches team-specific annotators
    const annotatorsArray = JSON.parse(annotatorsDataString);
    const annotatorsCount = annotatorsArray.length;

    // Count zero time tasks for the selected projects
    const zeroTimeTasks = await Task.countDocuments({
      project: {
        $in: selectedProjects.map((id) => new mongoose.Types.ObjectId(id)),
      }, // Ensure IDs are ObjectIds
      project_Manager: new mongoose.Types.ObjectId(managerId),
      timeTaken: 0,
    });

    return JSON.stringify({
      tasksData: result.length ? result : [],
      projects: projectsCount,
      templates: templatesCount,
      annotators: annotatorsCount, // This count is now from getAllAnnotators
      zeroTimeTasks,
    });
  } catch (error) {
    console.error('Error fetching selected projects dashboard data:', error);
    return {
      error:
        'Error occurred while fetching dashboard data for selected projects',
    };
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
          timeTaken: { $gt: 0 }, // Only include tasks with time > 0
        },
      },
      {
        $group: {
          _id: '$project_Manager',
          totalTasks: { $sum: 1 },
          averageTime: { $avg: '$timeTaken' },
          submittedTasks: {
            $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] },
          },
          statuses: { $push: '$status' },
        },
      },
    ]);

    // To get the total number of tasks (including those with zero time)
    const totalTasksResult = await Task.aggregate([
      {
        $match: {
          project_Manager: new mongoose.Types.ObjectId(managerId),
          project: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $group: {
          _id: '$project_Manager',
          totalTasks: { $sum: 1 },
          submittedTasks: {
            $sum: { $cond: [{ $eq: ['$submitted', true] }, 1, 0] },
          },
          statuses: { $push: '$status' },
        },
      },
    ]);

    const rework: number = await Rework.countDocuments({
      project: new mongoose.Types.ObjectId(id),
    });

    // Count annotators using getAllAnnotators
    const annotatorsDataString = await getAllAnnotators(); // Fetches team-specific annotators
    const annotatorsArray = JSON.parse(annotatorsDataString);
    const annotators = annotatorsArray.length;

    const zeroTimeTasks = await Task.countDocuments({
      project_Manager: new mongoose.Types.ObjectId(managerId),
      project: new mongoose.Types.ObjectId(id),
      timeTaken: 0,
    });

    const tasksData =
      result.length || totalTasksResult.length
        ? {
            // Ensure tasksData is an object even if only zeroTimeTasks has value
            totalTasks: totalTasksResult.length
              ? totalTasksResult[0].totalTasks
              : 0,
            averageTime: result.length ? result[0].averageTime : 0, // from tasks with timeTaken > 0
            submittedTasks: totalTasksResult.length
              ? totalTasksResult[0].submittedTasks
              : 0,
            statuses: totalTasksResult.length
              ? totalTasksResult[0].statuses
              : [],
            zeroTimeTasks: zeroTimeTasks,
            ...(result.length && {
              // Spread properties from 'result' if it has data
              totalTasksWithTime: result[0].totalTasks, // Differentiate tasks with time > 0
            }),
          }
        : {
            zeroTimeTasks: zeroTimeTasks,
            totalTasks: 0,
            averageTime: 0,
            submittedTasks: 0,
            statuses: [],
          };

    return JSON.stringify({
      tasksData,
      rework,
      annotators, // This count is now from getAllAnnotators
    });
  } catch (error) {
    console.error('Error fetching project dashboard data:', error);
    return { error: 'Error occurred while fetching project dashboard data' };
  }
}

export async function getTasksSubmittedOfManager() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const res = await Task.find({ project_Manager: session?.user.id })
      .select('submitted')
      .lean();
    return { data: JSON.stringify(res) };
  } catch (error) {
    console.error(error);
    return { error: 'Error occurred while fetching tasks of manager' };
  }
}

export async function getTasksAverageTimeOfManager() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const res = await Task.find({ project_Manager: session?.user.id })
      .select('timeTaken')
      .lean();
    return { data: JSON.stringify(res) };
  } catch (error) {
    console.error(error);
    return { error: 'Error occurred while fetching tasks of manager' };
  }
}

export async function getProjectDetailsByManager() {
  try {
    await connectToDatabase(); // Ensure DB connection
    const session = await getServerSession(authOptions);
    const managerId = session?.user.id;

    if (!managerId) {
      // Consistent with other functions, could return an error object or throw
      // Throwing here as the original function did
      throw new Error('User is not authenticated');
    }

    const projects = await Project.countDocuments({
      project_Manager: managerId,
    });

    const templates = await Template.countDocuments({
      project: {
        $in: await Project.find({ project_Manager: managerId }).distinct('_id'),
      },
    });

    const tasks = await Task.countDocuments({ project_Manager: managerId });

    // Count annotators using getAllAnnotators
    const annotatorsDataString = await getAllAnnotators(); // Fetches team-specific annotators
    const annotatorsArray = JSON.parse(annotatorsDataString);
    const annotators = annotatorsArray.length;

    return {
      projects,
      templates,
      tasks,
      annotators, // This count is now from getAllAnnotators
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    // If getAllAnnotators throws, or any other DB op fails, it's caught here
    throw error; // Re-throwing as per original function's behavior
  }
}
