'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import Task from "@/models/Task";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { Project } from "@/models/Project";

// Simple in-memory cache for dashboard stats (5 min expiry)
const dashboardCache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// NEW: Get onboarded experts for a specific project (who have taken test tasks)
export async function getOnboardedExpertsForProject(projectId: string, dateRange?: { start: Date; end: Date }) {
  try {
    console.log('🔄 Server: getOnboardedExpertsForProject called with:', {
      projectId,
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      } : 'No date range'
    });

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
      console.log('⚠️ Server: No team_id found for user');
      return JSON.stringify([]);
    }

    if (!projectId) {
      console.log('⚠️ Server: No projectId provided');
      return JSON.stringify([]);
    }

    // Find experts who have taken test tasks for this project with accepted/reassigned status
    const onboardedExpertIds = await Task.distinct('annotator', {
      project: new mongoose.Types.ObjectId(projectId),
      type: 'test',
      status: { $in: ['accepted', 'reassigned'] }
    });

    console.log('🎯 Server: Found onboarded expert IDs:', {
      count: onboardedExpertIds.length,
      projectId,
      expertIds: onboardedExpertIds.map(id => id.toString())
    });

    if (onboardedExpertIds.length === 0) {
      console.log('⚠️ Server: No onboarded experts found for project');
      return JSON.stringify([]);
    }

    // Get team experts who are also onboarded for this project
    const teamExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id,
      _id: { $in: onboardedExpertIds }
    }).select('_id name email nda domain lang location created_at lastLogin');

    console.log('👥 Server: Found onboarded team experts:', {
      count: teamExperts.length,
      teamId: currentUser.team_id.toString()
    });

    if (teamExperts.length === 0) {
      console.log('⚠️ Server: No team experts found who are onboarded for this project');
      return JSON.stringify([]);
    }

    // Build task match conditions for stats
    const matchConditions: any = {
      annotator: { $in: teamExperts.map(expert => expert._id) },
      project: new mongoose.Types.ObjectId(projectId),
      submitted: true
    };

    // Add date range filter if provided
    if (dateRange) {
      matchConditions.updatedAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    console.log('🔍 Server: Task match conditions for project-specific stats:', {
      annotatorCount: teamExperts.length,
      projectId,
      hasDateFilter: !!dateRange
    });

    // Get task statistics for onboarded experts on this project
    const allTaskStats = await Task.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: "$annotator",
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

    console.log('📊 Server: Project-specific task aggregation results:', {
      statsCount: allTaskStats.length,
      totalTasksAcrossAllExperts: allTaskStats.reduce((sum, stat) => sum + stat.totalTasks, 0)
    });

    // Create a lookup map for quick access
    const statsMap = new Map();
    allTaskStats.forEach(stat => {
      const successRate = stat.totalTasks > 0 
        ? ((stat.acceptedTasks / stat.totalTasks) * 100)
        : 0;

      statsMap.set(stat._id.toString(), {
        totalTasks: stat.totalTasks,
        totalTimeSpent: stat.totalTimeSpent,
        avgTimePerTask: Math.round(stat.avgTimePerTask || 0),
        acceptedTasks: stat.acceptedTasks,
        rejectedTasks: stat.rejectedTasks,
        successRate: Math.round(successRate * 10) / 10
      });
    });

    // Combine expert data with stats
    const expertsWithStats = teamExperts.map(expert => {
      const stats = statsMap.get(expert._id.toString()) || {
        totalTasks: 0,
        totalTimeSpent: 0,
        avgTimePerTask: 0,
        acceptedTasks: 0,
        rejectedTasks: 0,
        successRate: 0
      };

      return {
        ...expert.toObject(),
        stats
      };
    });

    console.log('✅ Server: Project-specific expert stats compilation complete:', {
      expertsWithStats: expertsWithStats.length,
      expertsWithTasks: expertsWithStats.filter(e => e.stats.totalTasks > 0).length,
      totalTasksAll: expertsWithStats.reduce((sum, e) => sum + e.stats.totalTasks, 0)
    });

    return JSON.stringify(expertsWithStats);
  } catch (error) {
    console.error('❌ Server: Error getting onboarded experts for project:', error);
    throw error;
  }
}

