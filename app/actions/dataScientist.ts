'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import Task from "@/models/Task";
import { Template } from "@/models/Template";
import { getServerSession } from "next-auth";
import mongoose, { Document } from "mongoose";
import AnnotatorHistory from "@/models/points";

// Type definitions
type ObjectId = mongoose.Types.ObjectId;

interface TeamMember extends Document {
  _id: ObjectId;
  name: string;
  email: string;
  role: string;
}

interface AnnotatorPerformance {
  annotatorId: string;
  name: string;
  email: string;
  tasksCompleted: number;
  avgTimePerTask: number;
  acceptanceRate: number;
  totalPoints: number;
}

interface TaskAnalytics {
  templateId: string;
  templateName: string;
  totalTasks: number;
  completedTasks: number;
  averageTime: number;
  acceptedTasks: number;
  rejectedTasks: number;
}

interface DailyActivity {
  date: string;
  taskCount: number;
  uniqueAnnotators: number;
  averageTime: number;
}

interface TaskDocument extends Document {
  _id: ObjectId;
  annotator?: ObjectId;
  reviewer?: ObjectId;
  template?: ObjectId;
  project?: ObjectId;
  submitted: boolean;
  status: string;
  timeTaken: number;
  content: string;
  updated_at: Date;
  created_at: Date;
}

interface TemplateDocument extends Document {
  _id: ObjectId;
  name: string;
  project: ObjectId;
}

interface AnnotatorHistoryDocument extends Document {
  _id: ObjectId;
  annotator: ObjectId | TeamMember;
  project: ObjectId;
  totalPoints: number;
  history: Array<{
    task: ObjectId;
    template: ObjectId;
    pointsEarned: number;
    submittedAnswer: string;
    groundTruthAnswer: string;
    comparisonResult: boolean;
  }>;
}

// Get all team members for the data scientist
export async function getTeamMembers() {
  try {
    // Get the current user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    // Find the current user to get their team_id
    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      throw new Error('User not found');
    }

    if (!currentUser.team_id) {
      // If user doesn't have a team, return empty array
      return JSON.stringify([]);
    }

    // Find all team members (not just annotators)
    const teamMembers = await User.find({
      team_id: currentUser.team_id
    }).select('-password').lean<TeamMember[]>();

    return JSON.stringify(teamMembers);
  } catch (error) {
    console.error('Error getting team members:', error);
    throw error;
  }
}

// Get team projects data
export async function getTeamProjects() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || !currentUser.team_id) {
      return JSON.stringify([]);
    }

    // Get all team members
    const teamMembers = await User.find({
      team_id: currentUser.team_id
    }).select('_id').lean<{ _id: ObjectId }[]>();
    
    const teamMemberIds = teamMembers.map(member => member._id);

    // Find projects where project manager is in the team
    const projects = await Project.find({
      project_Manager: { $in: teamMemberIds }
    }).populate('project_Manager', 'name email')
      .lean();

    return JSON.stringify(projects);
  } catch (error) {
    console.error('Error getting team projects:', error);
    throw error;
  }
}

// Get all task data for a specific project
export async function getProjectTaskData(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error('Invalid project ID');
    }

    await connectToDatabase();
    
    // Get all tasks for the project
    const tasks = await Task.find({ project: projectId })
      .populate('annotator', 'name email')
      .populate('reviewer', 'name email')
      .populate('template', 'name')
      .lean<TaskDocument[]>();

    return JSON.stringify(tasks);
  } catch (error) {
    console.error('Error getting project task data:', error);
    throw error;
  }
}

