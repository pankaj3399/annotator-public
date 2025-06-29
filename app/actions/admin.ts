//app/actions/admin.ts
'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Team } from "@/models/Team";
import { getServerSession } from "next-auth";
import { isAdmin } from "@/lib/userRoles";

export interface RegistrationDataPoint {
  date: string;
  count: number;
  teamId: string;
  teamName: string;
}

export interface TeamRegistrationData {
  teamId: string;
  teamName: string;
  daily: RegistrationDataPoint[];
  weekly: RegistrationDataPoint[];
  monthly: RegistrationDataPoint[];
  total: number;
}

export async function getAllExpertsRegistrationData() {
  try {
    // Get the current user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    // Find the current user and verify they are system admin
    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      throw new Error('User not found');
    }

    if (!isAdmin(currentUser.role)) {
      throw new Error('Unauthorized: Only system admins can access this data');
    }

    // Get all teams
    const teams = await Team.find({}).select('_id name');
    const teamMap = new Map(teams.map(team => [team._id.toString(), team.name]));

    // Add "No Team" option
    teamMap.set('no-team', 'No Team');

    // Find all annotators with their registration dates
    const annotators = await User.find({
      role: 'annotator'
    }).select('created_at team_id name email').sort({ created_at: 1 });

    // Helper function to format dates
    const formatDate = (date: Date, period: 'daily' | 'weekly' | 'monthly') => {
      const d = new Date(date);
      switch (period) {
        case 'daily':
          return d.toISOString().split('T')[0]; // YYYY-MM-DD
        case 'weekly':
          const startOfWeek = new Date(d);
          startOfWeek.setDate(d.getDate() - d.getDay());
          return startOfWeek.toISOString().split('T')[0];
        case 'monthly':
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        default:
          return d.toISOString().split('T')[0];
      }
    };

    // Helper function to generate date range
    const generateDateRange = (period: 'daily' | 'weekly' | 'monthly', days: number = 30) => {
      const dates = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        
        switch (period) {
          case 'daily':
            date.setDate(now.getDate() - i);
            dates.push(formatDate(date, 'daily'));
            break;
          case 'weekly':
            date.setDate(now.getDate() - (i * 7));
            dates.push(formatDate(date, 'weekly'));
            break;
          case 'monthly':
            date.setMonth(now.getMonth() - i);
            dates.push(formatDate(date, 'monthly'));
            break;
        }
      }
      
      return [...new Set(dates)].sort();
    };

    // Process data for each team
    const teamRegistrationData: TeamRegistrationData[] = [];

    for (const [teamId, teamName] of teamMap.entries()) {
      // Filter annotators for this team
      const teamAnnotators = annotators.filter(annotator => {
        if (teamId === 'no-team') {
          return !annotator.team_id;
        }
        return annotator.team_id?.toString() === teamId;
      });

      // Generate data for different time periods
      const dailyDates = generateDateRange('daily', 30);
      const weeklyDates = generateDateRange('weekly', 12);
      const monthlyDates = generateDateRange('monthly', 12);

      // Group annotators by registration date
      const dailyGroups = new Map<string, number>();
      const weeklyGroups = new Map<string, number>();
      const monthlyGroups = new Map<string, number>();

      teamAnnotators.forEach(annotator => {
        const createdAt = new Date(annotator.created_at);
        
        const dailyKey = formatDate(createdAt, 'daily');
        const weeklyKey = formatDate(createdAt, 'weekly');
        const monthlyKey = formatDate(createdAt, 'monthly');

        dailyGroups.set(dailyKey, (dailyGroups.get(dailyKey) || 0) + 1);
        weeklyGroups.set(weeklyKey, (weeklyGroups.get(weeklyKey) || 0) + 1);
        monthlyGroups.set(monthlyKey, (monthlyGroups.get(monthlyKey) || 0) + 1);
      });

      // Create data points with all dates (including zeros)
      const dailyData = dailyDates.map(date => ({
        date,
        count: dailyGroups.get(date) || 0,
        teamId,
        teamName
      }));

      const weeklyData = weeklyDates.map(date => ({
        date,
        count: weeklyGroups.get(date) || 0,
        teamId,
        teamName
      }));

      const monthlyData = monthlyDates.map(date => ({
        date,
        count: monthlyGroups.get(date) || 0,
        teamId,
        teamName
      }));

      teamRegistrationData.push({
        teamId,
        teamName,
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
        total: teamAnnotators.length
      });
    }

    return JSON.stringify({
      teams: teamRegistrationData,
      totalExperts: annotators.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting experts registration data:', error);
    throw error;
  }
}

export async function getAllTeams() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      throw new Error('You must be logged in');
    }

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser || !isAdmin(currentUser.role)) {
      throw new Error('Unauthorized: Only system admins can access this data');
    }

    const teams = await Team.find({}).select('_id name description members created_at');
    
    return JSON.stringify({
      teams: teams,
      totalTeams: teams.length
    });

  } catch (error) {
    console.error('Error getting teams:', error);
    throw error;
  }
}