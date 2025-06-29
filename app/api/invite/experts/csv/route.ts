import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { InvitedUsers } from '@/models/InvitedUsers';
import { Team } from '@/models/Team';
import Papa from 'papaparse';
import { sendEmail, getInvitationEmailTemplate } from '@/lib/email';
import { isAdmin, isProjectManager } from '@/lib/userRoles';

// Define helper function to read and process the uploaded file
async function readCSVFile(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  
  // Parse CSV using PapaParse
  const parseResult = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    // Papa.parse types don't allow trimHeaders and transform together
    // so we'll handle trimming manually
    transformHeader: (header) => header.trim()
  });
  
  // Extract emails from records
  const emails: string[] = [];
  for (const record of parseResult.data) {
    if (record.email) {
      emails.push(record.email);
    }
    // Try other common column names if 'email' is not found
    else if (record.Email || record.EMAIL) {
      emails.push(record.Email || record.EMAIL);
    }
  }
  
  return emails.filter(email => email && email.includes('@'));
}

export async function POST(req: Request) {
  try {
    // Check authentication and authorization
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

    if (!currentUser || !isAdmin(currentUser.role) && !isProjectManager(currentUser.role)) {
      return NextResponse.json(
        { error: 'Not authorized to invite experts' },
        { status: 403 }
      );
    }

    // Process the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const agencyOwnerName = formData.get('agencyOwnerName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Get the agency owner's team
    const ownerTeams = await Team.find({ members: currentUser._id });
    let teamInfo = '';
    let teamId = '';
    
    // Get first team ID or empty string if none exists
    if (ownerTeams && ownerTeams.length > 0) {
      teamId = ownerTeams[0]._id.toString();
      
      if (ownerTeams.length === 1) {
        teamInfo = `<p><strong>${agencyOwnerName}</strong> would like you to join their team "${ownerTeams[0].name}".</p>`;
      } else {
        // Multiple teams - still use the first one for the signup link
        teamInfo = `<p><strong>${agencyOwnerName}</strong> would like you to join their team "${ownerTeams[0].name}".</p>`;
      }
    } else {
      teamInfo = `<p><strong>${agencyOwnerName}</strong> would like you to join their team when you sign up.</p>`;
    }

    // Get base URL from environment or default
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000/';
    
    // Create signup URL with pre-filled parameters
    const signupUrl = `${baseUrl}auth/signup?role=annotator&team=${teamId}`;

    // Process CSV file
    const emails = await readCSVFile(file);

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found in the CSV file' },
        { status: 400 }
      );
    }

    // Arrays to track different user types
    const existingUsersArray: string[] = [];
    const alreadyInvitedUsersArray: string[] = [];

    // Send invitation emails
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          // Add to existingUsers array for client-side notification
          existingUsersArray.push(email);
          return { email, status: 'existing_user', userId: existingUser._id.toString() };
        }

        // Check if invitation already exists (regardless of status)
        const existingInvitation = await InvitedUsers.findOne({ 
          email, 
          agencyOwner: currentUser._id
        });

        if (existingInvitation) {
          // Add to already invited array for client-side notification
          alreadyInvitedUsersArray.push(email);
          return { email, status: 'already_invited', invitationId: existingInvitation._id.toString(), invitationStatus: existingInvitation.status };
        }

        // Create new invitation record
        const invitation = new InvitedUsers({
          email,
          agencyOwner: currentUser._id,
          status: "pending"
        });
        
        await invitation.save();

        // Send invitation email using our utility
        const emailResult = await sendEmail({
          to: email,
          subject: 'Join BloLabel as a Domain Expert',
          html: getInvitationEmailTemplate(signupUrl, teamInfo, agencyOwnerName)
        });

        return { 
          email, 
          status: 'sent', 
          invitationId: invitation._id.toString(),
          emailSent: emailResult.success
        };
      })
    );

    // Count success and failures
    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'sent').length;
    const alreadyInvited = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'already_invited').length;
    const existingUsersCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'existing_user').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent,
      alreadyInvited,
      existingUsers: existingUsersArray,
      alreadyInvitedUsers: alreadyInvitedUsersArray,
      existingUsersCount,
      failed,
      total: emails.length,
      details: results.map(r => {
        if (r.status === 'fulfilled') {
          return r.value;
        } else {
          return {
            status: 'rejection',
            reason: (r.reason as Error)?.message || 'Unknown error',
            stack: (r.reason as Error)?.stack
          };
        }
      })
    });
    
  } catch (error: any) {
    console.error('Error processing CSV and sending invitations:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process CSV and send invitations',
        message: error.message 
      },
      { status: 500 }
    );
  }
}