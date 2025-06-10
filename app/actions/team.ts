"use server"
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User'; // Import User model first
import { Team } from '@/models/Team';
import { revalidatePath, revalidateTag } from 'next/cache';

// Type for team data
interface TeamData {
  name: string;
  description?: string;
  logo?: string;
  members?: string[];
  createdBy: string;
}

// Action to fetch all teams
export async function getTeams() {
  try {
    revalidateTag('teams');

    await connectToDatabase();
    const teams = await Team.find({})
      .populate({
        path: 'createdBy',
        model: User,  // Explicitly provide the model
        select: 'name email'
      });
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
    revalidateTag('teams');
    return JSON.parse(JSON.stringify(newTeam));
  } catch (error) {
    console.error("Error creating team:", error);
    throw new Error('Error creating team');
  }
}

// Action to update team logo
export async function updateTeamLogo(teamId: string, logoUrl: string) {
  try {
    console.log('updateTeamLogo called with:', { teamId, logoUrl });

    await connectToDatabase();
    console.log('Database connected');

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { logo: logoUrl },
      { new: true }
    ).populate({
      path: 'createdBy',
      model: User,
      select: 'name email'
    });

    console.log('Team updated in database:', updatedTeam);

    if (!updatedTeam) {
      throw new Error('Team not found');
    }

    revalidatePath('/admin/teams');
    revalidateTag('teams');

    const result = JSON.parse(JSON.stringify(updatedTeam));
    console.log('Returning updated team:', result);

    return result;
  } catch (error) {
    console.error("Error updating team logo:", error);
    throw new Error(`Error updating team logo`);
  }
}