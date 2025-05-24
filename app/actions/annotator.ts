'use server'

import { authOptions } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";

export async function getAllAnnotators() {
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
        
        // Find all annotators with the same team_id
        const teamAnnotators = await User.find({
            role: 'annotator',
            team_id: currentUser.team_id
        }).select('-password');
        
        return JSON.stringify(teamAnnotators);
    } catch (error) {
        console.error('Error getting team annotators:', error);
        throw error;
    }
}

export async function getAnnotatorById(annotatorId: string) {
  try {
    // Get the current user from session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return { error: 'You must be logged in' };
    }

    // Find the current user to verify access rights
    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });
    
    if (!currentUser) {
      return { error: 'User not found' };
    }
    
    // Find the annotator by ID
    const annotator = await User.findById(annotatorId)
      .select('name email role domain lang location stripeAccountId stripeAccountStatus');
    
    if (!annotator) {
      return { error: 'Annotator not found' };
    }
    
    // Verify they are an annotator
    if (annotator.role !== 'annotator') {
      return { error: 'User is not an annotator' };
    }
    
    // Verify the annotator is in the same team (optional team-based security)
    if (currentUser.team_id && annotator.team_id && 
        currentUser.team_id.toString() !== annotator.team_id.toString()) {
      return { error: 'Unauthorized access to annotator' };
    }
    
    return { data: JSON.stringify(annotator) };
  } catch (error) {
    console.error('Error getting annotator by ID:', error);
    return { error: 'Failed to fetch annotator details' };
  }
}