// Updated dashboard stats to be project-specific
export async function getDashboardStatsForProject(projectId: string, dateRange?: { start: Date; end: Date }) {
  try {
    console.log('🔄 Server: getDashboardStatsForProject called with:', {
      projectId,
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      } : 'No date range provided'
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    // Create cache key
    const cacheKey = `dashboard-project-${session.user.email}-${projectId}-${dateRange?.start?.getTime() || 'all'}-${dateRange?.end?.getTime() || 'all'}`;
    
    // Check cache first
    const cached = dashboardCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log('⚡ Server: Project dashboard stats served from cache');
      return cached.data;
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    if (!currentUser.team_id || !projectId) {
      console.log('⚠️ Server: No team_id or projectId for dashboard stats');
      const emptyStats = JSON.stringify({
        totalExperts: 0,
        activeExperts: 0,
        totalTasks: 0,
        avgCompletionTime: 0,
        successRate: 0
      });
      return emptyStats;
    }

    // Get onboarded experts for this project
    const onboardedExpertIds = await Task.distinct('annotator', {
      project: new mongoose.Types.ObjectId(projectId),
      type: 'test',
      status: { $in: ['accepted', 'reassigned'] }
    });

    const teamOnboardedExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id,
      _id: { $in: onboardedExpertIds }
    }).select('_id isReadyToWork');

    const totalExperts = teamOnboardedExperts.length;
    const activeExperts = teamOnboardedExperts.filter(expert => expert.isReadyToWork).length;

    console.log('👥 Server: Project team expert counts:', {
      total: totalExperts,
      active: activeExperts,
      teamId: currentUser.team_id.toString(),
      projectId
    });

    // Build task match conditions for project-specific stats
    const taskMatchConditions: any = {
      annotator: { $in: teamOnboardedExperts.map(expert => expert._id) },
      project: new mongoose.Types.ObjectId(projectId),
      submitted: true
    };

    if (dateRange) {
      taskMatchConditions.updatedAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    // Get task statistics with single aggregation
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

    console.log('📊 Server: Project-specific task statistics:', {
      totalTasks: stats.totalTasks,
      avgCompletionTime: stats.avgCompletionTime,
      acceptedTasks: stats.acceptedTasks,
      successRate,
      projectId
    });

    const result = JSON.stringify({
      totalExperts,
      activeExperts,
      totalTasks: stats.totalTasks,
      avgCompletionTime: Math.round(stats.avgCompletionTime || 0),
      successRate: parseFloat(successRate)
    });

    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
      expiry: Date.now() + CACHE_DURATION
    });

    console.log('✅ Server: Project dashboard stats compiled and cached');

    return result;
  } catch (error) {
    console.error('❌ Server: Error getting project dashboard stats:', error);
    throw error;
  }
}

