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