// Get team-wide annotation metrics and statistics
export async function getTeamAnnotationMetrics() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || !currentUser.team_id) {
      return JSON.stringify({
        error: 'User does not belong to a team'
      });
    }

    // Get all team members who are annotators
    const teamAnnotators = await User.find({
      team_id: currentUser.team_id,
      role: 'annotator'
    }).select('_id name email').lean<TeamMember[]>();
    
    const annotatorIds = teamAnnotators.map(annotator => annotator._id);

    // Get performance metrics for each annotator
    const annotatorPerformance: AnnotatorPerformance[] = [];

    for (const annotator of teamAnnotators) {
      // Get tasks completed by this annotator
      const tasks = await Task.find({ 
        annotator: annotator._id,
        submitted: true
      }).lean<TaskDocument[]>();
      
      const totalTasks = tasks.length;
      
      if (totalTasks === 0) {
        // Skip annotators with no tasks
        continue;
      }
      
      const acceptedTasks = tasks.filter(task => task.status === 'accepted').length;
      const totalTimeSpent = tasks.reduce((sum, task) => sum + (task.timeTaken || 0), 0);

      // Get points data if available
      const pointsData = await AnnotatorHistory.findOne({
        annotator: annotator._id
      }).lean<AnnotatorHistoryDocument | null>();
      
      annotatorPerformance.push({
        annotatorId: annotator._id.toString(),
        name: annotator.name,
        email: annotator.email,
        tasksCompleted: totalTasks,
        avgTimePerTask: totalTimeSpent / totalTasks,
        acceptanceRate: (acceptedTasks / totalTasks) * 100,
        totalPoints: pointsData?.totalPoints || 0
      });
    }

    return JSON.stringify({
      annotatorCount: teamAnnotators.length,
      activeAnnotators: annotatorPerformance.length,
      annotatorPerformance
    });
  } catch (error) {
    console.error('Error getting team annotation metrics:', error);
    throw error;
  }
}

// Get template analytics
export async function getTemplateAnalytics() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || !currentUser.team_id) {
      return JSON.stringify({
        error: 'User does not belong to a team'
      });
    }

    // Get all team members
    const teamMembers = await User.find({
      team_id: currentUser.team_id
    }).select('_id').lean<{ _id: ObjectId }[]>();
    
    const teamMemberIds = teamMembers.map(member => member._id);

    // Find projects where project manager is in the team
    const projects = await Project.find({
      project_Manager: { $in: teamMemberIds }
    }).select('_id').lean<{ _id: ObjectId }[]>();
    
    const projectIds = projects.map(project => project._id);

    // Get all templates for these projects
    const templates = await Template.find({
      project: { $in: projectIds }
    }).lean<TemplateDocument[]>();

    const templateAnalytics: TaskAnalytics[] = [];

    for (const template of templates) {
      // Get tasks for this template
      const tasks = await Task.find({ template: template._id }).lean<TaskDocument[]>();
      
      const totalTasks = tasks.length;
      
      if (totalTasks === 0) {
        // Skip templates with no tasks
        continue;
      }
      
      const completedTasks = tasks.filter(task => task.submitted).length;
      const acceptedTasks = tasks.filter(task => task.status === 'accepted').length;
      const rejectedTasks = tasks.filter(task => task.status === 'rejected').length;
      
      // Calculate average time for completed tasks
      const completedTasksList = tasks.filter(task => task.submitted && task.timeTaken);
      const totalTimeSpent = completedTasksList.reduce((sum, task) => sum + (task.timeTaken || 0), 0);
      const averageTime = completedTasksList.length > 0 ? totalTimeSpent / completedTasksList.length : 0;
      
      templateAnalytics.push({
        templateId: template._id.toString(),
        templateName: template.name,
        totalTasks,
        completedTasks,
        averageTime,
        acceptedTasks,
        rejectedTasks
      });
    }

    return JSON.stringify(templateAnalytics);
  } catch (error) {
    console.error('Error getting template analytics:', error);
    throw error;
  }
}

