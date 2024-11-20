'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Task from "@/models/Task";
import Rework from "@/models/Rework";
import mongoose from 'mongoose';
import { getServerSession } from "next-auth";

export async function getAnnotatorTasks() {
  try {
    console.log('getAnnotatorTasks called');
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    console.log('Annotator ID:', annotatorId); // Debug log

    if (!annotatorId) {
      console.log('No annotator ID found'); // Debug log
      return { error: 'User is not authenticated' };
    }

    const tasks = await Task.find({ 
      annotator: new mongoose.Types.ObjectId(annotatorId) 
    })
    .sort({ updatedAt: -1 })
    .select('_id timeTaken submitted status updatedAt'); // Only select needed fields

    console.log('Tasks found:', tasks.length); // Debug log
    return { data: JSON.stringify(tasks) };
  } catch (error) {
    console.error('Error in getAnnotatorTasks:', error);
    return { error: 'Error occurred while fetching tasks' };
  }
}

export async function getAnnotatorProjectTasks(projectId: string) {
  try {
    console.log('getAnnotatorProjectTasks called with projectId:', projectId);
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    // If this is a dashboard request, handle it separately
    if (projectId === 'dashboard') {
      return await getAnnotatorTasks();
    }

    // Validate projectId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return { error: 'Invalid project ID format' };
    }

    const tasks = await Task.find({ 
      annotator: new mongoose.Types.ObjectId(annotatorId),
      project: new mongoose.Types.ObjectId(projectId)
    })
    .sort({ updatedAt: -1 })
    .select('_id timeTaken submitted status updatedAt');

    return { data: JSON.stringify(tasks) };
  } catch (error) {
    console.error('Error in getAnnotatorProjectTasks:', error);
    return { error: 'Error occurred while fetching project tasks' };
  }
}

export async function getAnnotatorTask(taskId: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return { error: 'Invalid task ID format' };
    }

    const task = await Task.findOne({ 
      _id: new mongoose.Types.ObjectId(taskId),
      annotator: new mongoose.Types.ObjectId(annotatorId)
    });

    if (!task) {
      return { error: 'Task not found or unauthorized' };
    }

    return { data: JSON.stringify(task) };
  } catch (error) {
    console.error('Error in getAnnotatorTask:', error);
    return { error: 'Error occurred while fetching task' };
  }
}

export async function getAnnotatorCompletedTasks() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    const tasks = await Task.find({ 
      annotator: new mongoose.Types.ObjectId(annotatorId),
      submitted: true
    })
    .sort({ updatedAt: -1 })
    .select('_id timeTaken submitted status updatedAt');

    return { data: JSON.stringify(tasks) };
  } catch (error) {
    console.error('Error in getAnnotatorCompletedTasks:', error);
    return { error: 'Error occurred while fetching completed tasks' };
  }
}

export async function getAnnotatorPendingTasks() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    const tasks = await Task.find({ 
      annotator: new mongoose.Types.ObjectId(annotatorId),
      submitted: false
    })
    .sort({ updatedAt: -1 })
    .select('_id timeTaken submitted status updatedAt');

    return { data: JSON.stringify(tasks) };
  } catch (error) {
    console.error('Error in getAnnotatorPendingTasks:', error);
    return { error: 'Error occurred while fetching pending tasks' };
  }
}

export async function getAnnotatorReworks() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    const reworks = await Rework.find({
      annotator: new mongoose.Types.ObjectId(annotatorId)
    })
    .populate('task', '_id timeTaken submitted status updatedAt')
    .populate('project', 'name')
    .sort({ created_at: -1 });

    return { data: JSON.stringify(reworks) };
  } catch (error) {
    console.error('Error in getAnnotatorReworks:', error);
    return { error: 'Error occurred while fetching reworks' };
  }
}

export async function updateAnnotatorTask(taskId: string, content: string, time: number) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return { error: 'Invalid task ID format' };
    }

    const task = await Task.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(taskId),
        annotator: new mongoose.Types.ObjectId(annotatorId)
      },
      {
        content: content,
        submitted: true,
        timeTaken: time,
        status: 'submitted',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!task) {
      return { error: 'Task not found or unauthorized' };
    }

    return { data: JSON.stringify(task) };
  } catch (error) {
    console.error('Error in updateAnnotatorTask:', error);
    return { error: 'Error occurred while updating task' };
  }
}

export async function getAnnotatorEarnings() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    // Aggregate pipeline to:
    // 1. Match tasks for this annotator that are accepted
    // 2. Lookup project details to get earnings_per_task
    // 3. Calculate total earnings
    const earnings = await Task.aggregate([
      {
        $match: {
          annotator: new mongoose.Types.ObjectId(annotatorId),
          status: 'accepted',
          submitted: true
        }
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectDetails'
        }
      },
      {
        $unwind: '$projectDetails'
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: { $ifNull: ['$projectDetails.earnings_per_task', 0] }
          },
          totalTasks: { $sum: 1 },
          tasksByProject: {
            $push: {
              projectId: '$projectDetails._id',
              projectName: '$projectDetails.name',
              earnings_per_task: { $ifNull: ['$projectDetails.earnings_per_task', 0] }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalEarnings: { $round: ['$totalEarnings', 2] },
          totalTasks: 1,
          tasksByProject: 1
        }
      }
    ]);

    // If no earnings found, return default values
    if (earnings.length === 0) {
      return {
        data: JSON.stringify({
          totalEarnings: 0,
          totalTasks: 0,
          tasksByProject: []
        })
      };
    }

    return { data: JSON.stringify(earnings[0]) };
  } catch (error) {
    console.error('Error in getAnnotatorEarnings:', error);
    return { error: 'Error occurred while calculating earnings' };
  }
}

