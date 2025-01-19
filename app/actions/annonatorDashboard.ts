'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { 
  getAnnotatorTasks, 
  getAnnotatorReworks,
  getAnnotatorCompletedTasks,
} from './annotatorTask';

// Define response type for server actions
interface ServerResponse {
  error?: string;
  data?: string;
}

interface TaskData {
  _id: string;
  timeTaken: number;
  submitted: boolean;
  status: string;
  updatedAt: string;
}

interface TaskStats {
  [key: string]: number;
}

interface DailyStats {
  [date: string]: {
    completedTasks: number;
    totalTasks: number;
    totalTime: number;
  }
}

interface FormattedDailyStats {
  _id: string;
  completedTasks: number;
  totalTasks: number;
  averageTime: number;
}

interface DashboardResult {
  tasksData: {
    totalAssignedTasks: number;
    averageTime: number;
    submittedTasks: number;
    pendingTasks: number;
    completionRate: number;
    taskStatuses: string[];
    accuracyRate: number;
  };
  personalStats: {
    accuracyRate: number;
    weeklyProgress: number;
    monthlyProgress: number;
  };
}

export async function getAnnotatorDashboard(): Promise<ServerResponse> {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    // Get all tasks data
    const tasksRes = await getAnnotatorTasks();
    let tasks: TaskData[] = [];
    
    if (tasksRes && 'data' in tasksRes && tasksRes.data) {
      tasks = JSON.parse(tasksRes.data);
    }

    // Calculate basic stats from tasks
    const result = {
      totalAssignedTasks: tasks.length,
      averageTime: tasks.length > 0 ? 
        tasks.reduce((acc: number, task: TaskData) => acc + (task.timeTaken || 0), 0) / tasks.length : 0,
      submittedTasks: tasks.filter((task: TaskData) => task.submitted).length,
      pendingTasks: tasks.filter((task: TaskData) => !task.submitted).length,
      taskStatuses: tasks.map((task: TaskData) => task.status)
    };

    // Get rework count for accuracy calculation
    const reworksRes = await getAnnotatorReworks();
    let totalReworks = 0;
    
    if (reworksRes && 'data' in reworksRes && reworksRes.data) {
      const reworks = JSON.parse(reworksRes.data);
      totalReworks = reworks.length;
    }

    // Calculate completion and accuracy rates
    const completionRate = result.totalAssignedTasks > 0 ? 
      (result.submittedTasks / result.totalAssignedTasks) * 100 : 0;

    const accuracyRate = result.submittedTasks > 0 ? 
      ((result.submittedTasks - totalReworks) / result.submittedTasks) * 100 : 0;

    // Calculate weekly and monthly progress
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const weeklyTasks = tasks.filter(task => new Date(task.updatedAt) >= oneWeekAgo);
    const monthlyTasks = tasks.filter(task => new Date(task.updatedAt) >= oneMonthAgo);

    const weeklyProgress = weeklyTasks.length > 0 ?
      (weeklyTasks.filter(task => task.submitted).length / weeklyTasks.length) * 100 : 0;
    
    const monthlyProgress = monthlyTasks.length > 0 ?
      (monthlyTasks.filter(task => task.submitted).length / monthlyTasks.length) * 100 : 0;

    const dashboardData: DashboardResult = {
      tasksData: {
        totalAssignedTasks: result.totalAssignedTasks,
        averageTime: Math.round(result.averageTime * 100) / 100,
        submittedTasks: result.submittedTasks,
        pendingTasks: result.pendingTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        taskStatuses: result.taskStatuses,
        accuracyRate: Math.round(accuracyRate * 100) / 100
      },
      personalStats: {
        accuracyRate: Math.round(accuracyRate * 100) / 100,
        weeklyProgress: Math.round(weeklyProgress * 100) / 100,
        monthlyProgress: Math.round(monthlyProgress * 100) / 100
      }
    };

    return { data: JSON.stringify(dashboardData) };

  } catch (error) {
    console.error('Error fetching annotator dashboard data:', error);
    return { error: 'Error occurred while fetching dashboard data' };
  }
}

export async function getAnnotatorTaskStats(): Promise<ServerResponse> {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    const tasksRes = await getAnnotatorTasks();
    if (tasksRes && 'data' in tasksRes && tasksRes.data) {
      const tasks: TaskData[] = JSON.parse(tasksRes.data);
      const taskStats = tasks.reduce((acc: TaskStats, task: TaskData) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      const formattedStats = Object.entries(taskStats).map(([status, count]) => ({
        _id: status,
        count
      }));

      return { data: JSON.stringify(formattedStats) };
    }

    return { error: 'Failed to fetch task statistics' };
  } catch (error) {
    console.error('Error fetching annotator task stats:', error);
    return { error: 'Error occurred while fetching task statistics' };
  }
}

export async function getAnnotatorTimeStats(): Promise<ServerResponse> {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    const completedTasksRes = await getAnnotatorCompletedTasks();
    if (completedTasksRes && 'data' in completedTasksRes && completedTasksRes.data) {
      const tasks: TaskData[] = JSON.parse(completedTasksRes.data);
      const timeStats = {
        averageTime: tasks.length > 0 ? 
          tasks.reduce((acc: number, task: TaskData) => acc + (task.timeTaken || 0), 0) / tasks.length : 0,
        totalTime: tasks.reduce((acc: number, task: TaskData) => acc + (task.timeTaken || 0), 0),
        taskCount: tasks.length
      };

      return { data: JSON.stringify(timeStats) };
    }

    return { error: 'Failed to fetch time statistics' };
  } catch (error) {
    console.error('Error fetching annotator time stats:', error);
    return { error: 'Error occurred while fetching time statistics' };
  }
}

export async function getAnnotatorPerformanceTrends(): Promise<ServerResponse> {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const annotatorId = session?.user?.id;

    if (!annotatorId) {
      return { error: 'User is not authenticated' };
    }

    const tasksRes = await getAnnotatorTasks();
    if (tasksRes && 'data' in tasksRes && tasksRes.data) {
      const tasks: TaskData[] = JSON.parse(tasksRes.data);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Group tasks by date
      const dailyStats = tasks
        .filter(task => new Date(task.updatedAt) >= thirtyDaysAgo)
        .reduce((acc: DailyStats, task: TaskData) => {
          const date = new Date(task.updatedAt).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              completedTasks: 0,
              totalTasks: 0,
              totalTime: 0
            };
          }
          acc[date].totalTasks++;
          if (task.submitted) {
            acc[date].completedTasks++;
          }
          acc[date].totalTime += task.timeTaken || 0;
          return acc;
        }, {});

      const formattedStats: FormattedDailyStats[] = Object.entries(dailyStats)
        .map(([date, stats]) => ({
          _id: date,
          completedTasks: stats.completedTasks,
          totalTasks: stats.totalTasks,
          averageTime: stats.totalTime / stats.totalTasks
        }))
        .sort((a, b) => a._id.localeCompare(b._id));

      return { data: JSON.stringify(formattedStats) };
    }

    return { error: 'Failed to fetch performance trends' };
  } catch (error) {
    console.error('Error fetching annotator performance trends:', error);
    return { error: 'Error occurred while fetching performance trends' };
  }
}