// Updated tasks over time to be project-specific
export async function getTasksOverTimeDataForProject(
  projectId: string,
  dateRange: { start: Date; end: Date },
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  taskType?: 'test' | 'training' | 'core',
  expertId?: string
) {
  try {
    console.log('🔄 Server: getTasksOverTimeDataForProject called with filters:', {
      projectId,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      granularity,
      taskType: taskType || 'undefined (all types)',
      expertId: expertId || 'undefined (all experts)'
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    // Build match conditions for project-specific data
    const matchConditions: any = {
      project: new mongoose.Types.ObjectId(projectId),
      submitted: true,
      updatedAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    // Add task type filter
    if (taskType) {
      matchConditions.type = taskType;
    }

    // Handle expert filter
    if (expertId) {
      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        throw new Error('Invalid expert ID format');
      }
      matchConditions.annotator = new mongoose.Types.ObjectId(expertId);
    } else {
      // Only include onboarded experts for this project
      const onboardedExpertIds = await Task.distinct('annotator', {
        project: new mongoose.Types.ObjectId(projectId),
        type: 'test',
        status: { $in: ['accepted', 'reassigned'] }
      });
      
      const teamOnboardedExperts = await User.find({
        role: 'annotator',
        team_id: currentUser.team_id,
        _id: { $in: onboardedExpertIds }
      }).select('_id');
      
      matchConditions.annotator = {
        $in: teamOnboardedExperts.map(expert => expert._id)
      };
    }

    // Check if we have any tasks matching conditions
    const taskCount = await Task.countDocuments(matchConditions);
    console.log('📊 Server: Project tasks matching conditions:', { taskCount, projectId });

    if (taskCount === 0) {
      console.log('⚠️ Server: No tasks found matching the criteria for project');
      return JSON.stringify([]);
    }

    // Define date grouping based on granularity
    let dateGrouping: any;
    let sortOrder: any;

    switch (granularity) {
      case 'weekly':
        dateGrouping = {
          year: { $year: "$updatedAt" },
          week: { $week: "$updatedAt" }
        };
        sortOrder = { "_id.year": 1, "_id.week": 1 };
        break;
      case 'monthly':
        dateGrouping = {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" }
        };
        sortOrder = { "_id.year": 1, "_id.month": 1 };
        break;
      default: // daily
        dateGrouping = {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          day: { $dayOfMonth: "$updatedAt" }
        };
        sortOrder = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
    }

    const results = await Task.aggregate([
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
      },
      { $sort: sortOrder }
    ]);

    // Format results
    const formattedResults = results.map(item => {
      let dateLabel: string;
      
      if (granularity === 'weekly') {
        dateLabel = `${item._id.year}-W${item._id.week.toString().padStart(2, '0')}`;
      } else if (granularity === 'monthly') {
        dateLabel = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      } else {
        dateLabel = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      }

      const successRate = item.taskCount > 0 ? ((item.acceptedTasks / item.taskCount) * 100).toFixed(1) : '0';

      return {
        date: dateLabel,
        taskCount: item.taskCount,
        totalTime: Math.round(item.totalTime || 0),
        avgTime: Math.round(item.avgTime || 0),
        successRate
      };
    });

    console.log('✅ Server: Project-specific formatted results ready:', {
      dataPoints: formattedResults.length,
      projectId,
      totalTasks: formattedResults.reduce((sum, item) => sum + item.taskCount, 0)
    });

    return JSON.stringify(formattedResults);
  } catch (error) {
    console.error('❌ Server: Error getting project tasks over time data:', error);
    throw error;
  }
}

// EXISTING FUNCTIONS (kept for backward compatibility)

// OPTIMIZED: Get team experts with task statistics (Single aggregation instead of 1000+)
export async function getTeamExpertsWithStats(dateRange?: { start: Date; end: Date }) {
  try {
    console.log('🔄 Server: getTeamExpertsWithStats called with date range:', {
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        daysDiff: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      } : 'No date range provided'
    });

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
      console.log('⚠️ Server: No team_id found for user');
      return JSON.stringify([]);
    }

    // Find all annotators in the same team
    const teamExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id
    }).select('_id name email nda domain lang location created_at lastLogin');

    console.log('👥 Server: Found team experts:', {
      count: teamExperts.length,
      teamId: currentUser.team_id.toString(),
      expertIds: teamExperts.map(e => e._id.toString())
    });

    if (teamExperts.length === 0) {
      console.log('⚠️ Server: No team experts found');
      return JSON.stringify([]);
    }

    // Build task match conditions
    const matchConditions: any = {
      annotator: { $in: teamExperts.map(expert => expert._id) },
      submitted: true
    };

    // Add date range filter if provided
    if (dateRange) {
      matchConditions.updatedAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    console.log('🔍 Server: Task match conditions:', {
      annotatorCount: teamExperts.length,
      hasDateFilter: !!dateRange,
      matchConditions: {
        ...matchConditions,
        annotator: `${teamExperts.length} expert IDs`,
        updatedAt: matchConditions.updatedAt ? {
          gte: matchConditions.updatedAt.$gte.toISOString(),
          lte: matchConditions.updatedAt.$lte.toISOString()
        } : 'No date filter'
      }
    });

    // OPTIMIZED: Single aggregation for ALL experts instead of individual queries
    const allTaskStats = await Task.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: "$annotator", // Group by annotator
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

    console.log('📊 Server: Task aggregation results:', {
      statsCount: allTaskStats.length,
      totalTasksAcrossAllExperts: allTaskStats.reduce((sum, stat) => sum + stat.totalTasks, 0),
      sample: allTaskStats[0] || 'No stats found'
    });

    // Create a lookup map for quick access
    const statsMap = new Map();
    allTaskStats.forEach(stat => {
      const successRate = stat.totalTasks > 0 
        ? ((stat.acceptedTasks / stat.totalTasks) * 100)
        : 0;

      statsMap.set(stat._id.toString(), {
        totalTasks: stat.totalTasks,
        totalTimeSpent: stat.totalTimeSpent,
        avgTimePerTask: Math.round(stat.avgTimePerTask || 0),
        acceptedTasks: stat.acceptedTasks,
        rejectedTasks: stat.rejectedTasks,
        successRate: Math.round(successRate * 10) / 10 // Round to 1 decimal
      });
    });

    // Combine expert data with stats
    const expertsWithStats = teamExperts.map(expert => {
      const stats = statsMap.get(expert._id.toString()) || {
        totalTasks: 0,
        totalTimeSpent: 0,
        avgTimePerTask: 0,
        acceptedTasks: 0,
        rejectedTasks: 0,
        successRate: 0
      };

      return {
        ...expert.toObject(),
        stats
      };
    });

    console.log('✅ Server: Expert stats compilation complete:', {
      expertsWithStats: expertsWithStats.length,
      expertsWithTasks: expertsWithStats.filter(e => e.stats.totalTasks > 0).length,
      totalTasksAll: expertsWithStats.reduce((sum, e) => sum + e.stats.totalTasks, 0)
    });

    return JSON.stringify(expertsWithStats);
  } catch (error) {
    console.error('❌ Server: Error getting team experts with stats:', error);
    throw error;
  }
}

