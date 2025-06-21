'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import Task from "@/models/Task";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

// Get team experts with task statistics
export async function getTeamExpertsWithStats(dateRange?: { start: Date; end: Date }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      throw new Error('User not found');
    }

    if (currentUser.role !== 'project manager') {
      throw new Error('Access denied. Only project managers can view this dashboard.');
    }

    if (!currentUser.team_id) {
      return JSON.stringify([]);
    }

    // Find all annotators in the same team
    const teamExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id
    }).select('_id name email nda domain lang location created_at lastLogin');

    // Get task statistics for each expert
    const expertsWithStats = await Promise.all(
      teamExperts.map(async (expert) => {
        const matchConditions: any = {
          annotator: expert._id,
          submitted: true
        };

        // Add date range filter if provided
        if (dateRange) {
          matchConditions.updatedAt = {
            $gte: dateRange.start,
            $lte: dateRange.end
          };
        }

        const taskStats = await Task.aggregate([
          { $match: matchConditions },
          {
            $group: {
              _id: null,
              totalTasks: { $sum: 1 },
              totalTimeSpent: { $sum: "$timeTaken" },
              avgTimePerTask: { $avg: "$timeTaken" },
              acceptedTasks: {
                $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] }
              },
              rejectedTasks: {
                $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
              }
            }
          }
        ]);

        const stats = taskStats[0] || {
          totalTasks: 0,
          totalTimeSpent: 0,
          avgTimePerTask: 0,
          acceptedTasks: 0,
          rejectedTasks: 0
        };

        const successRate = stats.totalTasks > 0 
          ? ((stats.acceptedTasks / stats.totalTasks) * 100).toFixed(1)
          : '0';

        return {
          ...expert.toObject(),
          stats: {
            ...stats,
            successRate: parseFloat(successRate)
          }
        };
      })
    );

    return JSON.stringify(expertsWithStats);
  } catch (error) {
    console.error('Error getting team experts with stats:', error);
    throw error;
  }
}

// Get tasks over time data for charts
export async function getTasksOverTimeData(
  dateRange: { start: Date; end: Date },
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  taskType?: 'test' | 'training' | 'core',
  expertId?: string
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    // Build match conditions
    const matchConditions: any = {
      project_Manager: currentUser._id,
      submitted: true,
      updatedAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    if (taskType) {
      matchConditions.type = taskType;
    }

    if (expertId) {
      matchConditions.annotator = new mongoose.Types.ObjectId(expertId);
    } else {
      // Only include team experts
      const teamExperts = await User.find({
        role: 'annotator',
        team_id: currentUser.team_id
      }).select('_id');
      
      matchConditions.annotator = {
        $in: teamExperts.map(expert => expert._id)
      };
    }

    // Define date grouping based on granularity
    let dateGrouping: any;
    let dateFormat: string;

    switch (granularity) {
      case 'weekly':
        dateGrouping = {
          year: { $year: "$updatedAt" },
          week: { $week: "$updatedAt" }
        };
        dateFormat = 'week';
        break;
      case 'monthly':
        dateGrouping = {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" }
        };
        dateFormat = 'month';
        break;
      default: // daily
        dateGrouping = {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          day: { $dayOfMonth: "$updatedAt" }
        };
        dateFormat = 'daily';
    }

    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $group: {
          _id: dateGrouping,
          taskCount: { $sum: 1 },
          totalTime: { $sum: "$timeTaken" },
          avgTime: { $avg: "$timeTaken" },
          acceptedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] }
          }
        }
      }
    ];

    // Add appropriate sort based on granularity
    if (granularity === 'weekly') {
      pipeline.push({ $sort: { "_id.year": 1 as const, "_id.week": 1 as const } });
    } else if (granularity === 'monthly') {
      pipeline.push({ $sort: { "_id.year": 1 as const, "_id.month": 1 as const } });
    } else {
      pipeline.push({ $sort: { "_id.year": 1 as const, "_id.month": 1 as const, "_id.day": 1 as const } });
    }

    const results = await Task.aggregate(pipeline);

    // Format results for chart consumption
    const formattedResults = results.map(item => {
      let dateLabel: string;
      
      if (granularity === 'weekly') {
        dateLabel = `${item._id.year}-W${item._id.week.toString().padStart(2, '0')}`;
      } else if (granularity === 'monthly') {
        dateLabel = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      } else {
        dateLabel = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      }

      return {
        date: dateLabel,
        taskCount: item.taskCount,
        totalTime: Math.round(item.totalTime),
        avgTime: Math.round(item.avgTime || 0),
        successRate: item.taskCount > 0 ? ((item.acceptedTasks / item.taskCount) * 100).toFixed(1) : '0'
      };
    });

    return JSON.stringify(formattedResults);
  } catch (error) {
    console.error('Error getting tasks over time data:', error);
    throw error;
  }
}

// Get NDA status for all team experts
export async function getNDAStatus() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    if (!currentUser.team_id) {
      return JSON.stringify({ uploaded: [], notUploaded: [] });
    }

    const teamExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id
    }).select('_id name email nda');

    const uploaded = teamExperts.filter(expert => expert.nda).map(expert => ({
      _id: expert._id,
      name: expert.name,
      email: expert.email,
      ndaUrl: expert.nda
    }));

    const notUploaded = teamExperts.filter(expert => !expert.nda).map(expert => ({
      _id: expert._id,
      name: expert.name,
      email: expert.email
    }));

    return JSON.stringify({ uploaded, notUploaded });
  } catch (error) {
    console.error('Error getting NDA status:', error);
    throw error;
  }
}

// Get dashboard summary stats
export async function getDashboardStats(dateRange?: { start: Date; end: Date }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    if (!currentUser.team_id) {
      return JSON.stringify({
        totalExperts: 0,
        activeExperts: 0,
        totalTasks: 0,
        avgCompletionTime: 0,
        successRate: 0
      });
    }

    // Get team experts
    const teamExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id
    }).select('_id isReadyToWork');

    const totalExperts = teamExperts.length;
    const activeExperts = teamExperts.filter(expert => expert.isReadyToWork).length;

    // Build task match conditions
    const taskMatchConditions: any = {
      annotator: { $in: teamExperts.map(expert => expert._id) },
      submitted: true
    };

    if (dateRange) {
      taskMatchConditions.updatedAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    // Get task statistics
    const taskStats = await Task.aggregate([
      { $match: taskMatchConditions },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          avgCompletionTime: { $avg: "$timeTaken" },
          acceptedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = taskStats[0] || {
      totalTasks: 0,
      avgCompletionTime: 0,
      acceptedTasks: 0
    };

    const successRate = stats.totalTasks > 0 
      ? ((stats.acceptedTasks / stats.totalTasks) * 100).toFixed(1)
      : '0';

    return JSON.stringify({
      totalExperts,
      activeExperts,
      totalTasks: stats.totalTasks,
      avgCompletionTime: Math.round(stats.avgCompletionTime || 0),
      successRate: parseFloat(successRate)
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}