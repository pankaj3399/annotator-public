import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { InvitedUsers } from '@/models/InvitedUsers'; // Changed from Invitation to InvitedUsers

export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Get the user details to verify they are an agency owner
    const currentUser = await User.findOne({ email: session.user?.email });

    if (!currentUser || currentUser.role !== 'agency owner') {
      return NextResponse.json(
        { error: 'Not authorized to view invited users' },
        { status: 403 }
      );
    }

    // Get URL parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';
    
    // Build the query for invitations
    const query: any = { agencyOwner: currentUser._id };
    
    if (status !== 'all') {
      query.status = status;
    }

    // Get invitations from database
    const invitations = await InvitedUsers.find(query)
      .sort({ created_at: -1 }) // Sort by most recent first
      .populate('acceptedBy', 'name email') // Populate accepted user data if available
      .lean();

    // Format the data for the frontend
    const invitedUsers = invitations.map(invitation => ({
      id: invitation._id,
      email: invitation.email,
      status: invitation.status,
      invitedAt: invitation.created_at,
      // Note: expiresAt doesn't exist in InvitedUsers model, so we're removing it
      acceptedAt: invitation.updated_at !== invitation.created_at && invitation.status === 'accepted' 
        ? invitation.updated_at 
        : null,
      user: invitation.acceptedBy 
        ? {
            id: invitation.acceptedBy._id,
            name: invitation.acceptedBy.name,
            email: invitation.acceptedBy.email,
          } 
        : null,
    }));

    return NextResponse.json({
      success: true,
      invitedUsers,
      counts: {
        pending: invitations.filter(inv => inv.status === 'pending').length,
        accepted: invitations.filter(inv => inv.status === 'accepted').length,
        // Note: 'expired' status doesn't exist in your InvitedUsers model
        // Either add it to your model or remove this count
        total: invitations.length,
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching invited users:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch invited users',
        message: error.message 
      },
      { status: 500 }
    );
  }
}