// FIXED & OPTIMIZED: Get tasks over time data with comprehensive debugging
export async function getTasksOverTimeData(
  dateRange: { start: Date; end: Date },
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  taskType?: 'test' | 'training' | 'core',
  expertId?: string
) {
  try {
    console.log('🔄 Server: getTasksOverTimeData called with filters:', {
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        daysDiff: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      },
      granularity,
      taskType: taskType || 'undefined (all types)',
      expertId: expertId || 'undefined (all experts)'
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    console.log('👤 Server: Current user verified:', {
      userId: currentUser._id.toString(),
      role: currentUser.role,
      teamId: currentUser.team_id?.toString() || 'No team'
    });

    // DEBUGGING: Check available task types in the database
    const availableTaskTypes = await Task.distinct('type');
    console.log('🏷️ Server: Available task types in database:', availableTaskTypes);

    // Build match conditions
    const matchConditions: any = {
      project_Manager: currentUser._id,
      submitted: true,
      updatedAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    };

    // FIXED: Add task type filter with proper validation
    if (taskType) {
      if (!availableTaskTypes.includes(taskType)) {
        console.warn('⚠️ Server: Requested task type not found in database:', {
          requested: taskType,
          available: availableTaskTypes
        });
      }
      matchConditions.type = taskType;
    }

    // Handle expert filter
    if (expertId) {
      console.log('🎯 Server: Filtering by specific expert:', expertId);
      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        console.error('❌ Server: Invalid expert ID format:', expertId);
        throw new Error('Invalid expert ID format');
      }
      matchConditions.annotator = new mongoose.Types.ObjectId(expertId);
    } else {
      console.log('👥 Server: Including all team experts');
      // Only include team experts - get IDs efficiently
      const teamExpertIds = await User.find({
        role: 'annotator',
        team_id: currentUser.team_id
      }).select('_id');
      
      console.log('🔍 Server: Team expert IDs for filter:', {
        count: teamExpertIds.length,
        ids: teamExpertIds.map(e => e._id.toString())
      });
      
      matchConditions.annotator = {
        $in: teamExpertIds.map(expert => expert._id)
      };
    }

    console.log('🔍 Server: Final match conditions for tasks:', {
      ...matchConditions,
      annotator: typeof matchConditions.annotator === 'object' && matchConditions.annotator.$in 
        ? `Array of ${matchConditions.annotator.$in.length} expert IDs`
        : matchConditions.annotator?.toString() || 'Single expert ID',
      updatedAt: {
        gte: matchConditions.updatedAt.$gte.toISOString(),
        lte: matchConditions.updatedAt.$lte.toISOString()
      }
    });

    // DEBUGGING: Check how many tasks match our conditions before aggregation
    const taskCount = await Task.countDocuments(matchConditions);
    console.log('📊 Server: Tasks matching conditions:', taskCount);

    if (taskCount === 0) {
      console.log('⚠️ Server: No tasks found matching the criteria');
      return JSON.stringify([]);
    }

    // Define date grouping based on granularity
    let dateGrouping: any;
    let sortOrder: any;

    switch (granularity) {
      case 'weekly':
        dateGrouping = {
          year: { $year: "$updatedAt" },
          week: { $week: "$updatedAt" }
        };
        sortOrder = { "_id.year": 1, "_id.week": 1 };
        break;
      case 'monthly':
        dateGrouping = {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" }
        };
        sortOrder = { "_id.year": 1, "_id.month": 1 };
        break;
      default: // daily
        dateGrouping = {
          year: { $year: "$updatedAt" },
          month: { $month: "$updatedAt" },
          day: { $dayOfMonth: "$updatedAt" }
        };
        sortOrder = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
    }

    console.log('📅 Server: Date grouping strategy:', {
      granularity,
      dateGrouping,
      sortOrder
    });

    const results = await Task.aggregate([
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
      },
      { $sort: sortOrder }
    ]);

    console.log('📊 Server: Aggregation results:', {
      dataPoints: results.length,
      totalTasks: results.reduce((sum, item) => sum + item.taskCount, 0),
      totalTime: results.reduce((sum, item) => sum + (item.totalTime || 0), 0),
      dateRange: results.length > 0 ? {
        first: results[0]._id,
        last: results[results.length - 1]._id
      } : 'No results'
    });

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

      const successRate = item.taskCount > 0 ? ((item.acceptedTasks / item.taskCount) * 100).toFixed(1) : '0';

      return {
        date: dateLabel,
        taskCount: item.taskCount,
        totalTime: Math.round(item.totalTime || 0),
        avgTime: Math.round(item.avgTime || 0),
        successRate
      };
    });

    console.log('✅ Server: Formatted results ready:', {
      dataPoints: formattedResults.length,
      sample: formattedResults[0] || 'No data',
      totalTasksFormatted: formattedResults.reduce((sum, item) => sum + item.taskCount, 0)
    });

    return JSON.stringify(formattedResults);
  } catch (error) {
    console.error('❌ Server: Error getting tasks over time data:', error);
    throw error;
  }
}

