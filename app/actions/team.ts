"use server"
import { connectToDatabase } from '@/lib/db';
import { Team } from '@/models/Team';
import { revalidatePath } from 'next/cache';

// Type for team data
interface TeamData {
  name: string;
  description?: string;
  members?: string[];
  createdBy: string;
}

// Action to fetch all teams
export async function getTeams() {
  try {
    await connectToDatabase();
    const teams = await Team.find({}).populate('createdBy', 'name email');
    return JSON.parse(JSON.stringify(teams));
  } catch (error) {
    console.error("Error fetching teams:", error);
    throw new Error('Error fetching teams');
  }
}

// Action to create a new team
export async function createTeam(teamData: TeamData) {
  try {
    await connectToDatabase();
    const newTeam = await Team.create(teamData);
    revalidatePath('/admin/teams');
    return JSON.parse(JSON.stringify(newTeam));
  } catch (error) {
    console.error("Error creating team:", error);
    throw new Error('Error creating team');
  }
}