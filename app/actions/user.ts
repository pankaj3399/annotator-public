// app/actions/user.ts
'use server'

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Team } from "@/models/Team";
import { revalidatePath } from "next/cache";

export async function updateUserTeam(userId: string, teamId: string) {
  console.log("updateUserTeam action called:", { userId, teamId });
  
  try {
    await connectToDatabase();
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      console.error("User not found:", userId);
      return { success: false, error: "User not found" };
    }
    
    console.log("Found user:", user.email);
    
    // Update the user with team ID
    user.team_id = teamId;
    await user.save();
    
    console.log("Updated user with team ID:", teamId);
    
    // Add user to team members
    const team = await Team.findById(teamId);
    
    if (!team) {
      console.error("Team not found:", teamId);
      return { success: true, user: user, teamFound: false };
    }
    
    console.log("Found team:", team.name);
    
    // Add user to team members if not already a member
    if (!team.members.includes(user._id)) {
      team.members.push(user._id);
      await team.save();
      console.log("Added user to team members");
    } else {
      console.log("User already in team members");
    }
    
    // Revalidate dashboard path
    revalidatePath('/dashboard');
    
    return { 
      success: true, 
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        team_id: user.team_id?.toString()
      },
      team: {
        id: team._id.toString(),
        name: team.name
      }
    };
  } catch (error) {
    console.error("Error updating user team:", error);
    return { success: false, error: "Failed to update user team" };
  }
}