// FAST: Get NDA status (lightweight query)
export async function getNDAStatus() {
  try {
    console.log('🔄 Server: getNDAStatus called');
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
      console.log('⚠️ Server: No team_id for NDA status');
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

    console.log('✅ Server: NDA status compiled:', {
      total: teamExperts.length,
      uploaded: uploaded.length,
      notUploaded: notUploaded.length
    });

    return JSON.stringify({ uploaded, notUploaded });
  } catch (error) {
    console.error('❌ Server: Error getting NDA status:', error);
    throw error;
  }
}

// CACHED: Get dashboard summary stats with 5-minute cache
export async function getDashboardStats(dateRange?: { start: Date; end: Date }) {
  try {
    console.log('🔄 Server: getDashboardStats called with date range:', {
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        daysDiff: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      } : 'No date range provided'
    });

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    // Create cache key
    const cacheKey = `dashboard-${session.user.email}-${dateRange?.start?.getTime() || 'all'}-${dateRange?.end?.getTime() || 'all'}`;
    
    // Check cache first
    const cached = dashboardCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log('⚡ Server: Dashboard stats served from cache');
      return cached.data;
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || currentUser.role !== 'project manager') {
      throw new Error('Access denied');
    }

    if (!currentUser.team_id) {
      console.log('⚠️ Server: No team_id for dashboard stats');
      const emptyStats = JSON.stringify({
        totalExperts: 0,
        activeExperts: 0,
        totalTasks: 0,
        avgCompletionTime: 0,
        successRate: 0
      });
      return emptyStats;
    }

    // Get team experts efficiently
    const teamExperts = await User.find({
      role: 'annotator',
      team_id: currentUser.team_id
    }).select('_id isReadyToWork');

    const totalExperts = teamExperts.length;
    const activeExperts = teamExperts.filter(expert => expert.isReadyToWork).length;

    console.log('👥 Server: Team expert counts:', {
      total: totalExperts,
      active: activeExperts,
      teamId: currentUser.team_id.toString()
    });

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

    console.log('🔍 Server: Task match conditions for stats:', {
      ...taskMatchConditions,
      annotator: `${teamExperts.length} expert IDs`,
      updatedAt: taskMatchConditions.updatedAt ? {
        gte: taskMatchConditions.updatedAt.$gte.toISOString(),
        lte: taskMatchConditions.updatedAt.$lte.toISOString()
      } : 'No date filter'
    });

    // Get task statistics with single aggregation
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

    console.log('📊 Server: Task statistics:', {
      totalTasks: stats.totalTasks,
      avgCompletionTime: stats.avgCompletionTime,
      acceptedTasks: stats.acceptedTasks,
      successRate
    });

    const result = JSON.stringify({
      totalExperts,
      activeExperts,
      totalTasks: stats.totalTasks,
      avgCompletionTime: Math.round(stats.avgCompletionTime || 0),
      successRate: parseFloat(successRate)
    });

    // Cache the result
    dashboardCache.set(cacheKey, {
      data: result,
      expiry: Date.now() + CACHE_DURATION
    });

    console.log('✅ Server: Dashboard stats compiled and cached');

    // Clean up old cache entries (simple cleanup)
    if (dashboardCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of dashboardCache.entries()) {
        if (value.expiry < now) {
          dashboardCache.delete(key);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Server: Error getting dashboard stats:', error);
    throw error;
  }
}

// Helper function to clear cache (useful for testing or manual refresh)
export async function clearDashboardCache() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    const keyPattern = `dashboard-${session.user.email}`;
    for (const [key] of dashboardCache.entries()) {
      if (key.startsWith(keyPattern)) {
        dashboardCache.delete(key);
      }
    }

    console.log('🗑️ Server: Cache cleared for user:', session.user.email);
    return JSON.stringify({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('❌ Server: Error clearing cache:', error);
    throw error;
  }
}

export async function getProjectDetails(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    
    const project = await Project.findById(projectId).select('name');
    
    if (!project) {
      throw new Error('Project not found');
    }

    return JSON.stringify({ name: project.name });
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw error;
  }
}