// Get daily activity metrics
export async function getDailyActivityMetrics(days: number = 30) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || !currentUser.team_id) {
      return JSON.stringify({
        error: 'User does not belong to a team'
      });
    }

    // Get all team members
    const teamMembers = await User.find({
      team_id: currentUser.team_id
    }).select('_id').lean<{ _id: ObjectId }[]>();
    
    const teamMemberIds = teamMembers.map(member => member._id);

    // Calculate the date for N days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get tasks that were updated within the time period
    const tasks = await Task.find({
      updated_at: { $gte: startDate },
      annotator: { $in: teamMemberIds }
    }).lean<TaskDocument[]>();

    // Group tasks by day
    const dailyData: { [key: string]: DailyActivity } = {};

    for (const task of tasks) {
      const date = new Date(task.updated_at).toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          taskCount: 0,
          uniqueAnnotators: 0,
          averageTime: 0
        };
      }
      
      dailyData[date].taskCount++;
    }

    // Calculate unique annotators and average time for each day
    for (const date in dailyData) {
      const dayTasks = tasks.filter(task => 
        new Date(task.updated_at).toISOString().split('T')[0] === date
      );
      
      const uniqueAnnotators = new Set(
        dayTasks
          .filter(task => task.annotator)
          .map(task => task.annotator?.toString())
      ).size;
      
      const tasksWithTime = dayTasks.filter(task => task.timeTaken);
      const totalTime = tasksWithTime.reduce((sum, task) => sum + (task.timeTaken || 0), 0);
      const avgTime = tasksWithTime.length > 0 ? totalTime / tasksWithTime.length : 0;
      
      dailyData[date].uniqueAnnotators = uniqueAnnotators;
      dailyData[date].averageTime = avgTime;
    }

    // Convert to array and sort by date
    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return JSON.stringify(result);
  } catch (error) {
    console.error('Error getting daily activity metrics:', error);
    throw error;
  }
}

// Get raw annotation data for analysis
export async function getRawAnnotationData(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new Error('Invalid project ID');
    }

    await connectToDatabase();
    
    // Get all completed tasks for the project
    const tasks = await Task.find({ 
      project: projectId,
      submitted: true
    }).lean<TaskDocument[]>();

    // Extract and process annotation content
    const annotations = tasks.map(task => {
      try {
        // Parse the content JSON
        const content = JSON.parse(task.content);
        
        // Return a structured version with task metadata
        return {
          taskId: task._id.toString(),
          annotatorId: task.annotator ? task.annotator.toString() : null,
          templateId: task.template ? task.template.toString() : null,
          status: task.status,
          timeTaken: task.timeTaken,
          content: content,
          submittedAt: task.updated_at
        };
      } catch (error) {
        console.error(`Error parsing content for task ${task._id}:`, error);
        return {
          taskId: task._id.toString(),
          annotatorId: task.annotator ? task.annotator.toString() : null,
          templateId: task.template ? task.template.toString() : null,
          status: task.status,
          timeTaken: task.timeTaken,
          content: null, // Unable to parse
          submittedAt: task.updated_at
        };
      }
    });

    return JSON.stringify(annotations);
  } catch (error) {
    console.error('Error getting raw annotation data:', error);
    throw error;
  }
}

// Get annotation quality metrics
export async function getAnnotationQualityMetrics(projectId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || !currentUser.team_id) {
      return JSON.stringify({
        error: 'User does not belong to a team'
      });
    }

    // Get all team members who are annotators
    const teamAnnotators = await User.find({
      team_id: currentUser.team_id,
      role: 'annotator'
    }).select('_id').lean<{ _id: ObjectId }[]>();
    
    const annotatorIds = teamAnnotators.map(annotator => annotator._id);

    // Prepare filter object based on whether projectId is provided
    let filter: any = {
      annotator: { $in: annotatorIds }
    };

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      filter.project = projectId;
    }

    // Get all annotator history entries
    const annotatorHistories = await AnnotatorHistory.find(filter)
      .populate<{ annotator: TeamMember }>('annotator', 'name email')
      .lean<AnnotatorHistoryDocument[]>();

    // Calculate metrics
    const results = annotatorHistories.map(history => {
      // Calculate accuracy from history
      const totalComparisons = history.history?.length || 0;
      const correctComparisons = history.history?.filter(item => item.comparisonResult).length || 0;
      const accuracy = totalComparisons > 0 ? (correctComparisons / totalComparisons) * 100 : 0;

      return {
        annotatorId: (history.annotator as TeamMember)._id.toString(),
        annotatorName: (history.annotator as TeamMember).name,
        annotatorEmail: (history.annotator as TeamMember).email,
        projectId: history.project.toString(),
        totalPoints: history.totalPoints || 0,
        totalComparisons,
        correctComparisons,
        accuracy,
        historyEntries: history.history?.length || 0
      };
    });

    return JSON.stringify(results);
  } catch (error) {
    console.error('Error getting annotation quality metrics:', error);
    throw error;
  }
}